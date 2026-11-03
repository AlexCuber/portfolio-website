/**
 * The Cucumber Invasion leaderboard: the all-time top 10, kept in KV (the LEADERBOARD binding in wrangler.jsonc).
 *
 *   GET  /api/leaderboard         -> { top: [{ name, score, level, at }] }
 *   POST /api/leaderboard/start   -> { token }   a signed "this run started at ..." ticket, fetched when a game starts
 *   POST /api/leaderboard         { token, name, score, level } -> { ok, rank, top }   (rank is null if not in the top 10)
 *
 * The game runs in the visitor's browser, so a determined cheater can't be stopped completely. These checks keep out
 * casual cheating and spam: the score has to be reachable at the level reached, enough real time must have passed
 * since the run started, each run can be submitted only once, a visitor can submit a few times an hour, and names
 * are cleaned up (no links, no control characters, 18 characters at most, "anonymous" if empty).
 * Starting a run writes nothing to KV (the ticket is signed, not stored), so idle plays cost nothing.
 */

const BOARD_KEY = "lb:top";
const SIZE = 10;
const NAME_MAX = 18;
const PER_HOUR = 6;
const RUN_MAX_MS = 6 * 3600 * 1000;
/* must match the game (games/src/cucumber_invasion/settings.py and main.py): 7 x 3 cucumbers per fleet, each worth
   50 x level² points, and 3 spare cats */
const FLEET = 21, POINTS = 50, LIVES = 3;
const pointsAt = level => POINTS * level * level;
/* the best possible game: every fleet before the level it ended on, plus, on that level, four fleets that each lost
   all but one cucumber (losing a cat brings in a fresh fleet on the same level; clearing one would start the next) */
const maxScore = level => FLEET * POINTS * ((level - 1) * level * (2 * level - 1)) / 6 + (LIVES + 1) * (FLEET - 1) * pointsAt(level);
/* every level after the first starts with the game's 1.2 second "Level N!" pause, and clearing a fleet takes a moment */
const minRunMs = level => (level - 1) * 1500;
const LINKY = /https?:|www\.|\.(com|net|org|io|ru|xyz|info|biz|site|online|top|shop)\b/i;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const fail = (error, status = 400) => json({ ok: false, error }, status);

export async function leaderboard(request, env, pathname) {
  const kv = env.LEADERBOARD;
  if (!kv) return fail("The leaderboard isn't set up yet.", 503);
  if (request.method === "GET" && pathname === "/api/leaderboard") return json({ top: await readBoard(kv) });
  if (request.method !== "POST") return fail("Method not allowed.", 405);

  /* only accept posts from this site's own pages */
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return fail("Not allowed.", 403);

  if (pathname === "/api/leaderboard/start") {
    const started = Date.now(), nonce = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
    const sig = await sign(env, `${started}.${nonce}`);
    return sig ? json({ token: `${started}.${nonce}.${sig}` }) : fail("The leaderboard isn't set up yet.", 503);
  }
  if (pathname !== "/api/leaderboard") return fail("Not found.", 404);
  return submit(request, env, kv);
}

async function submit(request, env, kv) {
  if (+(request.headers.get("content-length") || 0) > 2000) return fail("That's too much data.", 413);
  let data;
  try { data = await request.json(); } catch { return fail("Something went wrong. Please try again."); }

  /* the run ticket: signed by us, not too old, not used before */
  const [startedText, nonce, sig] = String(data.token || "").split(".");
  const started = +startedText;
  if (!nonce || !sig || sig !== (await sign(env, `${startedText}.${nonce}`))) return fail("This game can't be submitted. Please play a new one.", 403);
  const elapsed = Date.now() - started;
  if (!(elapsed >= 0 && elapsed < RUN_MAX_MS)) return fail("This game is too old to submit. Please play a new one.", 403);

  const score = data.score, level = data.level;
  if (!Number.isInteger(level) || level < 1 || level > 1000 || !Number.isInteger(score) || score < 0 || score % 10) return fail("That score doesn't look right.");
  if (score > maxScore(level) || elapsed < minRunMs(level)) return fail("That score doesn't look right.");

  const raw = String(data.name ?? "");
  if (LINKY.test(raw)) return fail("Please use a name without links.");
  const name = cleanName(raw);

  /* a few submissions per visitor per hour */
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (ip) {
    const key = `lb:rl:${ip}:${new Date().toISOString().slice(0, 13)}`;
    const count = +(await kv.get(key)) || 0;
    if (count >= PER_HOUR) return fail("You've submitted a few scores already. Please try again in an hour.", 429);
    await kv.put(key, String(count + 1), { expirationTtl: 3700 });
  }
  const usedKey = `lb:used:${sig}`;
  if (await kv.get(usedKey)) return fail("This game is already on the board.", 409);
  await kv.put(usedKey, "1", { expirationTtl: Math.ceil(RUN_MAX_MS / 1000) + 60 });

  /* insert, keep the best ten (ties: the earlier score stays ahead) */
  const top = await readBoard(kv);
  const entry = { name, score, level, at: new Date().toISOString() };
  const qualifies = top.length < SIZE || score > top[top.length - 1].score;
  let rank = null;
  if (qualifies && score > 0) {
    top.push(entry);
    top.sort((a, b) => b.score - a.score || a.at.localeCompare(b.at));
    top.length = Math.min(top.length, SIZE);
    rank = top.indexOf(entry) + 1 || null;
    await kv.put(BOARD_KEY, JSON.stringify(top));
  }
  return json({ ok: true, rank, top });
}

async function readBoard(kv) {
  try { const top = JSON.parse((await kv.get(BOARD_KEY)) || "[]"); return Array.isArray(top) ? top : []; } catch { return []; }
}

function cleanName(raw) {
  /* letters from any language are fine; control characters, angle brackets and runs of spaces are not */
  const n = raw.normalize("NFKC").replace(/[\p{C}<>]/gu, "").replace(/\s+/g, " ").trim();
  return [...n].slice(0, NAME_MAX).join("").trim() || "anonymous";
}

/* HMAC-SHA-256 of the ticket, keyed with LEADERBOARD_SECRET (or, if that isn't set, the Turnstile secret, which is
   already there) */
async function sign(env, text) {
  const secret = env.LEADERBOARD_SECRET || env.TURNSTILE_SECRET_KEY;
  if (!secret) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(`leaderboard:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
  return [...mac].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
