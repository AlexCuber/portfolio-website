(function () {
  'use strict';
  var PLAN = window.PLAN_DATA, LIB = LIBRARY.build(PLAN), GROUPS = LIBRARY.GROUPS;
  var BUILTIN = ['upperA', 'lowerA', 'upperB', 'lowerB', 'day5'], CORE = ['upperA', 'lowerA', 'upperB', 'lowerB'];
  var WEEKDAY = { 1: 'upperA', 2: 'lowerA', 4: 'upperB', 5: 'lowerB', 6: 'day5' };
  var STANDALONE = !!window.WL_STANDALONE; /* true in the home-screen build, where there is no Claude sync */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= helpers ================= */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return iso(new Date()); }
  function toDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(s, short) { var d = toDate(s); return (short ? '' : DAYS[d.getDay()] + ' ') + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function weekStart(s) { var d = toDate(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); }
  function addDays(s, n) { var d = toDate(s); d.setDate(d.getDate() + n); return iso(d); }
  function num(v) { if (v == null) return null; var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; }
  function fmt(x) { return String(Math.round(x * 100) / 100); }
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function fmtClock(sec) { sec = Math.max(0, Math.floor(sec)); var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s); }
  function fmtDur(sec) { var m = Math.round(sec / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + pad(m % 60) + ' min'; }
  function shortNum(n) { n = Math.round(n); return n >= 1e5 && n < 999500 ? Math.round(n / 1000) + 'K' : compact(n); }
  function compact(n) { n = Math.round(n); if (n < 10000) return n.toLocaleString('en-GB'); if (n < 1e6) return (Math.round(n / 100) / 10) + 'K'; return (Math.round(n / 1e5) / 10) + 'M'; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  /* ================= state and storage ================= */
  var LS = 'workout-log-v1';
  var PALETTES = [['', 'Default', '#008a9c, #2fb5a0 45%, #b6ff1a'], ['graphite', 'Graphite', '#111310, #5c6255 55%, #c5cabd'], ['violet', 'Violet', '#4a30c4, #8a72f8 55%, #5aa2ff'], ['lime', 'Lime', '#2f5204, #5f9612 50%, #b6ff1a'], ['blossom', 'Blossom', '#d6336c, #ff8ab8 50%, #b596ff']];
  var DEF_SET = { theme: 'auto', palette: '', sound: true, autoRest: true, awake: true, weeklyGoal: 4, goalWeight: null, goalRate: 0.25, unit: 'kg', rir: false, setupDone: false };
  var DEF_UI = { tab: 'log', ex: null, lib: 'all', prog: 'overview', measure: 'weight', musWin: 'week', lib3: 'history' };
  var state = { sessions: {}, body: {}, routines: {}, custom: {}, settings: Object.assign({}, DEF_SET), settingsAt: 0, draft: null, draftAt: 0, dirty: {}, ui: Object.assign({}, DEF_UI) };
  var draftWait = false, justWrote = {}, db = null, syncState = 'local', busy = {}, again = {}, draftTimer = null;
  var rest = { until: 0, total: 0, beeped: true }, armed = null, editor = null, picker = null, summary = null, toastTimer = null;
  /* loadFail holds the stored text when a log is there but cannot be read. While it is set nothing is written,
     so a log that failed to open is never replaced by an empty one. saveFail is true while saving does not work. */
  var RESCUE = 'hitit-rescue-v1', loadFail = null, saveFail = false;
  try {
    var rawText = localStorage.getItem(LS), raw = null, readable = true;
    if (rawText) { try { raw = JSON.parse(rawText); } catch (e) { readable = false; } }
    if (readable && raw && typeof raw === 'object' && raw.sessions && typeof raw.sessions === 'object') {
      state = Object.assign(state, raw);
      state.ui = Object.assign({}, DEF_UI, raw.ui || {});
      state.settings = Object.assign({}, DEF_SET, raw.settings || {});
      state.routines = raw.routines || {}; state.custom = raw.custom || {};
    } else if (rawText && (!readable || (raw && (typeof raw !== 'object' || Object.keys(raw).length)))) loadFail = rawText;
  } catch (e) {}
  function saveLocal() {
    if (loadFail != null) return false;
    try { localStorage.setItem(LS, JSON.stringify(state)); if (saveFail) { saveFail = false; saveWarn(); } return true; }
    catch (e) { if (!saveFail) { saveFail = true; saveWarn(); } return false; }
  }
  /* ---- a safety net inside the phone (N2). The bin keeps deleted workouts, and a discarded workout that had sets, for
     30 days; it lives with the log but is not part of a backup. The weekly copy is a second, older copy of the log under
     its own key, for the day the log itself cannot be read. ---- */
  var COPY = 'hitit-copy-v1', BIN_DAYS = 30;
  function binList() {
    var cut = Date.now() - BIN_DAYS * 864e5, b = (state.bin || []).filter(function (x) { return x && x.at > cut; });
    if (b.length !== (state.bin || []).length) state.bin = b;
    return b;
  }
  function binAdd(o) { o.at = Date.now(); state.bin = binList().filter(function (x) { return !(o.doc && x.doc && x.doc.id === o.doc.id) && !(o.draft && x.draft); }); state.bin.push(o); return o; }
  function binTake(o) { state.bin = binList().filter(function (x) { return x !== o; }); }
  function copyInfo() { try { var c = JSON.parse(localStorage.getItem(COPY)); return c && c.at && c.data && c.data.sessions ? c : null; } catch (e) { return null; } }
  /* once a week, when the log opened fine. A copy with many more workouts than the log has now is left alone:
     it may be the only place they still are. */
  function weeklyCopy() {
    if (loadFail != null) return;
    var n = Object.keys(state.sessions).length; if (!n) return;
    var c = copyInfo(); if (c && Date.now() - c.at < 7 * 864e5) return;
    if (c && c.n >= 4 && n < c.n / 2) return;
    try { localStorage.setItem(COPY, JSON.stringify({ at: Date.now(), n: n, data: { app: 'workout-log', v: 2, sessions: state.sessions, body: state.body, routines: state.routines, custom: state.custom, settings: state.settings } })); } catch (e) {}
  }
  function saveWarn() { var el = document.getElementById('savewarn'); if (el) el.hidden = !saveFail; document.body.classList.toggle('save-fail', saveFail); }
  /* puts the unreadable text aside under its own key, then lets saving start again */
  function keepRescue() {
    if (loadFail == null) return;
    try { localStorage.setItem(RESCUE, loadFail); } catch (e) { try { localStorage.removeItem(LS); localStorage.setItem(RESCUE, loadFail); } catch (e2) {} }
    lostText = loadFail; loadFail = null;
  }
  var lostText = null;
  function setSync(s) {
    syncState = s;
    var el = document.getElementById('sync'); if (!el) return;
    el.dataset.s = s; el.hidden = STANDALONE; /* the home-screen app says where the log lives in settings instead */
    document.getElementById('sync-t').textContent = { local: STANDALONE ? 'Saved on this phone' : 'On this device only', syncing: 'Saving…', synced: 'Synced', pending: 'Sync pending' }[s];
  }
  function refreshSync() {
    if (!db) return setSync(!STANDALONE && Object.keys(state.dirty).length ? 'pending' : 'local');
    if (Object.keys(busy).length || draftWait) return setSync('syncing');
    setSync(Object.keys(state.dirty).length ? 'pending' : 'synced');
  }
  function docBody(path) {
    var p = path.split('/');
    if (p[0] === 'sessions') return state.sessions[p[1]] || null;
    if (p[0] === 'body') return state.body[p[1]] || null;
    if (p[0] === 'routines') return state.routines[p[1]] || null;
    if (p[0] === 'exercises') return state.custom[p[1]] || null;
    if (path === 'state/draft') return { draft: state.draft, updatedAt: state.draftAt };
    if (path === 'state/settings') return { settings: state.settings, updatedAt: state.settingsAt };
    return null;
  }
  function mark(path) { if (STANDALONE) { saveLocal(); return; } state.dirty[path] = 1; saveLocal(); pump(path); }
  function pump(path, retried) {
    if (!db) { refreshSync(); return; }
    if (busy[path]) { again[path] = 1; return; }
    var body = docBody(path), ref;
    try { ref = db.doc(path); } catch (e) { delete state.dirty[path]; return; }
    busy[path] = 1; refreshSync();
    var op = body ? ref.set(clone(body)) : ref.delete();
    op.then(function () {
      delete busy[path];
      if (again[path]) { delete again[path]; pump(path); return; }
      delete state.dirty[path]; justWrote[path] = Date.now(); saveLocal(); refreshSync();
    }, function (err) {
      delete busy[path];
      if (again[path]) { delete again[path]; pump(path); return; }
      if (err && err.code === 'unavailable' && !retried) { setTimeout(function () { pump(path, true); }, 900 + Math.random() * 900); }
      refreshSync();
    });
  }
  function flushDirty() { Object.keys(state.dirty).forEach(function (p) { pump(p); }); }
  function pullRemote() {
    if (!db) return;
    var timer;
    var all = Promise.all([db.collection('sessions').limit(1000).get(), db.collection('body').limit(1000).get(), db.doc('state/draft').get(),
      db.collection('routines').limit(200).get(), db.collection('exercises').limit(500).get(), db.doc('state/settings').get()]);
    var timeout = new Promise(function (res) { timer = setTimeout(function () { res(null); }, 10000); });
    Promise.race([all, timeout]).then(function (r) {
      clearTimeout(timer);
      if (!r) { refreshSync(); settle(); return; }
      var maps = [{}, {}, {}, {}];
      [r[0], r[1], r[3], r[4]].forEach(function (snap, i) { snap.docs.forEach(function (d) { maps[i][d.id] = clone(d.data()); }); });
      mergeMap(state.sessions, maps[0], 'sessions/'); mergeMap(state.body, maps[1], 'body/');
      mergeMap(state.routines, maps[2], 'routines/'); mergeMap(state.custom, maps[3], 'exercises/');
      CAT = null;
      if (r[2].exists && !state.dirty['state/draft']) {
        var rd = r[2].data();
        if ((rd.updatedAt || 0) > (state.draftAt || 0) && !isTyping()) { state.draft = rd.draft ? migrateDraft(clone(rd.draft)) : null; state.draftAt = rd.updatedAt; freshenDraft(); }
      }
      if (r[5].exists && !state.dirty['state/settings']) {
        var rs = r[5].data();
        if ((rs.updatedAt || 0) > (state.settingsAt || 0)) { state.settings = Object.assign({}, DEF_SET, rs.settings || {}); state.settingsAt = rs.updatedAt; applyTheme(); }
      }
      keepRescue(); saveLocal(); flushDirty(); refreshSync(); syncSettled = true; weeklyCopy();
      if (!isTyping() && !editor && !picker) render();
    }, function () { refreshSync(); settle(); });
  }
  function mergeMap(local, remote, prefix) {
    Object.keys(remote).forEach(function (id) { if (!state.dirty[prefix + id]) local[id] = remote[id]; });
    Object.keys(local).forEach(function (id) { if (!remote[id] && !state.dirty[prefix + id] && !(Date.now() - (justWrote[prefix + id] || 0) < 60000)) delete local[id]; });
  }
  function isTyping() { var a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')); }
  /* the first answer from Claude's storage is in (or there will be none): only now is an empty log known to be empty */
  function settle() { if (syncSettled) return; syncSettled = true; weeklyCopy(); if (!isTyping() && !editor && !picker) render(); }
  function connect(tries) {
    if (STANDALONE) { refreshSync(); return; }
    if (!(window.claude && typeof window.claude.use === 'function')) { refreshSync(); if ((tries || 0) < 5) setTimeout(function () { connect((tries || 0) + 1); }, 700); else settle(); return; }
    window.claude.use('db').then(function (d) { db = d || null; refreshSync(); if (db) pullRemote(); else settle(); }, function () { refreshSync(); settle(); });
  }
  function saveSettings() { state.settingsAt = Date.now(); mark('state/settings'); }

  /* ================= theme ================= */
  /* A workout in progress is either open (the Train tab is the workout and the tabs are hidden) or minimised (a bar above the tabs). */
  function wLive() { var d = state.draft; return !!d && !d.editing; }
  function wOpen() { var d = state.draft; return !!d && (d.editing || !state.ui.wmin); }
  /* Time of day for the outdoor figures' sky. Only an attribute changes; the stylesheet does the rest. */
  function todNow() { var h = new Date().getHours(); return h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'evening' : 'night'; }
  function applyTod() { var r = document.documentElement, v = todNow(); if (r.getAttribute('data-tod') !== v) r.setAttribute('data-tod', v); }
  function applyTheme() {
    applyTod();
    var t = state.settings.theme, root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-app-theme', t); else root.removeAttribute('data-app-theme');
    var p = state.settings.palette;
    if (p && PALETTES.some(function (x) { return x[0] === p; })) root.setAttribute('data-palette', p); else root.removeAttribute('data-palette');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
  }

  /* ================= exercise catalogue ================= */
  var CAT = null;
  function customEx(c) {
    var k = LIBRARY.KIND[c.kind] || LIBRARY.KIND.M, m = {}; if (LIBRARY.GROUP_MUSCLE[c.group]) m[LIBRARY.GROUP_MUSCLE[c.group]] = 1;
    return { id: c.id, name: c.name, equip: c.equip || 'Your own', group: c.group, muscles: m, illo: LIBRARY.GROUP_ILLO[c.group] || 'm-core', log: k.log, unit: LIBRARY.unitOf(k.log),
      sets: k.sets, lo: k.lo, hi: k.hi, restSec: k.restSec, rir: k.rir, cue: c.cue || '', detail: '', why: '', swap: '', custom: true,
      weightHint: k.log === 'bw' ? 'Leave the weight empty for body weight only, or enter the weight you added.' : '' };
  }
  function cat() {
    if (CAT) return CAT;
    CAT = {}; LIB.forEach(function (e) { CAT[e.id] = e; });
    Object.keys(state.custom).forEach(function (id) { CAT[id] = customEx(state.custom[id]); });
    return CAT;
  }
  function exi(id, name) {
    return cat()[id] || { id: id, name: name || 'Exercise', equip: '', group: 'Core', muscles: {}, illo: 'm-core', log: 'wr', unit: 'reps', sets: 3, lo: 8, hi: 12, restSec: 90, rir: '1–2', cue: '', detail: '', why: '', swap: '', weightHint: '', gone: true };
  }
  function allEx() { var c = cat(); return Object.keys(c).map(function (k) { return c[k]; }); }

  /* ================= sessions you can start (routines) ================= */
  function builtin(key) {
    var s = PLAN.sessions[key];
    return { id: key, name: s.name, focus: s.focus, core: s.core, warmup: s.warmupMin ? s.warmup : '', builtin: true, stats: s.stats,
      items: s.exercises.map(function (e) { return { ex: e.id, n: e.n, group: e.group || '', sets: e.sets, lo: e.lo, hi: e.hi, reps: e.reps, rir: e.rir, rest: e.rest, restSec: e.restSec, cue: e.cue, why: e.why, swap: e.swap, detail: e.detail }; }) };
  }
  /* a session by id, whether or not it is in the plan right now */
  function anyRoutine(id) {
    if (id && String(id).indexOf('out-') === 0) { var fixed = outRoutine(id); if (fixed) return fixed; }
    var o = state.routines[id];
    if (o && o.items) return o;
    if (!PLAN.sessions[id]) return null;
    var b = builtin(id); if (o && o.hidden) b.hidden = true; return b;
  }
  function getRoutine(id) { var r = anyRoutine(id); return r && !r.hidden ? r : null; }
  /* every session in the order of the plan; anything the saved order does not mention goes last */
  function allRoutines() {
    var out = [], ord = state.settings.planOrder || [];
    BUILTIN.forEach(function (k) { var r = anyRoutine(k); if (r) out.push(r); });
    Object.keys(state.routines).map(function (k) { return state.routines[k]; }).filter(function (r) { return r.items && BUILTIN.indexOf(r.id) < 0; })
      .sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); }).forEach(function (r) { out.push(r); });
    return out.map(function (r, i) { var q = ord.indexOf(r.id); return [q < 0 ? 1e6 + i : q, r]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
  }
  function routineList() { return allRoutines().filter(function (r) { return !r.hidden; }); }
  function offList() { return allRoutines().filter(function (r) { return r.hidden; }); }
  function planIds() { return routineList().map(function (r) { return r.id; }); }
  function setPlanOrder(ids) { state.settings.planOrder = ids; saveSettings(); }
  function planMove(id, d) {
    var ids = planIds(), i = ids.indexOf(id), j = i + d;
    if (i < 0 || j < 0 || j >= ids.length) return;
    ids[i] = ids[j]; ids[j] = id; setPlanOrder(ids);
  }
  /* out of the plan, but kept so it can come back */
  function planRemove(id) {
    var o = state.routines[id];
    if (o && o.items) { o.hidden = true; o.updatedAt = Date.now(); } else state.routines[id] = { id: id, hidden: true, updatedAt: Date.now() };
    mark('routines/' + id); setPlanOrder(planIds());
  }
  function planRestore(id) {
    var o = state.routines[id]; if (!o) return;
    if (o.items) { delete o.hidden; o.updatedAt = Date.now(); } else delete state.routines[id];
    mark('routines/' + id);
    setPlanOrder(planIds().filter(function (k) { return k !== id; }).concat([id]));
  }
  /* hard sets per muscle that one week of the plan adds up to */
  function planTargets() {
    var t = {};
    routineList().forEach(function (r) {
      if (r.core === false) return;
      r.items.forEach(function (it) { var e = exi(it.ex); if (e.log === 'cardio') return; Object.keys(e.muscles).forEach(function (mu) { t[mu] = (t[mu] || 0) + (it.sets || 0) * e.muscles[mu]; }); });
    });
    return t;
  }
  function shortName(n) { return String(n || '').replace(' (optional)', ''); }
  function restText(sec) { return !sec ? '' : sec < 120 ? sec + ' s' : (sec % 60 ? (Math.round(sec / 6) / 10) : sec / 60) + ' min'; }
  function repsText(it, e) { return it.reps || (it.lo + '–' + it.hi + (e.unit === 'reps' ? '' : ' ' + e.unit)); }
  function isLinked(items, i) { return !!(items[i].link || (i > 0 && items[i - 1].link)); }
  /* the exercises done back to back with this one (a named group or a linked run), itself included, in order */
  function mates(d, it) {
    var its = d.items, i = its.indexOf(it), a = i, b = i; if (i < 0) return [];
    if (it.group) { while (a > 0 && its[a - 1].group === it.group) a--; while (b < its.length - 1 && its[b + 1].group === it.group) b++; }
    else { while (a > 0 && its[a - 1].link && !its[a - 1].group) a--; while (b < its.length - 1 && its[b].link && !its[b + 1].group) b++; }
    return its.slice(a, b + 1);
  }
  function undone(it) { return it.rows.some(function (r) { return !r.d; }); }
  /* The workout shows one exercise open and the rest folded to a line. Open is the one tapped (draft.cur),
     otherwise the first with a set still to do. Editing a saved workout keeps everything open. */
  function curItem(d) {
    if (!d || d.editing) return null;
    var c = d.cur ? findItem(d.cur) : null; if (c) return c;
    for (var i = 0; i < d.items.length; i++) if (undone(d.items[i])) return d.items[i];
    return null;
  }
  /* after a set is ticked: when everything in the open exercise (and its superset) is done, the next one with sets left opens.
     When that was the last set of the workout the exercise stays open. */
  function advance(d, it) {
    var ms = mates(d, it); if (ms.some(undone)) return false;
    var its = d.items, n = its.length, from = its.indexOf(ms[ms.length - 1]);
    for (var k = 1; k <= n; k++) { var x = its[(from + k) % n]; if (undone(x)) { d.cur = x.u; return true; } }
    d.cur = it.u; return false; /* nothing left to do: the last one stays open */
  }
  /* one-time tips: each shows until the workout it first appeared in is finished. A log with a few workouts has seen them. */
  var tipShown = {};
  function tipSeen(k) { var t = state.ui.tips; if (!t) t = state.ui.tips = Object.keys(state.sessions).length >= 3 ? { t: 1, s: 1, b: 1 } : {}; return !!t[k]; }
  function tipsDone() { tipSeen('t'); Object.keys(tipShown).forEach(function (k) { state.ui.tips[k] = 1; }); tipShown = {}; }
  function rStats(r) {
    if (r.stats && r.builtin) return { n: r.items.length, sets: r.stats.sets, minutes: r.stats.minutes };
    var sets = 0, sec = 480;
    r.items.forEach(function (it) { var e = exi(it.ex); if (e.log === 'cardio') { sec += ((it.lo + it.hi) / 2) * 60; return; } sets += it.sets; sec += it.sets * (45 + (it.link ? 15 : (it.restSec || 60))); });
    return { n: r.items.length, sets: sets, minutes: Math.round(sec / 60) };
  }
  function isCore(s) { var r = getRoutine(s.key); if (r) return r.core !== false; return s.key !== 'day5' && s.core !== false; }
  function saveRoutine(r) { r.updatedAt = Date.now(); state.routines[r.id] = r; mark('routines/' + r.id); }

  /* ================= history and numbers ================= */
  function finished() { return Object.keys(state.sessions).map(function (k) { return state.sessions[k]; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.finishedAt || 0) - (b.finishedAt || 0); }); }
  function metric(e, sets) {
    if (!sets || !sets.length) return null;
    if (e.sport) return sumSets(sets).dist; /* an outing counts by how far it went */
    if (e.log === 'cardio' || e.log === 'time' || e.log === 'bw') return Math.max.apply(null, sets.map(function (s) { return s.r; }));
    return Math.max.apply(null, sets.map(function (s) { return s.w * (1 + s.r / 30); }));
  }
  /* what the progress screens plot for one workout: the heaviest weight used, or (mode 'e1rm') the estimated 1-rep max */
  /* mode 'tot' is the work done that day: weight times reps added up over every set (reps, seconds or minutes added up when there is no weight) */
  /* warm-up sets count toward Total, and only there: Oleksandr asked for that on 25 Nov */
  function liftVal(e, sets, mode, warm) {
    if (!sets || !sets.length) return null;
    if (mode === 'tot') return sets.concat(e.log === 'wr' && warm ? warm : []).reduce(function (a, x) { return a + (e.log === 'wr' ? (x.w || 0) * (x.r || 0) : (x.r || 0)); }, 0);
    if (e.log === 'wr' && mode !== 'e1rm') return Math.max.apply(null, sets.map(function (s) { return s.w || 0; }));
    return metric(e, sets);
  }
  function liftModeNow() { var m = state.ui.liftMode; return m === 'e1rm' || m === 'tot' ? m : 'max'; }
  /* numbers on the lifts screens: one decimal, and a thousands separator or K once totals get large */
  function big(v) { return v >= 1000 ? compact(v) : fmt(Math.round(v * 10) / 10); }
  function liftLabel(e, mode) { return e.log === 'wr' && mode !== 'e1rm' ? 'Top weight (' + UW() + ')' : metricLabel(e); }
  function bestSet(e, sets, mode) {
    if (e.log === 'wr' && mode !== 'e1rm') return sets.reduce(function (a, x) { return x.w > a.w || (x.w === a.w && x.r > a.r) ? x : a; });
    return sets.reduce(function (a, x) { return metric(e, [x]) > metric(e, [a]) ? x : a; });
  }
  function metricLabel(e) { return e.sport ? 'Distance (' + UD(e) + ')' : e.log === 'cardio' ? 'Minutes' : e.log === 'time' ? 'Longest hold (s)' : e.log === 'bw' ? 'Most reps in a set' : 'Estimated 1-rep max (' + UW() + ')'; }
  function metricUnit(e) { return e.sport ? UD(e) : e.log === 'cardio' ? 'min' : e.log === 'time' ? 's' : e.log === 'bw' ? 'reps' : UW(); }
  function setsText(e, sets) {
    if (!sets || !sets.length) return '—';
    if (e.sport) return sportText(e, sets);
    if (e.log === 'cardio') return sets.map(function (s) { return fmt(s.r) + ' min'; }).join(', ');
    if (e.log === 'time') return sets.map(function (s) { return fmt(s.r) + ' s'; }).join(', ');
    var sameW = sets.every(function (s) { return s.w === sets[0].w; });
    if (e.log === 'bw') {
      if (sameW && !sets[0].w) return sets.map(function (s) { return fmt(s.r); }).join(', ') + ' reps';
      return sets.map(function (s) { return (s.w ? '+' + fmt(s.w) + ' ' + UW() + ' × ' : '') + fmt(s.r); }).join(', ');
    }
    if (sameW) return fmt(sets[0].w) + ' ' + UW() + ' × ' + sets.map(function (s) { return fmt(s.r); }).join(', ');
    return sets.map(function (s) { return fmt(s.w) + ' × ' + fmt(s.r); }).join(', ');
  }
  function historyOf(exId, list) {
    var out = [];
    (list || finished()).forEach(function (s) { (s.entries || []).forEach(function (en) { if (en.ex === exId && en.sets && en.sets.length) out.push({ date: s.date, key: s.key, id: s.id, sets: en.sets, note: en.note, warm: en.warm, easy: s.easy }); }); });
    return out;
  }
  function lastEntry(key, exId, excludeId) {
    var h = historyOf(exId).filter(function (x) { return x.id !== excludeId; });
    for (var i = h.length - 1; i >= 0; i--) if (h[i].key === key) return h[i];
    return h.length ? h[h.length - 1] : null;
  }
  function bestBefore(exId, excludeId) {
    var e = exi(exId), best = null;
    historyOf(exId).forEach(function (h) { if (h.id === excludeId) return; var v = metric(e, h.sets); if (best == null || v > best) best = v; });
    return best;
  }
  /* records: what has been beaten so far for one exercise, given the sets done today */
  function exPrev(exId, excludeId) {
    var e = exi(exId), o = { n: 0, maxW: 0, best: null, maxVol: 0 };
    historyOf(exId).forEach(function (h) {
      if (h.id === excludeId) return; o.n++;
      var v = 0; h.sets.forEach(function (x) { if (x.w > o.maxW) o.maxW = x.w; v += (x.w || 0) * x.r; });
      if (v > o.maxVol) o.maxVol = v;
      var m = metric(e, h.sets); if (o.best == null || m > o.best) o.best = m;
    });
    return o;
  }
  function recordsOf(exId, sets, excludeId) {
    var e = exi(exId), out = { w: false, v: false, b: false, maxW: 0, vol: 0, best: null };
    if (!sets.length) return out;
    var prev = exPrev(exId, excludeId); if (!prev.n) return out;
    sets.forEach(function (x) { if (x.w > out.maxW) out.maxW = x.w; out.vol += (x.w || 0) * x.r; });
    out.best = metric(e, sets);
    if (e.log === 'wr') out.w = out.maxW > prev.maxW + 1e-9; /* more total weight in a session is no longer a record: adding a set was enough to set it off */
    out.b = out.best > prev.best + 1e-9;
    return out;
  }
  function itemRecords(it, d) {
    if (d.editing) return { w: false, v: false, b: false };
    return recordsOf(it.ex, rowSets({ ex: it.ex, rows: it.rows.filter(function (r) { return r.d; }) }), d.id);
  }
  function recordTags(e, rc, sets) {
    var t = [];
    if (rc.w) t.push('record weight ' + fmt(rc.maxW) + ' ' + UW() + '');
    if (rc.v) t.push('record volume ' + compact(rc.vol) + ' ' + UW() + '');
    if (rc.b) t.push(e.log === 'wr' ? 'best set ' + setsText(e, [topSet(e, sets)]) : e.log === 'bw' ? 'most reps in a set, ' + fmt(rc.best) : e.log === 'time' ? 'longest hold, ' + fmt(rc.best) + ' s' : e.sport ? 'longest yet, ' + distText(e, rc.best) : 'longest yet, ' + fmt(rc.best) + ' min');
    return t;
  }
  function hint(it, e, last) {
    var range = repsText(it, e);
    if (e.sport) return { t: last ? sportHint(e, last) : 'First time: start the stopwatch when you set off, or type the distance and time afterwards.', s: last ? sportHint(e, last).replace('. Match it, or', ' · match it, or').replace(/\.$/, '') : 'Start the stopwatch, or type it in afterwards' };
    if (!last) {
      if (e.log === 'cardio') return { t: 'First time: an easy pace you can hold a conversation at.', s: 'First time · an easy pace' };
      if (e.log === 'time') return { t: 'First time: hold good form for ' + range + '.', s: 'First time · hold for ' + range };
      return { t: 'First time: find a weight you can do for ' + range + ' reps' + (it.rir && it.rir !== '—' ? ' with ' + it.rir + ' in reserve.' : '.'), s: 'First time · find a weight for ' + range + ' reps' };
    }
    if (e.log === 'cardio') return { t: 'Same again, or a few minutes longer.', s: 'Same again, or a few minutes longer' };
    var planned = last.sets.slice(0, it.sets);
    if (planned.length >= it.sets && planned.every(function (s) { return s.r >= it.hi; })) {
      if (e.log === 'time') return { t: 'Every hold reached ' + it.hi + ' s. Make it harder or add a set.', s: 'Every hold reached ' + it.hi + ' s · make it harder', up: true };
      if (e.log === 'bw' && !planned[0].w) return { t: 'Every set reached ' + it.hi + '. Add a little weight today and build back up from ' + it.lo + '.', s: 'Every set reached ' + it.hi + ' · add a little weight', up: true };
      return { t: 'Every set reached ' + it.hi + '. Add weight today (about 2.5–5%) and build back up from ' + it.lo + '.', s: 'Every set reached ' + it.hi + ' · add weight today', up: true };
    }
    return { t: e.log === 'time' ? 'Hold a little longer than last time on at least one set.' : 'Keep the weight. Beat last time by one rep on at least one set.', s: e.log === 'time' ? 'Hold a little longer on one set' : 'Same weight · one more rep on one set' };
  }
  function nextKey() {
    var f = finished(), ids = routineList().filter(function (r) { return r.core !== false; }).map(function (r) { return r.id; });
    if (!ids.length) { var any = routineList(); return any.length ? any[0].id : null; }
    for (var i = f.length - 1; i >= 0; i--) { var ix = ids.indexOf(f[i].key); if (ix >= 0) return ids[(ix + 1) % ids.length]; }
    var wd = state.settings.planOrder ? null : WEEKDAY[new Date().getDay()];
    return wd && ids.indexOf(wd) >= 0 ? wd : ids[0];
  }
  function lastDone(key) { var f = finished(); for (var i = f.length - 1; i >= 0; i--) if (f[i].key === key) return f[i]; return null; }
  function countSets(s) { return (s.entries || []).reduce(function (a, en) { return a + (exi(en.ex).log === 'cardio' ? 0 : en.sets.length); }, 0); }
  /* weight lifted in a workout: every set, warm-up sets included (they count here and in an exercise's Total, nowhere else) */
  function volOf(s) { var v = 0; (s.entries || []).forEach(function (en) { var e = exi(en.ex); if (e.log !== 'wr' && e.log !== 'bw') return; en.sets.concat(en.warm || []).forEach(function (x) { v += (x.w || 0) * x.r; }); }); return v; }
  function durOf(s) { if (s.dur != null) return s.dur; if (!s.startedAt || !s.finishedAt) return null; var d = (s.finishedAt - s.startedAt) / 1000; return d >= 300 && d <= 18000 ? d : null; }
  function weeksWith(list) { var w = {}; list.forEach(function (s) { var k = weekStart(s.date); (w[k] = w[k] || []).push(s); }); return w; }
  function streakWeeks(list) {
    var w = weeksWith(list), cur = weekStart(today()), n = 0;
    if (!w[cur]) cur = addDays(cur, -7);
    while (w[cur]) { n++; cur = addDays(cur, -7); }
    return n;
  }
  function goalWeeks(list) { var w = weeksWith(list), g = state.settings.weeklyGoal || 4, n = 0; Object.keys(w).forEach(function (k) { if (w[k].filter(isCore).length >= g) n++; }); return n; }
  function records(list, mode) {
    var seen = {}, out = [];
    list.forEach(function (s) { (s.entries || []).forEach(function (en) { seen[en.ex] = en.name; }); });
    Object.keys(seen).forEach(function (id) {
      var e = exi(id, seen[id]), h = e.sport ? [] : historyOf(id, list), best = -Infinity, bi = 0, prs = 0, vals = [];
      h.forEach(function (x, i) { var v = mode ? liftVal(e, x.sets, mode, x.warm) : metric(e, x.sets); vals.push(v); if (v > best + 1e-9) { if (i) prs++; best = v; bi = i; } });
      if (h.length) out.push({ id: id, e: e, name: e.gone ? seen[id] : e.name, best: best, date: h[bi].date, sets: h[bi].sets, vals: vals, n: h.length, prs: prs, first: vals[0], last: vals[vals.length - 1], lastDate: h[h.length - 1].date });
    });
    return out;
  }
  function milestones(list) {
    var n = list.length, vol = 0, sets = 0, prs = 0;
    list.forEach(function (s) { vol += volOf(s); sets += countSets(s); });
    records(list).forEach(function (r) { prs += r.prs; });
    var st = streakWeeks(list), gw = goalWeeks(list), t = vol * KGF() / 1000;
    function step(v, steps) { for (var i = 0; i < steps.length; i++) if (v < steps[i]) return { goal: steps[i], prev: i ? steps[i - 1] : 0, got: i }; return { goal: steps[steps.length - 1], prev: steps[steps.length - 1], got: steps.length }; }
    function M(label, v, steps, unit) { var s = step(v, steps), done = s.got > 0; return { label: label, steps: steps, level: s.got, value: v, show: done ? (s.got === steps.length ? steps[steps.length - 1] : s.prev) : s.goal, unit: unit, got: done, next: s.got < steps.length ? s.goal : null, pct: s.got < steps.length ? Math.max(0, Math.min(1, (v - s.prev) / (s.goal - s.prev))) : 1 }; }
    return [M('Workouts logged', n, [1, 5, 10, 25, 50, 100, 200, 400], ''), M('Weeks in a row', st, [2, 4, 8, 12, 26, 52, 78, 104], 'wk'), M('Weeks on target', gw, [1, 4, 8, 12, 26, 52, 78, 104], ''),
      M('Tonnes lifted', t, [5, 10, 25, 50, 100, 250, 500, 1000], 't'), M('Hard sets', sets, [50, 100, 250, 500, 1000, 2500, 5000, 10000], ''), M('Personal bests', prs, [1, 5, 10, 25, 50, 100, 200, 400], '')];
  }
  var FUN = [[100, 'a newborn elephant'], [400, 'a grand piano'], [700, 'a dairy cow'], [1300, 'a small car'], [3000, 'a hippo'], [6000, 'an African elephant'], [8000, 'a T. rex'], [12000, 'a double-decker bus'], [20000, 'a fire engine'], [36000, 'a humpback whale']];
  function funVolume(v) { var kgs = v * KGF(); if (kgs < 100) return ''; var pick = FUN[0]; FUN.forEach(function (f) { if (kgs >= f[0]) pick = f; }); var k = kgs / pick[0]; return 'You moved ' + compact(v) + ' ' + UW() + ' in total. That is about ' + (k >= 1.75 ? (Math.round(k * 2) / 2) + ' times ' : '') + 'the weight of ' + pick[1] + '.'; }

  /* ================= the workout in progress (draft) ================= */
  function migrateDraft(d) {
    if (!d || d.items) return d;
    var s = PLAN.sessions[d.key]; if (!s || !d.e) return null;
    var r = builtin(d.key);
    d.items = r.items.map(function (it) { var o = d.e[it.n] || { note: '', sets: [] }; return itemFrom(it, o.sets.map(function (x) { return { w: x.w, r: x.r, d: !!x.d }; }), o.note); });
    d.name = shortName(s.name); d.v = 2; delete d.e;
    return d;
  }
  function itemFrom(it, rows, note) {
    var e = exi(it.ex);
    return { u: uid(), ex: it.ex, n: it.n || '', group: it.group || '', link: !!it.link, sets: it.sets, lo: it.lo, hi: it.hi, reps: it.reps || '', rir: it.rir || e.rir, rest: it.rest || '', restSec: it.link ? 10 : it.restSec, cue: it.cue || '', note: note || '', rows: rows, plus: it.plus ? 1 : undefined };
  }
  /* Warm-up sets: kept in it.warm (and entry.warm once saved), apart from the working sets, so targets, records,
     set counts and weight lifted never see them. */
  function warmRows(sets) { return (sets || []).map(function (x) { return { w: fmt(x.w), r: fmt(x.r), d: true }; }); }
  function warmSets(it) { var out = []; (it.warm || []).forEach(function (x) { var r = num(x.r), w = num(x.w); if (x.d && r != null && r > 0) out.push({ w: w == null || w < 0 ? 0 : w, r: r }); }); return out; }
  function blankRows(n) { var r = []; for (var i = 0; i < n; i++) r.push({ w: '', r: '', d: false }); return r; }
  /* ---- the training block (N1): 12 weeks in four phases, then the next block. Settings keep only where it starts
     (block.start, a Monday; the week of the first workout when not set), an easy week taken early (block.easy, the Monday
     of that week, which ends its block) and whether the push weeks add a set (block.plus). ---- */
  var BLOCK_WEEKS = 12, PHASES = [['settle', 'Settle in', 1, 2, 'Sets as written. Stop the big lifts with 2 or 3 reps left while you find weights and positions.'], ['build', 'Build', 3, 6, 'Add reps, then weight.'], ['push', 'Push', 7, 11, 'If you are recovering well, one more set on up to four exercises. Take the last set of small exercises to failure.'], ['easy', 'Easy week', 12, 12, 'Half the sets, the same weights, 3 or 4 reps left. Then the next block starts.']];
  var PLUS_EX = ['cable-lateral-raise', 'standing-calf-raise', 'pec-deck', 'triceps-pushdown'];
  function blockInfo(day) {
    var s = state.settings, b = s.block || {}; if (s.blockOff) return null;
    var f = finished(), td = day || today(), ws = weekStart(td), start = b.start || (f.length ? weekStart(f[0].date) : ws), num = 1, guard = 0, early = false;
    if (start > ws) start = ws;
    while (guard++ < 400) {
      var cut = b.easy && b.easy >= start && b.easy < addDays(start, 7 * BLOCK_WEEKS), end = cut ? addDays(b.easy, 7) : addDays(start, 7 * BLOCK_WEEKS);
      if (ws < end) { early = !!cut && b.easy === ws; break; }
      start = end; num++;
    }
    var wk = Math.round((toDate(ws) - toDate(start)) / 6048e5) + 1, easy = early || wk >= BLOCK_WEEKS, ph = easy ? PHASES[3] : PHASES.filter(function (p) { return wk >= p[2] && wk <= p[3]; })[0] || PHASES[1];
    return { start: start, week: wk, weeks: BLOCK_WEEKS, num: num, easy: easy, early: early, phase: ph[0], name: ph[1], plus: !!b.plus && ph[0] === 'push' };
  }
  function startDraft(key, from) {
    histMemo = null;
    var blk = from || key === 'free' ? null : blockInfo();
    var r = key === 'free' ? null : getRoutine(key);
    var d = { v: 2, id: from ? from.id : uid(), key: key, name: from ? (from.name || (r ? shortName(r.name) : 'Workout')) : (r ? shortName(r.name) : 'Workout'), date: from ? from.date : today(),
      startedAt: from ? from.startedAt : Date.now(), notes: from ? (from.notes || '') : '', editing: !!from, dur: from ? durOf(from) : null, items: [] };
    var used = {};
    (r ? r.items : []).forEach(function (it, i) {
      var src = Object.assign({}, it, { n: it.n || String(i + 1) });
      /* an easy week does half the sets; the push weeks add one to four chosen exercises when that is switched on */
      if (blk && blk.easy && exi(it.ex).log !== 'cardio') src.sets = Math.max(1, Math.ceil(it.sets / 2));
      else if (blk && blk.plus && PLUS_EX.indexOf(it.ex) >= 0) { src.sets = it.sets + 1; src.plus = 1; }
      var prev = from ? (from.entries || []).filter(function (en, j) { if (used[j]) return false; if (en.n === src.n && en.ex === it.ex) { used[j] = 1; return true; } return false; })[0] : null;
      /* as many rows as today's target has: the planned sets, plus any extra working sets done last time (two at most) */
      var last = lastEntry(key, it.ex, d.id), tgN = !prev && last && last.key === key && !(blk && blk.easy) ? targetFor(src, exi(it.ex), last, exHist(it.ex)) : null, count = prev ? Math.max(prev.sets.length, it.sets) : Math.max(src.sets, tgN && tgN.sets ? Math.min(tgN.sets.length, src.sets + 2) : 0), rows = [];
      for (var k = 0; k < count; k++) { var ps = prev && prev.sets[k]; rows.push(ps ? rowFrom(exi(it.ex), ps) : { w: '', r: '', d: false }); }
      var ni = itemFrom(src, rows, prev ? prev.note : ''); if (prev && prev.warm) ni.warm = warmRows(prev.warm); d.items.push(ni);
    });
    if (from) (from.entries || []).forEach(function (en, j) {
      if (used[j]) return; var e = exi(en.ex, en.name);
      var xi = itemFrom({ ex: en.ex, n: en.n || 'x', sets: en.sets.length, lo: e.lo, hi: e.hi, restSec: e.restSec }, en.sets.map(function (x) { return rowFrom(e, x); }), en.note); if (en.warm) xi.warm = warmRows(en.warm); d.items.push(xi);
    });
    if (blk && blk.easy) d.easy = true;
    state.draft = d; touchDraft(true); stopRest(); summary = null; editor = null;
    state.ui.tab = 'log'; state.ui.wmin = false; applyTheme(); wake();
    render(); window.scrollTo(0, 0);
  }
  function newItem(exId) { var e = exi(exId); return itemFrom({ ex: exId, n: 'x', sets: e.sets, lo: e.lo, hi: e.hi, restSec: e.restSec }, blankRows(e.log === 'cardio' ? 1 : e.sets), ''); }
  function touchDraft(now) {
    state.draftAt = Date.now(); if (!STANDALONE) state.dirty['state/draft'] = 1; saveLocal();
    clearTimeout(draftTimer); if (STANDALONE) return;
    draftWait = true; refreshSync();
    draftTimer = setTimeout(function () { draftWait = false; pump('state/draft'); }, now ? 50 : 2500);
  }
  function findItem(u) { var d = state.draft; if (!d) return null; for (var i = 0; i < d.items.length; i++) if (d.items[i].u === u) return d.items[i]; return null; }
  function rowSets(it) {
    var e = exi(it.ex), out = [];
    it.rows.forEach(function (s) { var r = e.sport ? Math.round(((num(s.r) || 0) + (num(s.sec) || 0) / 60) * 1e4) / 1e4 : num(s.r), w = num(s.w); if (r == null || r <= 0) return; var o = { w: (e.log === 'cardio' || e.log === 'time') ? 0 : (w == null || w < 0 ? 0 : w), r: r }; if (e.sport) { var ds = num(s.dist); if (ds != null && ds > 0) o.dist = ds; } if (s.rir != null && s.d) o.rir = s.rir; out.push(o); });
    return out;
  }
  function draftCount() { var n = 0; state.draft.items.forEach(function (it) { n += rowSets(it).length; }); return n; }
  function draftProgress() { var done = 0, all = 0; state.draft.items.forEach(function (it) { it.rows.forEach(function (r) { all++; if (r.d) done++; }); }); return { done: done, all: all }; }
  /* A workout belongs to the day its first set is logged, not the day the session was opened.
     While no set is ticked, a session opened on an earlier day moves to today and its clock starts over.
     At the first set the clock also starts over if the session has been open for more than two hours.
     A date picked by hand (dateSet) is left alone. Returns true when the clock was restarted. */
  function freshenDraft(atSet) {
    var d = state.draft; if (!d || d.editing) return false;
    if (draftProgress().done > (atSet ? 1 : 0)) return false;
    var t = today(), changed = false, restarted = false;
    if (!d.dateSet && d.date !== t) { d.date = t; changed = true; }
    if (iso(new Date(d.startedAt)) !== t || (atSet && Date.now() - d.startedAt > 2 * 3600000)) { d.startedAt = Date.now(); changed = true; restarted = true; }
    if (changed) touchDraft(true);
    return restarted;
  }
  /* when this phone last made a backup; kept beside the log, never inside a backup */
  var BK_KEY = 'hilo-backup-v1';
  function backupInfo() { try { return JSON.parse(localStorage.getItem(BK_KEY)) || {}; } catch (e) { return {}; } }
  function setBackupInfo(o) { try { localStorage.setItem(BK_KEY, JSON.stringify(Object.assign(backupInfo(), o))); } catch (e) {} }
  function backupDone() { setBackupInfo({ at: Date.now(), n: Object.keys(state.sessions).length, later: 0 }); }
  /* how many workouts are not in any backup yet, and whether it is time to say so */
  function backupState() {
    var b = backupInfo(), n = Object.keys(state.sessions).length, fresh = Math.max(0, n - (b.n || 0)), days = b.at ? Math.floor((Date.now() - b.at) / 864e5) : null;
    var due = n >= 3 && fresh > 0 && (!b.at || fresh >= 5 || days >= 30) && n - (b.later || 0) >= 5;
    return { at: b.at || null, fresh: fresh, n: n, due: due };
  }
  function finishDraft() {
    var d = state.draft, entries = [], prs = [], recEx = {}, r = d.key === 'free' ? null : getRoutine(d.key);
    var before = finished().filter(function (s) { return s.id !== d.id; });
    d.items.forEach(function (it) {
      var e = exi(it.ex), sets = rowSets(it); if (!sets.length) return;
      var en = { n: it.n, ex: it.ex, name: e.name, note: it.note || '', sets: sets }, wm = warmSets(it); if (wm.length) en.warm = wm; entries.push(en);
      if (!d.editing) { var rc = recordsOf(it.ex, sets, d.id), tags = recordTags(e, rc, sets); if (e.sport && paceRecord(e, sets, d.id)) { var so = sumSets(sets); tags.push('fastest pace yet, ' + paceText(e, so.dist, so.dmin)); recEx[it.ex] = 'Fastest pace'; } if (tags.length) { prs.push({ name: e.name, tags: tags, top: e.sport || e.log === 'cardio' ? '' : setsText(e, [bestSet(e, sets, 'e1rm')]) }); if (rc.w) recEx[it.ex] = 'Record weight'; else if (rc.b && e.sport) recEx[it.ex] = 'Longest yet'; else if (rc.b && e.log !== 'wr') recEx[it.ex] = 'Best yet'; } }
    });
    if (!entries.length) return;
    var now = Date.now(), dur = d.editing ? d.dur : (function () { var x = (now - d.startedAt) / 1000; return x >= 60 && x <= 18000 ? Math.round(x) : null; })();
    /* a run, ride or swim is usually logged afterwards, so its length is the time logged and not how long the screen was open */
    if (!d.editing && entries.every(function (en) { return exi(en.ex).sport; })) { var mins = 0; entries.forEach(function (en) { en.sets.forEach(function (x) { mins += x.r; }); }); dur = Math.round(mins * 60); }
    var doc = { v: 2, id: d.id, key: d.key, name: d.name || (r ? shortName(r.name) : 'Workout'), date: d.date, startedAt: d.startedAt, finishedAt: d.editing ? (state.sessions[d.id] || {}).finishedAt || now : now,
      dur: dur, core: r ? r.core !== false : true, notes: d.notes || '', entries: entries, updatedAt: now };
    if (d.easy || (d.editing && (state.sessions[d.id] || {}).easy)) doc.easy = true;
    var sameKey = before.filter(function (x) { return x.key === d.key; }), volRec = !d.editing && d.key !== 'free' && sameKey.length > 0 && volOf(doc) > Math.max.apply(null, sameKey.map(volOf)) + 1e-9;
    var wasFirst = !before.length, msBefore = milestones(before).filter(function (m) { return m.got; }).map(function (m) { return m.label + m.show; });
    state.sessions[d.id] = doc;
    var logged = d.key === 'free' ? d.items.filter(function (it) { return rowSets(it).length; }) : d.items;
    var same = r && r.items.length === d.items.length && r.items.every(function (it, i) { return it.ex === d.items[i].ex; });
    summary = { id: d.id, key: d.key, name: doc.name, sets: countSets(doc), vol: volOf(doc), dur: dur, prs: prs, volRec: volRec, edited: d.editing, first: wasFirst, cmp: d.editing ? null : compareSession(doc, before, recEx, d.items),
      offer: d.editing ? null : (d.key === 'free' ? 'save' : (r && !same && !r.fixed ? 'update' : null)), items: logged.map(function (it) { return { ex: it.ex, sets: Math.max(1, rowSets(it).length || it.sets), lo: it.lo, hi: it.hi, restSec: it.restSec < 30 ? exi(it.ex).restSec : it.restSec, link: it.link }; }),
      fresh: milestones(finished()).filter(function (m) { return m.got && msBefore.indexOf(m.label + m.show) < 0; }) };
    state.draft = null; stopRest();
    mark('sessions/' + d.id); touchDraft(true); applyTheme(); wake();
    render(); window.scrollTo(0, 0);
    openSummary();
  }
