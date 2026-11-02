/**
 * The site's Cloudflare Worker (configured in wrangler.jsonc). Every page and file is served from the static assets;
 * this script only answers /api/contact, the contact form endpoint:
 *
 *   GET  -> { siteKey }  the public Turnstile key, so the page needs no hard-coded keys
 *   POST -> checks the message and emails it to you through Resend; your address never reaches the browser
 *
 * Secrets (Cloudflare dashboard -> Workers & Pages -> this Worker -> Settings -> Variables and Secrets, type "Secret"):
 *   TURNSTILE_SITE_KEY    public key of your Turnstile widget
 *   TURNSTILE_SECRET_KEY  secret key of your Turnstile widget
 *   RESEND_API_KEY        API key from resend.com
 *   CONTACT_TO            the inbox that receives the messages
 *   CONTACT_FROM          sender on your verified domain, e.g. "Website <contact@example.com>"
 * Optional:
 *   RATE_LIMIT            KV namespace binding (see wrangler.jsonc): limits each visitor to 3 messages an hour
 *   CONTACT_DRY_RUN = "1" log the email instead of sending it (local testing, in .dev.vars)
 *
 * Spam protection, in order: same-site check, honeypot field, "filled in too fast" check, field validation,
 * Turnstile, rate limit, and a DNS check that the sender's email domain can receive mail.
 * Bot submissions that trip the honeypot or the speed check get a fake "sent" so they learn nothing.
 */

const MAX_PER_HOUR = 3;
const MIN_FILL_MS = 3000;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const fail = (error, status = 400) => json({ ok: false, error }, status);

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/contact") {
      if (request.method === "GET") return json({ siteKey: env.TURNSTILE_SITE_KEY || null });
      if (request.method === "POST") return contact(request, env);
      return fail("Method not allowed.", 405);
    }
    return env.ASSETS.fetch(request);   /* anything else: the static site (its 404 if the file doesn't exist) */
  }
};

async function contact(request, env) {
  /* only accept posts from this site's own pages */
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return fail("Not allowed.", 403);
  if (+(request.headers.get("content-length") || 0) > 20000) return fail("That message is too long.", 413);

  let data;
  try { data = await request.json(); } catch { return fail("Something went wrong with the form. Please try again."); }
  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim();
  const message = String(data.message || "").trim();

  /* bots: a filled-in hidden field, or a form completed faster than a person can type */
  if (data.website) return json({ ok: true });
  if (!Number.isFinite(+data.started) || Date.now() - +data.started < MIN_FILL_MS) return json({ ok: true });

  if (!name || name.length > 80 || /[\r\n]/.test(name)) return fail("Please add your name (up to 80 characters).");
  if (email.length > 254 || /[\r\n]/.test(email) || !/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(email)) {
    return fail("Please enter a valid email address, so I can reply.");
  }
  if (message.length < 10) return fail("Your message is a little short. Tell me a bit more?");
  if (message.length > 5000) return fail("Please keep the message under 5,000 characters.");
  if ((message.match(/https?:\/\/|www\./gi) || []).length > 3) return fail("Please keep links to a minimum.");

  const ip = request.headers.get("cf-connecting-ip") || "";

  /* Turnstile: proves a real browser (and usually a real person) filled in the form */
  if (!env.TURNSTILE_SECRET_KEY) return fail("The form isn't set up yet.", 500);
  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: String(data.token || ""), remoteip: ip })
  }).then(r => r.json()).catch(() => ({ success: false }));
  if (!check.success) return fail("The anti-spam check didn't pass. Please try it again.", 403);

  if (env.RATE_LIMIT && ip) {
    const key = `contact:${ip}:${new Date().toISOString().slice(0, 13)}`;   /* one bucket per IP per hour */
    const count = +(await env.RATE_LIMIT.get(key)) || 0;
    if (count >= MAX_PER_HOUR) return fail("You've sent a few messages already. Please try again in an hour.", 429);
    await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 3700 });
  }

  if (!(await domainTakesMail(email.split("@").pop()))) {
    return fail("That email address doesn't seem able to receive replies. Could you double-check it?");
  }

  const when = new Date().toUTCString();
  const text = [
    `New message from your website`,
    ``,
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Sent:    ${when}`,
    `From:    ${request.cf?.country || "unknown country"}`,
    ``,
    message,
    ``,
    `--`,
    `Just press Reply to answer ${name}.`
  ].join("\n");

  if (env.CONTACT_DRY_RUN === "1") {
    console.log(`[dry run] would email ${env.CONTACT_TO || "(CONTACT_TO not set)"}:\n${text}`);
    return json({ ok: true, dryRun: true });
  }
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return fail("The form isn't set up yet.", 500);

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `Website message from ${name}`,
      text
    })
  }).catch(() => null);
  if (!sent || !sent.ok) {
    console.log("Resend error", sent && sent.status, sent && (await sent.text()));
    return fail("The message couldn't be sent right now. Please try again in a little while.", 502);
  }
  return json({ ok: true });
}

/* The sender's domain must have a mail server (MX record) or, as mail standards allow, at least an address (A record).
   Uses Cloudflare's DNS-over-HTTPS; if that lookup itself fails, the message is let through rather than lost. */
async function domainTakesMail(domain) {
  for (const [type, code] of [["MX", 15], ["A", 1]]) {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, { headers: { accept: "application/dns-json" } });
      if (!r.ok) return true;
      const d = await r.json();
      if (d.Status === 0 && (d.Answer || []).some(a => a.type === code)) return true;
    } catch { return true; }
  }
  return false;
}
