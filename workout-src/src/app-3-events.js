
  /* ================= figures: animate the ones on screen ================= */
  var live = [], io = null, lastFrame = 0;
  function observe() {
    live = [];
    if (io) io.disconnect();
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(function (entries) { entries.forEach(function (en) { var i = live.indexOf(en.target); if (en.isIntersecting && i < 0) live.push(en.target); if (!en.isIntersecting && i >= 0) live.splice(i, 1); }); });
    document.querySelectorAll('svg[data-illo]').forEach(function (el) { io.observe(el); });
  }
  function frame(ms) {
    if (ms - lastFrame > 32 && live.length && !document.hidden) { lastFrame = ms; live.forEach(function (el) { var k = el.dataset.illo; el.innerHTML = ILLO.render(k, ILLO.phase(k, ms)); }); }
    requestAnimationFrame(frame);
  }
  if (!reduceMotion) requestAnimationFrame(frame);

  /* ================= rest timer, sound, screen lock ================= */
  var restEl = document.getElementById('rest'), restT = document.getElementById('rest-t'), restArc = document.getElementById('rest-arc'), restL = document.getElementById('rest-l'), restAdd = restEl.querySelector('[data-act="rest-add"]'), restSub = restEl.querySelector('[data-act="rest-sub"]'), restStep = document.getElementById('rest-step'), restBy = document.getElementById('rest-by'), restSkip = restEl.querySelector('[data-act="rest-skip"]'), RC = 2 * Math.PI * 18, actx = null, wakeLock = null;
  function unlockAudio() { if (!state.settings.sound) return; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} }
  function beep() {
    if (!state.settings.sound || !actx) return;
    try {
      [0, 0.2].forEach(function (dt, i) {
        var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + dt;
        o.type = 'sine'; o.frequency.value = i ? 1175 : 880;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.22);
      });
    } catch (e) {}
  }
  function startRest(sec) { rest.until = Date.now() + sec * 1000; rest.total = sec; rest.beeped = false; drawRest(); }
  function stopRest() { rest.until = 0; rest.beeped = true; if (restEl) restEl.hidden = true; }
  function drawTimer(t) {
    var it = findItem(t.u), now = Date.now(); if (!it) { delete state.draft.timer; return; }
    var e = exi(it.ex), full = RC.toFixed(1);
    restEl.hidden = false; restEl.classList.remove('over'); restEl.classList.add('timing');
    var by = t.mul === 60 ? '1 min' : '10 s', words = t.mul === 60 ? '1 minute' : '10 seconds';
    restStep.hidden = !t.total; restBy.textContent = by; restAdd.setAttribute('aria-label', words + ' more'); restSub.setAttribute('aria-label', words + ' less'); restSkip.textContent = 'Stop';
    restArc.setAttribute('stroke-dasharray', full);
    if (now < t.start) { restL.textContent = 'Get ready'; restT.textContent = String(Math.ceil((t.start - now) / 1000)); restArc.setAttribute('stroke-dashoffset', '0'); return; }
    if (!t.go) { t.go = true; beep(); }
    var el = (now - t.start) / 1000, left = t.total - el;
    restL.textContent = e.name + (e.log === 'time' ? ', set ' + (t.i + 1) : '');
    restT.textContent = t.total ? fmtClock(Math.ceil(Math.max(0, left))) : fmtClock(el);
    restArc.setAttribute('stroke-dashoffset', (t.total ? RC * (1 - Math.max(0, Math.min(1, left / t.total))) : 0).toFixed(1));
    if (t.total && left <= 0) { beep(); timerStop(true); }
  }
  /* the bar that stands in for a minimised workout: its name and clock, or the countdown that is running */
  function drawMini() {
    var d = state.draft, el = document.getElementById('wmini'); if (!el || el.hidden || !d || d.editing) return;
    var busy = !restEl.hidden, p = draftProgress(), next = null;
    next = curItem(d); if (next && !undone(next)) next = null;
    if (!next) d.items.some(function (it) { if (undone(it)) { next = it; return true; } return false; });
    document.getElementById('wmini-dot').hidden = !busy;
    document.getElementById('wmini-a').textContent = busy ? (d.timer ? restL.textContent : restEl.classList.contains('over') ? 'Rest is over' : 'Rest') : (d.name || 'Workout');
    document.getElementById('wmini-t').textContent = busy ? restT.textContent : fmtClock((Date.now() - d.startedAt) / 1000);
    document.getElementById('wmini-s').textContent = (next ? exi(next.ex).name + ' · ' : '') + p.done + ' of ' + p.all + ' sets done';
  }
  function drawRest() { drawRestCore(); drawMini(); }
  function drawRestCore() {
    var tm = state.draft && state.draft.timer;
    if (tm) { drawTimer(tm); return; }
    if (restEl.classList.contains('timing')) { restEl.classList.remove('timing'); restStep.hidden = false; restBy.textContent = '30 s'; restAdd.setAttribute('aria-label', '30 seconds more'); restSub.setAttribute('aria-label', '30 seconds less'); restSkip.textContent = 'Skip'; }
    if (!rest.until) { if (!restEl.hidden) restEl.hidden = true; return; }
    var left = (rest.until - Date.now()) / 1000;
    if (left <= -8) { stopRest(); return; }
    restEl.hidden = false; restEl.classList.toggle('over', left <= 0);
    restL.textContent = left > 0 ? (nextSet ? 'Next ' + nextSet : 'Rest') : 'Rest is over';
    restT.textContent = left > 0 ? fmtClock(Math.ceil(left)) : 'Go';
    restArc.setAttribute('stroke-dasharray', RC.toFixed(1));
    restArc.setAttribute('stroke-dashoffset', (RC * (1 - Math.max(0, Math.min(1, left / rest.total)))).toFixed(1));
    if (left <= 0 && !rest.beeped) { rest.beeped = true; beep(); }
  }
  function wake() {
    var want = !!(state.draft && !state.draft.editing && state.settings.awake && !document.hidden);
    try {
      if (want && !wakeLock && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }, function () {});
      else if (!want && wakeLock) { wakeLock.release(); wakeLock = null; }
    } catch (e) {}
  }

  /* ================= confetti ================= */
  var fxRun = 0;
  function confetti(n, ox, oy) {
    if (reduceMotion) return;
    var cv = document.getElementById('fx'), ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight, cs = getComputedStyle(document.documentElement);
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cols = [cs.getPropertyValue('--accent').trim(), cs.getPropertyValue('--hot').trim(), cs.getPropertyValue('--green').trim(), '#f2b632', cs.getPropertyValue('--ink').trim()], P = [], burst = ox != null;
    for (var i = 0; i < n; i++) {
      var a = burst ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * 1.5, sp = burst ? 2 + Math.random() * 4 : 7 + Math.random() * 9;
      P.push({ x: burst ? ox : W / 2 + (Math.random() - 0.5) * W * 0.5, y: burst ? oy : H * 0.78, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (burst ? 2 : 3), w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length] });
    }
    var run = ++fxRun, t0 = performance.now(), life = burst ? 900 : 2200;
    (function step(now) {
      if (run !== fxRun) return;
      var k = (now - t0) / life; ctx.clearRect(0, 0, W, H);
      if (k >= 1) return;
      P.forEach(function (p) {
        p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k * k); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      requestAnimationFrame(step);
    })(t0);
  }

  /* ================= chart hover ================= */
  var tipTimer = null;
  function chartPointer(ev) {
    var box = ev.target.closest && ev.target.closest('.chart'); if (!box) return;
    clearTimeout(tipTimer);
    var id = box.dataset.chart, c = charts[id], svg = box.querySelector('svg'), tip = document.getElementById(id + '-t'); if (!c || !svg || !tip) return;
    var r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * c.W, html = '', px = 0, py = 0;
    if (c.type === 'multi') {
      var bc = c.cols[0]; c.cols.forEach(function (q) { if (Math.abs(q.x - x) < Math.abs(bc.x - x)) bc = q; });
      html = bc.html; px = bc.x; py = c.top + 26;
      var mx = document.getElementById(id + '-x'); mx.setAttribute('x1', bc.x); mx.setAttribute('x2', bc.x); mx.setAttribute('visibility', 'visible');
    } else if (c.type === 'line') {
      var best = 0, p; c.P.forEach(function (q, i) { if (Math.abs(q[0] - x) < Math.abs(c.P[best][0] - x)) best = i; });
      p = c.P[best]; html = c.pts[best].tip;
      if (c.XP && c.XP.length) {
        /* with every set drawn, pick the nearest point in both directions; the line's own points win a tie */
        var y = (ev.clientY - r.top) / r.width * c.W, bd = Infinity;
        c.P.forEach(function (q, i) { var dd = (q[0] - x) * (q[0] - x) + (q[1] - y) * (q[1] - y); if (dd < bd) { bd = dd; p = q; html = c.pts[i].tip; } });
        c.XP.forEach(function (q, i) { var dd = (q[0] - x) * (q[0] - x) + (q[1] - y) * (q[1] - y); if (dd < bd - 1) { bd = dd; p = q; html = c.extra[i].tip; } });
      }
      px = p[0]; py = p[1];
      var cx = document.getElementById(id + '-x'), cd = document.getElementById(id + '-d');
      cx.setAttribute('x1', p[0]); cx.setAttribute('x2', p[0]); cx.setAttribute('visibility', 'visible');
      cd.setAttribute('cx', p[0]); cd.setAttribute('cy', p[1]); cd.setAttribute('visibility', 'visible');
    } else {
      var i = Math.max(0, Math.min(c.weeks.length - 1, Math.floor((x - c.m.l) / c.band))), w = c.weeks[i];
      html = c.tip(w); px = w.cx; py = w.top;
    }
    tip.innerHTML = html; tip.hidden = false;
    var sx = r.width / c.W, left = Math.max(0, Math.min(px * sx - tip.offsetWidth / 2, r.width - tip.offsetWidth));
    tip.style.left = left + 'px'; tip.style.top = Math.max(0, py * sx - tip.offsetHeight - 12) + 'px';
  }
  function chartHide(id) {
    var tip = document.getElementById(id + '-t'); if (tip) tip.hidden = true;
    ['-x', '-d'].forEach(function (k) { var el = document.getElementById(id + k); if (el) el.setAttribute('visibility', 'hidden'); });
  }
  /* a finger lifts as soon as it taps, so on touch the pop-up stays for two seconds; a mouse hides it on leaving */
  function chartLeave(ev) {
    var box = ev.target.closest && ev.target.closest('.chart'); if (!box) return;
    if (ev.type === 'pointerout' && ev.relatedTarget && box.contains(ev.relatedTarget)) return;
    var id = box.dataset.chart; clearTimeout(tipTimer);
    if (ev.pointerType === 'mouse') chartHide(id); else tipTimer = setTimeout(function () { chartHide(id); }, 2000);
  }
  /* a sideways swipe on the single-exercise graph steps to the next or previous exercise, like the arrows */
  var swipe = null;
  view.addEventListener('pointerdown', function (ev) { var b = ev.target.closest && ev.target.closest('.chart[data-chart="exc"]'); swipe = b ? { x: ev.clientX, y: ev.clientY } : null; });
  view.addEventListener('pointerup', function (ev) {
    if (!swipe) return; var dx = ev.clientX - swipe.x, dy = ev.clientY - swipe.y; swipe = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    var b = view.querySelector('.lift-nav [data-step="' + (dx < 0 ? 1 : -1) + '"]'); if (!b) return;
    state.ui.ex = b.dataset.ex; saveLocal(); render(); enter();
    var card = view.querySelector('.chart[data-chart="exc"]'); if (card) { card.classList.remove('from-l', 'from-r'); void card.offsetWidth; card.classList.add(dx < 0 ? 'from-r' : 'from-l'); }
  });
  view.addEventListener('pointercancel', function () { swipe = null; });
  function liftLine(g, id) {
    var show = liftShow[g] || (liftShow[g] = {});
    if (show[id] != null) delete show[id];
    else {
      var used = {}, n = 0, k; Object.keys(show).forEach(function (x) { used[show[x]] = 1; n++; });
      if (n >= LIFT_MAX) { toast('The graph holds ' + LIFT_MAX + ' lines. Hide one first.'); return; }
      for (k = 0; k < LIFT_MAX; k++) if (!used[k]) { show[id] = k; break; }
    }
    render();
  }
  view.addEventListener('pointermove', chartPointer);
  view.addEventListener('pointerdown', chartPointer);
  view.addEventListener('pointerout', chartLeave);
  view.addEventListener('pointerup', chartLeave);
  view.addEventListener('pointercancel', chartLeave);

  /* ================= arriving on a screen: charts draw in and the big numbers count up ================= */
  var enterTimer = null;
  function countUp() {
    if (reduceMotion) return;
    view.querySelectorAll('[data-count]').forEach(function (el) {
      var to = +el.dataset.count, f = el.dataset.fmt === 'compact' ? compact : el.dataset.fmt === 'short' ? shortNum : function (v) { return String(Math.round(v)); }, t0 = performance.now();
      if (!(to > 0)) return;
      (function step(now) { var k = Math.min(1, (now - t0) / 800); el.textContent = f(k < 1 ? to * (1 - Math.pow(1 - k, 3)) : to); if (k < 1 && el.isConnected) requestAnimationFrame(step); })(t0);
    });
  }
  function enter() { view.classList.add('enter'); clearTimeout(enterTimer); enterTimer = setTimeout(function () { view.classList.remove('enter'); }, 1700); countUp(); }

  /* ================= backup ================= */
  function backupData() { return { app: 'workout-log', v: 2, exportedAt: new Date().toISOString(), sessions: state.sessions, body: state.body, routines: state.routines, custom: state.custom, settings: state.settings }; }
  function restore(text) {
    var data; try { data = JSON.parse(text); } catch (e) { toast('That is not a Hitit backup. Nothing was changed.'); return; }
    if (!data || !data.sessions || typeof data.sessions !== 'object') { toast('That is not a Hitit backup. Nothing was changed.'); return; }
    keepRescue();
    var n = 0, wasEmpty = emptyLog(), bu = data.settings && data.settings.unit === 'lb' ? 'lb' : 'kg';
    if (!wasEmpty && bu !== (isLb() ? 'lb' : 'kg')) { toast('That backup is in ' + (bu === 'lb' ? 'pounds' : 'kilograms') + ' and this log is not. Switch units in settings, then restore.'); return; }
    [['sessions', 'sessions', 'sessions/'], ['body', 'body', 'body/'], ['routines', 'routines', 'routines/'], ['custom', 'custom', 'exercises/']].forEach(function (c) {
      var src = data[c[0]] || {}, dst = state[c[1]];
      Object.keys(src).forEach(function (id) { var a = src[id], b = dst[id]; if (!a || typeof a !== 'object') return; if (!b || (a.updatedAt || 0) >= (b.updatedAt || 0)) { dst[id] = a; mark(c[2] + id); if (c[0] === 'sessions' && !b) n++; } });
    });
    if (wasEmpty) { state.settings = Object.assign({}, DEF_SET, state.settings, data.settings || {}, { unit: bu, setupDone: true }); setup = null; saveSettings(); }
    CAT = null; saveLocal(); applyTheme(); closeSheet(); render();
    toast('Backup restored. ' + plural(n, 'workout') + ' added.');
  }
  function saveBackupFile(lost) {
    var text = lost ? (loadFail != null ? loadFail : lostText) || '' : JSON.stringify(backupData()), name = (lost ? 'hitit-unreadable-log-' : 'hitit-backup-') + today() + (lost ? '.txt' : '.json');
    function done() { if (lost) { toast('File saved'); return; } backupDone(); toast('Backup saved'); if (scrim.hidden) render(); else settingsSheet(); }
    try {
      var file = new File([text], name, { type: lost ? 'text/plain' : 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Hitit backup' }).then(done, function () {}); return; }
    } catch (e) {}
    try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: lost ? 'text/plain' : 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); done(); } catch (e) { toast('Could not save a file here. Use the backup text instead.'); }
  }

  /* ================= actions ================= */
  function scrollToItem(u) { var el = document.getElementById('x-' + u); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); }
  /* brings the exercise that has just opened under the workout bar; the page does not move when it is already in view */
  function showItem(u) {
    var el = document.getElementById('x-' + u); if (!el) return;
    var r = el.getBoundingClientRect(), top = 104, vh = window.innerHeight;
    if (r.top < top || r.top > vh * 0.45) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - top), behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function pickExercise(exId) {
    var p = picker, d = state.draft, e = exi(exId); if (!p) return;
    if (p.mode === 'draft' && d) { var it = newItem(exId); d.items.push(it); d.cur = it.u; noteOpen = null; touchDraft(); closeSheet(); render(); scrollToItem(it.u); }
    else if (p.mode === 'replace' && d) { var ni = swapItem(p.u, exId); if (ni) { closeSheet(); render(); scrollToItem(ni.u); } }
    else if (p.mode === 'editor' && editor) { editor.items.push({ ex: exId, sets: e.log === 'cardio' ? 1 : e.sets, lo: e.lo, hi: e.hi, restSec: e.restSec, rir: e.rir, link: false }); render(); toast('Added ' + e.name); }
    else if (p.mode === 'lift') { state.ui.ex = exId; saveLocal(); closeSheet(); render(); enter(); }
    else if (p.mode === 'tile') { var tl = outList().slice(); if (p.i >= 0 && p.i < tl.length) tl[p.i] = exId; else tl.push(exId); setOutTiles(tl); closeSheet(); render(); }
  }
  function openEditor(key) {
    if (!key) { editor = { id: 'r' + uid(), isNew: true, name: '', focus: '', core: true, warmup: '', items: [] }; }
    else {
      var r = getRoutine(key); if (!r) return;
      var items = clone(r.items);
      items.forEach(function (it, i) { if (it.group && items[i + 1] && items[i + 1].group === it.group) it.link = true; if (it.restSec < 30 && !it.link) it.restSec = exi(it.ex).restSec; if (it.link) it.restSec = items[i + 1] && items[i + 1].restSec >= 30 ? items[i + 1].restSec : 60; });
      editor = { id: r.id, isNew: false, name: r.name, focus: r.focus || '', core: r.core !== false, warmup: r.warmup || '', createdAt: r.createdAt, items: items };
    }
    state.ui.tab = 'log'; render(); window.scrollTo(0, 0);
  }
  function saveEditor() {
    var ed = editor, nameEl = document.getElementById('ed-name');
    ed.name = (ed.name || '').trim();
    if (!ed.name) { toast('Give the session a name.'); if (nameEl) nameEl.focus(); return; }
    if (!ed.items.length) { toast('Add at least one exercise.'); return; }
    var items = ed.items.map(function (it, i) {
      var lo = Math.max(1, Math.round(num(it.lo) || 1)), hi = Math.max(lo, Math.round(num(it.hi) || lo));
      var o = { ex: it.ex, sets: it.sets, lo: lo, hi: hi, restSec: it.restSec, link: !!it.link && i < ed.items.length - 1 };
      ['rir', 'cue', 'why', 'swap', 'detail'].forEach(function (k) { if (it[k]) o[k] = it[k]; });
      return o;
    });
    saveRoutine({ id: ed.id, name: ed.name, focus: (ed.focus || '').trim(), core: !!ed.core, warmup: ed.warmup || '', createdAt: ed.createdAt || Date.now(), items: items });
    editor = null; render(); window.scrollTo(0, 0); toast('Session saved');
  }
  function swapItems(arr, i, j) { if (j < 0 || j >= arr.length) return; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  function arm(key, redo) { if (armed !== key) { armed = key; redo(); setTimeout(function () { if (armed === key) { armed = null; redo(); } }, 3500); return false; } armed = null; return true; }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-tab]'); if (t) { go(t.dataset.tab, true); return; }
    if (ev.target === scrim) { closeSheet(); return; }
    var a = ev.target.closest('[data-act]'); if (!a) return;
    var act = a.dataset.act, d = state.draft, u = a.dataset.u, i = +a.dataset.i, it, e;
    if (['discard', 'delete-session', 'finish', 'ed-reset', 'plan-del', 'custom-del', 'unit', 'copy-restore'].indexOf(act) < 0) armed = null;
    switch (act) {
      case 'start': if (!state.draft) startDraft(a.dataset.key); else toast('Finish or discard the workout in progress first.'); break;
      case 'go-workout': state.ui.wmin = false; if (state.ui.tab !== 'log') go('log', true); else { saveLocal(); render(); window.scrollTo(0, 0); } break;
      case 'wmin': if (wLive()) { state.ui.wmin = true; saveLocal(); render(); window.scrollTo(0, 0); } break;
      case 'palette': state.settings.palette = a.dataset.v; saveSettings(); applyTheme(); render(); settingsSheet(); break;
      case 'clock': clockSheet(); break;
      case 'clock-set': { var v = (document.getElementById('clock-t').value || '').split(':'); if (d && v.length === 2) { var st = new Date(); st.setHours(+v[0], +v[1], 0, 0); if (st.getTime() > Date.now()) st.setDate(st.getDate() - 1); d.startedAt = st.getTime(); touchDraft(true); } closeSheet(); chrome(); break; }
      case 'clock-now': if (d) { d.startedAt = Date.now(); touchDraft(true); } closeSheet(); chrome(); break;
      case 'tick':
        it = findItem(u); if (!it) break; e = exi(it.ex); var s = it.rows[i];
        if (!s.d) {
          var wi = document.getElementById('w-' + u + '-' + i), ri = document.getElementById('r-' + u + '-' + i);
          if (e.sport) {
            /* a run, ride or swim: empty fields take last time's grey numbers, the time as a whole (minutes and seconds together) */
            var di = document.getElementById('d-' + u + '-' + i), si = document.getElementById('s-' + u + '-' + i);
            if (di && !s.dist && di.placeholder) s.dist = di.placeholder;
            if (!s.r && !s.sec) { if (ri && ri.placeholder) s.r = ri.placeholder; if (si && si.placeholder) s.sec = si.placeholder; }
            if (!rowSets({ ex: it.ex, rows: [s] }).length) { if (ri) ri.focus(); break; }
          } else {
            if (wi && !s.w && wi.placeholder) s.w = wi.placeholder;
            if (ri && !s.r && ri.placeholder) s.r = ri.placeholder;
            if (num(s.r) == null) { if (ri) ri.focus(); break; }
          }
          s.d = true; s.pop = true; s.pr = false;
          if (!d.editing) {
            unlockAudio();
            if (freshenDraft(true)) toast('Clock restarted at your first set');
            var one = rowSets({ ex: it.ex, rows: [s] }), best = bestBefore(it.ex, d.id);
            if (one.length && best != null) {
              var cur = best; it.rows.forEach(function (x) { if (x !== s && x.d && x.pr) { var o = rowSets({ ex: it.ex, rows: [x] }); if (o.length) cur = Math.max(cur, metric(e, o)); } });
              s.pr = metric(e, one) > cur + 1e-9;
            }
            var was = it.rec || {}, rc = itemRecords(it, d), news = [];
            if (rc.w && !was.w) news.push('Record weight on ' + e.name + ': ' + fmt(rc.maxW) + ' ' + UW() + '');
            if (rc.v && !was.v) news.push('Record volume on ' + e.name + ': ' + compact(rc.vol) + ' ' + UW() + '');
            if (rc.b && !was.b && e.log !== 'wr') news.push(e.log === 'bw' ? 'Most reps yet on ' + e.name + ': ' + fmt(rc.best) : e.log === 'time' ? 'Longest hold yet on ' + e.name + ': ' + fmt(rc.best) + ' s' : e.sport ? 'Longest ' + e.name.toLowerCase() + ' yet: ' + distText(e, rc.best) : 'Longest ' + e.name + ' yet: ' + fmt(rc.best) + ' min');
            it.recNew = news.length ? { w: rc.w && !was.w, v: rc.v && !was.v, b: rc.b && !was.b } : null;
            it.rec = { w: rc.w, v: rc.v, b: rc.b };
            if (news.length) toast(news.length > 1 ? news.length + ' records on ' + e.name : news[0], true);
            if (s.pr || news.length) { var br = a.getBoundingClientRect(); confetti(news.length ? 34 : 22, br.left + br.width / 2, br.top + br.height / 2); }
            if (state.settings.autoRest && it.restSec >= 30) startRest(it.restSec); else if (it.restSec < 30) stopRest();
          }
        } else { s.d = false; s.pr = false; delete s.rir; if (!d.editing) { var rc2 = itemRecords(it, d); it.rec = { w: rc2.w, v: rc2.v, b: rc2.b }; } }
        var moved = s.d && !d.editing && advance(d, it); if (moved) { delMode = null; noteOpen = null; }
        if (s.d && !d.editing) { tipSeen('t'); state.ui.tips.t = 1; }
        touchDraft(); render(); if (moved && d.cur) showItem(d.cur); break;
      case 'add-set': it = findItem(u); if (it) { var lr = it.rows[it.rows.length - 1]; it.rows.push({ w: lr ? lr.w : '', r: '', d: false }); touchDraft(); render(); } break;
      case 'del-set': delMode = delMode === u ? null : u; if (!scrim.hidden) closeSheet(); render(); break;
      case 'ex-open': it = findItem(u); if (it && d) { d.cur = u; delMode = null; noteOpen = null; touchDraft(); render(); showItem(u); } break;
      case 'note-open': noteOpen = u; render(); var ni = document.getElementById('note-' + u); if (ni) ni.focus(); break;
      case 'warm-plan': { var wr = d && d.key !== 'free' ? getRoutine(d.key) : null; if (wr && wr.warmup) openSheet(head('Warm-up') + (wr.focus ? '<p class="sub">' + esc(wr.focus) + '</p>' : '') + '<p class="sheet-p">' + esc(wr.warmup) + '</p>'); break; }
      case 'notes-go': { var dn = document.getElementById('draft-notes'); if (dn) { dn.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); dn.focus({ preventScroll: true }); } break; }
      case 'del-row': it = findItem(u); if (it) {
        var gone = null, wasW = !!a.dataset.w;
        if (wasW) { if (it.warm) { gone = it.warm.splice(i, 1)[0]; if (!it.warm.length) delete it.warm; } }
        else if (it.rows.length > 1) { gone = it.rows.splice(i, 1)[0]; if (d.timer && d.timer.u === u) d.timer = null; }
        delMode = null; touchDraft(); render();
        if (gone) undoToast('Set removed', function () { var x = findItem(u); if (!x) return; if (wasW) (x.warm = x.warm || []).splice(i, 0, gone); else x.rows.splice(i, 0, gone); touchDraft(); render(); }); } break;
      case 'warm-one': it = findItem(u); if (it) { e = exi(it.ex); var ww = workingWeight(it), sg = ww > 0 ? warmups(ww, e, !warmedUp(it)) : [], wn = (it.warm || []).length, s1 = sg[wn];
        (it.warm = it.warm || []).push({ w: s1 ? fmt(s1.w) : '', r: s1 ? String(s1.r) : '', d: false }); delMode = null; touchDraft(); render(); } break;
      case 'add-ex': openPicker('draft'); break;
      case 'ex-menu': menuSheet(u); break;
      case 'ex-replace': openPicker('replace', { u: u }); break;
      case 'ex-up': case 'ex-down': it = findItem(u); if (it) { var ix = d.items.indexOf(it); swapItems(d.items, ix, ix + (act === 'ex-up' ? -1 : 1)); touchDraft(); closeSheet(); render(); scrollToItem(u); } break;
      case 'ex-remove': it = findItem(u); if (it) { var xi = d.items.indexOf(it), xc = d.cur, xit = it; d.items.splice(xi, 1); if (d.cur === u) d.cur = null; touchDraft(); closeSheet(); render();
        undoToast(exi(xit.ex).name + ' removed', function () { var dd = state.draft; if (!dd) return; dd.items.splice(Math.min(xi, dd.items.length), 0, xit); dd.cur = xc; touchDraft(); render(); }); } break;
      case 'add-this': if (d && !d.editing) { var ni = newItem(a.dataset.ex); d.items.push(ni); touchDraft(); closeSheet(); go('log', true); scrollToItem(ni.u); toast('Added to your workout'); } break;
      case 'finish': if (d && draftCount()) { var p = draftProgress(); if (p.done >= p.all || arm('finish', chrome)) { tipsDone(); finishDraft(); } } break;
      case 'finish-now': if (d && draftCount()) { tipsDone(); finishDraft(); } break;
      case 'discard': if (d) {
        /* one tap, then five seconds to undo. A new workout that had sets also goes to the bin for 30 days. */
        var dd0 = d, kept = !d.editing && draftProgress().done > 0 ? binAdd({ draft: d }) : null;
        state.draft = null; stopRest(); touchDraft(true); applyTheme(); wake(); render(); window.scrollTo(0, 0);
        if (!dd0.editing) undoToast('Workout discarded', function () { if (state.draft) return; if (kept) binTake(kept); state.draft = dd0; state.ui.tab = 'log'; state.ui.wmin = false; touchDraft(true); applyTheme(); wake(); render(); }); } break;
      case 'undo': { var uf = undoFn; undoFn = null; document.getElementById('toast').hidden = true; if (uf) uf(); break; }
      case 'bin-open': binSheet(); break;
      case 'bin-restore': { var bo = binList().filter(function (x) { return String(x.at) === a.dataset.at; })[0]; if (!bo) break;
        if (bo.doc) { state.sessions[bo.doc.id] = bo.doc; bo.doc.updatedAt = Date.now(); binTake(bo); mark('sessions/' + bo.doc.id); render(); if (binList().length) binSheet(); else closeSheet(); toast('Workout restored'); }
        else if (!state.draft) { binTake(bo); state.draft = bo.draft; state.ui.tab = 'log'; state.ui.wmin = false; touchDraft(true); closeSheet(); applyTheme(); wake(); render(); window.scrollTo(0, 0); }
        break; }
      case 'copy-restore': { var cp0 = copyInfo(); if (!cp0) break; if (a.dataset.now || arm('copy', settingsSheet)) { restore(JSON.stringify(cp0.data)); } break; }
      case 'rest-skip': if (d && d.timer) timerStop(false); else stopRest(); break;
      case 'rest-sub':
        /* taking time off: when less than the step is left, the rest simply ends, and a hold or cardio count is logged as it stands */
        if (d && d.timer) { var tm = d.timer, stp = tm.mul === 60 ? 60 : 10, gone = Math.max(0, (Date.now() - tm.start) / 1000); if (tm.total - stp <= gone) { if (gone >= 1) timerStop(false); else tm.total = Math.max(stp, tm.total - stp); } else tm.total -= stp; if (d.timer) touchDraft(true); drawRest(); }
        else if (rest.until) { if (rest.until - Date.now() <= 30000) stopRest(); else { rest.until -= 30000; drawRest(); } }
        break;
      case 'rest-add': if (d && d.timer) { d.timer.total += d.timer.mul === 60 ? 60 : 10; touchDraft(true); drawRest(); } else if (rest.until) { var base = Math.max(rest.until, Date.now()); rest.until = base + 30000; rest.total = Math.max(rest.total + 30, 30); rest.beeped = false; drawRest(); } break;
      case 'open-ex': exSheet(a.dataset.ex, { u: u, rk: a.dataset.rk }); break;
      case 'open-session': sessionSheet(a.dataset.id); break;
      case 'sheet-x': { var wasSummary = !!summary && !picker; closeSheet(); if (wasSummary) summary = null; break; }
      case 'edit-session': { var s2 = state.sessions[a.dataset.id]; if (s2 && !state.draft) { closeSheet(); startDraft(s2.key, s2); } break; }
      case 'delete-session': { var id = a.dataset.id, gd = state.sessions[id]; if (!gd) break;
        var bo2 = binAdd({ doc: gd }); delete state.sessions[id]; mark('sessions/' + id); closeSheet(); render();
        undoToast('Workout deleted', function () { binTake(bo2); state.sessions[id] = gd; gd.updatedAt = Date.now(); mark('sessions/' + id); render(); }); break; }
      case 'settings': settingsSheet(); break;
      case 'theme': state.settings.theme = a.dataset.v; saveSettings(); applyTheme(); render(); settingsSheet(); break;
      case 'block-open': blockSheet(); break;
      case 'block-toggle': state.settings.blockOff = !state.settings.blockOff; saveSettings(); settingsSheet(); render(); break;
      case 'block-plus': { var bp = blockInfo(); state.settings.block = Object.assign({}, state.settings.block, { start: bp.start, plus: !(state.settings.block || {}).plus }); saveSettings(); blockSheet(); break; }
      case 'block-easy': {
        if (wLive() && !state.draft.editing) { toast('Finish or discard the workout in progress first.'); break; }
        var be = blockInfo(); state.settings.block = Object.assign({}, state.settings.block, { start: be.start, easy: a.dataset.v === '1' ? weekStart(today()) : null }); saveSettings(); render(); blockSheet(); break; }
      case 'goal': state.settings.weeklyGoal = Math.max(1, Math.min(7, (state.settings.weeklyGoal || 4) + (+a.dataset.d))); saveSettings(); settingsSheet(); render(); break;
      case 'toggle': state.settings[a.dataset.k] = !state.settings[a.dataset.k]; saveSettings(); if (a.dataset.k === 'sound' && state.settings.sound) { unlockAudio(); beep(); } wake(); if (a.dataset.k === 'rir' || a.dataset.k === 'outCore') render(); settingsSheet(); break;
      case 'backup-save': saveBackupFile(); break;
      case 'save-retry': toast(saveLocal() ? 'Saved' : 'Still not saved. Save a backup file to be safe.'); break;
      case 'lost-retry': location.reload(); break;
      case 'lost-save': saveBackupFile(true); break;
      case 'lost-new': if (!lostArm) { lostArm = true; render(); setTimeout(function () { if (lostArm) { lostArm = false; if (loadFail != null) render(); } }, 3500); } else { lostArm = false; keepRescue(); saveLocal(); render(); window.scrollTo(0, 0); } break;
      case 'backup-later': setBackupInfo({ later: Object.keys(state.sessions).length }); render(); break;
      case 'backup-show': { var bx = document.getElementById('backup-box'); bx.hidden = false; document.getElementById('backup-text').value = JSON.stringify(backupData()); break; }
      case 'backup-copy': { var ta = document.getElementById('backup-text'); try { navigator.clipboard.writeText(ta.value).then(function () { backupDone(); toast('Backup copied'); }, function () { ta.select(); toast('Select all and copy the text'); }); } catch (err) { ta.select(); toast('Select all and copy the text'); } break; }
      case 'backup-restore': restore(document.getElementById('backup-text').value); break;
      case 'prog': state.ui.prog = a.dataset.v; saveLocal(); render(); enter(); break;
      case 'mus-win': state.ui.musWin = a.dataset.v; saveLocal(); render(); enter(); break;
      case 'measure': state.ui.measure = a.dataset.v; saveLocal(); render(); enter(); break;
      case 'pick-lift': openPicker('lift'); break;
      case 'lift':
        if (a.dataset.step) { state.ui.ex = a.dataset.ex; saveLocal(); render(); enter(); var nb = view.querySelector('.lift-nav [data-step="' + a.dataset.step + '"]'); if (nb) nb.focus({ preventScroll: true }); break; }
        state.ui.ex = a.dataset.ex; state.ui.prog = 'lifts'; state.ui.liftView = 'one'; closeSheet(); go('progress', true); break;
      case 'step-open': {
        it = findItem(u); if (!it) break; e = exi(it.ex); histMemo = null;
        var sw = num((it.rows.filter(function (r) { return num(r.w) > 0; })[0] || {}).w), sl = lastEntry(d.key, it.ex, d.id); if (sw == null && sl) sw = workSplit(e, it, sl.sets).W;
        var si = stepInfo(e, it.ex, sw || 20);
        openSheet(head('Weight step', e.name) + '<p class="sheet-p">The next heavier weight is ' + fmt(si.v) + ' ' + UW() + ' up' + (si.by === 'set' ? ', as you set it.' : si.by === 'log' ? ', worked out from the weights you have logged.' : ', the usual step. Set it if this machine or these dumbbells move differently.') + '</p>' +
          '<div class="weigh-form"><label class="field big"><input id="step-in" type="text" inputmode="decimal" autocomplete="off" placeholder="' + fmt(si.v) + '" aria-label="Weight step in ' + UW() + '"><span>' + UW() + '</span></label>' +
          '<button class="btn primary block" type="button" data-act="step-save" data-u="' + u + '">Save</button>' + (si.by === 'set' ? '<button class="btn quiet block" type="button" data-act="step-clear" data-u="' + u + '">Work it out from my log</button>' : '') + '</div>');
        var sin = document.getElementById('step-in'); if (sin) sin.focus(); break; }
      case 'step-save': {
        it = findItem(u); var sv = num(document.getElementById('step-in').value);
        if (!it || sv == null || sv < 0.25 || sv > 50) { toast('Enter a step between 0.25 and 50 ' + UW() + '.'); break; }
        state.settings.steps = state.settings.steps || {}; state.settings.steps[it.ex] = sv; saveSettings(); closeSheet(); render(); toast('Step set to ' + fmt(sv) + ' ' + UW()); break; }
      case 'step-clear': it = findItem(u); if (it && state.settings.steps) { delete state.settings.steps[it.ex]; saveSettings(); closeSheet(); render(); } break;
      case 'weigh-open': {
        var wks = Object.keys(state.body).sort().filter(function (k) { return state.body[k].weight != null; }), wl = wks.length ? state.body[wks[wks.length - 1]].weight : null;
        openSheet(head('Log weight', fmtDate(today())) + '<div class="weigh-form"><label class="field big"><input id="weigh-in" type="text" inputmode="decimal" autocomplete="off" placeholder="' + (wl != null ? fmt(wl) : '') + '" aria-label="Body weight in ' + UW() + '"><span>' + UW() + '</span></label>' +
          '<button class="btn primary block" type="button" data-act="weigh-save">Save</button></div>');
        var wi = document.getElementById('weigh-in'); if (wi) wi.focus(); break; }
      case 'weigh-save': {
        var wv = num(document.getElementById('weigh-in').value), lbw = isLb();
        if (wv == null || wv < (lbw ? 66 : 30) || wv > (lbw ? 550 : 250)) { toast('Enter your weight in ' + UW() + '.'); document.getElementById('weigh-in').focus(); break; }
        var wd = today(); state.body[wd] = Object.assign({}, state.body[wd] || {}, { date: wd, weight: wv, updatedAt: Date.now() }); mark('body/' + wd); closeSheet(); render(); toast('Saved'); break; }
      case 'weigh-body': state.ui.tab = 'progress'; state.ui.prog = 'body'; saveLocal(); render(); window.scrollTo(0, 0); break;
      case 'body-all': bodyAll = !bodyAll; render(); break;
      case 'goal-open': goalSheet(); break;
      case 'sum-all': sumAll = !sumAll; openSummary(); break;
      case 'body-del': delete state.body[a.dataset.id]; mark('body/' + a.dataset.id); render(); break;
      case 'lib': state.ui.lib = a.dataset.key; saveLocal(); render(); break;
      case 'pick-group': if (picker) { picker.group = a.dataset.key; pickerSheet(); } break;
      case 'pick': pickExercise(a.dataset.ex); break;
      case 'create-ex': picker = { mode: 'create', creating: true, q: libQ, group: GROUPS.indexOf(state.ui.lib) >= 0 ? state.ui.lib : 'Chest' }; pickerSheet(); break;
      case 'cx-new': if (picker) { picker.creating = true; if (GROUPS.indexOf(picker.group) < 0) picker.group = 'Chest'; pickerSheet(); } break;
      case 'cx-back': if (picker && picker.mode !== 'create') { picker.creating = false; picker.group = 'all'; pickerSheet(); } else closeSheet(); break;
      case 'cx-save': {
        var nm = (document.getElementById('cx-name').value || '').trim(); if (!nm) { document.getElementById('cx-name').focus(); break; }
        var cid = 'c' + uid(), mode = picker && picker.mode;
        state.custom[cid] = { id: cid, name: nm, group: document.getElementById('cx-group').value, kind: document.getElementById('cx-kind').value, cue: (document.getElementById('cx-cue').value || '').trim(), createdAt: Date.now(), updatedAt: Date.now() };
        CAT = null; mark('exercises/' + cid);
        if (mode && mode !== 'create') { picker.creating = false; pickExercise(cid); if (picker && picker.mode === 'editor') { picker.q = ''; picker.group = 'all'; pickerSheet(); } }
        else { closeSheet(); libQ = ''; render(); toast('Exercise saved'); }
        break;
      }
      case 'custom-del': { var cx = a.dataset.ex; if (arm('cdel' + cx, function () { if (!scrim.hidden) exSheet(cx); })) { delete state.custom[cx]; CAT = null; mark('exercises/' + cx); closeSheet(); render(); } break; }
      case 'ed-new': openEditor(null); break;
      case 'ed-open': openEditor(a.dataset.key); break;
      case 'ed-cancel': editor = null; render(); window.scrollTo(0, 0); break;
      case 'ed-add': openPicker('editor'); break;
      case 'ed-up': swapItems(editor.items, i, i - 1); render(); break;
      case 'ed-down': swapItems(editor.items, i, i + 1); render(); break;
      case 'ed-del': editor.items.splice(i, 1); render(); break;
      case 'ed-sets': editor.items[i].sets = Math.max(1, Math.min(10, editor.items[i].sets + (+a.dataset.d))); render(); break;
      case 'ed-save': saveEditor(); break;
      case 'ed-reset': if (arm('ed-reset', render)) { delete state.routines[editor.id]; mark('routines/' + editor.id); editor = null; render(); toast('Back to the original plan'); } break;
      case 'ed-remove': planRemove(editor.id); editor = null; planEdit = true; render(); window.scrollTo(0, 0); toast('Removed from your plan'); break;
      case 'lift-mode': state.ui.liftMode = a.dataset.v; saveLocal(); render(); enter(); break;
      case 'lift-sets': state.ui.liftSets = a.dataset.v; saveLocal(); render(); enter(); break;
      case 'lift-view': state.ui.liftView = a.dataset.v; saveLocal(); render(); enter(); break;
      case 'lift-grp': state.ui.liftGrp = a.dataset.v; saveLocal(); render(); enter(); break;
      case 'lift-pct': state.ui.liftPct = !state.ui.liftPct; saveLocal(); render(); enter(); break;
      case 'lift-line': liftLine(a.dataset.g, a.dataset.ex); break;
      case 'pb-week': pbWeek = pbWeek === a.dataset.v ? null : a.dataset.v; render(); break;
      case 'pb-grp': state.ui.pbGrp = a.dataset.v; pbAll = false; saveLocal(); render(); break;
      case 'pb-sort': state.ui.pbSort = a.dataset.v; saveLocal(); render(); break;
      case 'pb-all': pbAll = !pbAll; render(); break;
      case 'lift-info': liftInfo = !liftInfo; render(); break;
      case 'trend-info': trendInfo = !trendInfo; render(); break;
      case 'trend': state.ui.trend = a.dataset.v; saveLocal(); render(); enter(); break;
      case 'mus-all': musAll = !musAll; render(); break;
      case 'att-open': attOpen[a.dataset.id] = !attOpen[a.dataset.id]; render(); break;
      case 'ms-open': msSheet(+a.dataset.i); break;
      case 'sport': state.ui.sport = a.dataset.v; saveLocal(); render(); enter(); break;
      case 'rir': it = findItem(u); if (it && it.rows[i]) { it.rows[i].rir = +a.dataset.v; touchDraft(); render(); } break;
      case 'timer': if (d && d.timer && d.timer.u === u && d.timer.i === i) timerStop(false); else timerStart(u, i); break;
      case 'help-open': helpSheet(u); break;
      case 'help-step': if (help) { it = findItem(help.u); if (it) { e = exi(it.ex); var hs = stepInfo(e, it.ex, help.w || 0).v; help.w = Math.max(0, roundTo((help.w || 0) + (+a.dataset.d) * hs, hs)); document.getElementById('help-w').value = fmt(help.w); document.getElementById('help-body').innerHTML = helpBody(); } } break;
      case 'help-bar': if (help) { it = findItem(help.u); if (it) { state.settings.bars = state.settings.bars || {}; state.settings.bars[it.ex] = +a.dataset.v; saveSettings(); document.getElementById('help-body').innerHTML = helpBody(); } } break;
      case 'warm-add': if (help) { it = findItem(help.u); if (it && help.w > 0) { it.warm = warmups(help.w, exi(it.ex), help.full).map(function (x) { return { w: fmt(x.w), r: String(x.r), d: false }; }); touchDraft(); closeSheet(); render(); toast(it.warm.length > 1 ? 'Warm-up sets added above set 1.' : 'Warm-up set added above set 1.'); } } break;
      case 'warm-clear': if (help) { it = findItem(help.u); if (it) { delete it.warm; touchDraft(); closeSheet(); render(); } } break;
      case 'wtick': it = findItem(u); if (it && it.warm && it.warm[+a.dataset.i]) { var wr0 = it.warm[+a.dataset.i]; if (!wr0.d && !(num(wr0.r) > 0)) { toast('Type the reps first.'); break; } wr0.d = !wr0.d; if (wr0.d) { unlockAudio(); freshenDraft(true); } touchDraft(); render(); } break;
      case 'help-ramp': if (help) { help.full = !help.full; document.getElementById('help-body').innerHTML = helpBody(); } break;
      case 'swap-open': swapSheet(u); break;
      case 'swap-pick': { var sn = swapItem(u, a.dataset.ex); if (sn) { closeSheet(); render(); scrollToItem(sn.u); toast('Swapped in ' + exi(sn.ex).name); } break; }
      case 'setup-unit': setupState().unit = a.dataset.v === 'lb' ? 'lb' : 'kg'; render(); break;
      case 'setup-days': { var sd = setupState(); sd.days = Math.max(2, Math.min(6, +a.dataset.v)); if (!sd.picked) sd.tpl = templateFor(sd.days); render(); break; }
      case 'setup-tpl': { var st3 = setupState(); st3.tpl = a.dataset.v; st3.picked = true; render(); break; }
      case 'setup-go': finishSetup(); render(); enter(); window.scrollTo(0, 0); toast('You are set. Start your first workout when you are ready.'); break;
      case 'tpl-open': templateSheet(); break;
      case 'tpl-apply': { var tp = template(a.dataset.v); if (tp) { applyTemplate(tp.id, state.settings.weeklyGoal || 4); saveSettings(); closeSheet(); planEdit = false; render(); window.scrollTo(0, 0); toast('Your plan is now ' + tp.name); } break; }
      case 'unit': {
        var to = a.dataset.v === 'lb' ? 'lb' : 'kg'; if (to === (isLb() ? 'lb' : 'kg')) { armed = null; settingsSheet(); break; }
        var nothing = !Object.keys(state.sessions).length && !Object.keys(state.body).length && !state.draft;
        if (nothing || arm('unit', function () { if (!scrim.hidden && document.querySelector('[data-act="unit"]')) settingsSheet(); })) {
          if (state.draft) { toast('Finish or discard the workout in progress first.'); settingsSheet(); break; }
          convertUnits(to); CAT = null; render(); settingsSheet(); toast(to === 'lb' ? 'Now in pounds and inches' : 'Now in kilograms and centimetres');
        }
        break;
      }
      case 'lib3': state.ui.lib3 = a.dataset.v; saveLocal(); render(); break;
      case 'hist-prev': histShift(-1); render(); break;
      case 'hist-next': histShift(1); render(); break;
      case 'hist-day': { histDay = histDay === a.dataset.d ? null : a.dataset.d; histOpen = {}; render(); var hc = document.getElementById('hist-list'); if (histDay && hc && hc.scrollIntoView) hc.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); break; }
      case 'hist-open': { var ho = a.getAttribute('aria-expanded') === 'true', hb2 = document.getElementById('hist-body'); histOpen[a.dataset.id] = !ho; if (hb2) hb2.innerHTML = histBody(); break; }
      case 'hist-more': { histN += 10; var hb3 = document.getElementById('hist-body'); if (hb3) hb3.innerHTML = histBody(); break; }
      case 'hist-search': { histSearch = !histSearch; if (!histSearch) histQ = ''; render(); if (histSearch) { var hq = document.getElementById('hist-q'); if (hq) hq.focus(); } break; }
      case 'out-edit': outEdit = a.dataset.v === '1'; render(); break;
      case 'out-move': { var ot = outList().slice(), oi = +a.dataset.i, oj = oi + (+a.dataset.d); if (oj >= 0 && oj < ot.length) { var ox = ot[oi]; ot[oi] = ot[oj]; ot[oj] = ox; setOutTiles(ot); render(); } break; }
      case 'out-del': { var od = outList().slice(); od.splice(+a.dataset.i, 1); setOutTiles(od); render(); break; }
      case 'out-swap': openPicker('tile', { i: +a.dataset.i }); break;
      case 'out-add': openPicker('tile', { i: -1 }); break;
      case 'again': { var sa = state.sessions[a.dataset.id]; if (!sa) break; if (state.draft) { toast('Finish or discard the workout in progress first.'); break; } closeSheet(); repeatDraft(sa); break; }
      case 'recap-x': state.ui.recapSeen = weekStart(today()); saveLocal(); render(); break;
      case 'plan-edit': planEdit = true; render(); break;
      case 'plan-done': planEdit = false; render(); break;
      case 'plan-up': planMove(a.dataset.key, -1); render(); break;
      case 'plan-down': planMove(a.dataset.key, 1); render(); break;
      case 'plan-off': planRemove(a.dataset.key); render(); break;
      case 'plan-on': planRestore(a.dataset.key); render(); break;
      case 'plan-del': { var pk = a.dataset.key; if (arm('pdel' + pk, render)) { delete state.routines[pk]; mark('routines/' + pk); render(); toast('Session deleted'); } break; }
      case 'sum-update': case 'sum-save': {
        var sm = summary; if (!sm) break;
        var old = sm.key !== 'free' ? getRoutine(sm.key) : null, rich = {};
        if (old) old.items.forEach(function (x) { rich[x.ex] = x; });
        var items = sm.items.map(function (x) { var o = Object.assign({}, x), r0 = rich[x.ex]; if (r0) ['rir', 'cue', 'why', 'swap', 'detail'].forEach(function (k) { if (r0[k]) o[k] = r0[k]; }); return o; });
        if (act === 'sum-update' && old) saveRoutine({ id: old.id, name: old.name, focus: old.focus || '', core: old.core !== false, warmup: old.warmup || '', createdAt: old.createdAt || Date.now(), items: items });
        else { var rid = 'r' + uid(), nm2 = sm.name && sm.name !== 'Workout' ? sm.name : 'My session'; saveRoutine({ id: rid, name: nm2, focus: '', core: true, warmup: '', createdAt: Date.now(), items: items }); if (state.sessions[sm.id]) { state.sessions[sm.id].key = rid; state.sessions[sm.id].name = nm2; mark('sessions/' + sm.id); } sm.name = nm2; }
        sm.offer = null; render(); openSummary(); toast(act === 'sum-update' ? 'Session updated' : 'Saved to your plan');
        break;
      }
    }
  });
  document.addEventListener('input', function (ev) {
    var el = ev.target, d = state.draft;
    if (el.id === 'lib-q') {
      libQ = el.value; var box = document.getElementById('lib-list');
      if (box && state.ui.lib !== 'mine') box.innerHTML = libRows(state.ui.lib, libQ, null);
      else { render(); var again = document.getElementById('lib-q'); if (again) { again.focus(); try { again.setSelectionRange(libQ.length, libQ.length); } catch (e) {} } }
      return;
    }
    if (el.id === 'help-w' && help) { help.w = num(el.value); document.getElementById('help-body').innerHTML = helpBody(); return; }
    if (el.id === 'hist-q') { histQ = el.value; var hb = document.getElementById('hist-body'); if (hb) hb.innerHTML = histBody(); return; }
    if (el.id === 'pick-q' && picker) { picker.q = el.value; document.getElementById('pick-list').innerHTML = libRows(picker.group, picker.q, picker.mode); return; }
    if (editor && el.id === 'ed-name') { editor.name = el.value; return; }
    if (editor && el.id === 'ed-focus') { editor.focus = el.value; return; }
    if (editor && el.dataset && el.dataset.ed && (el.dataset.ed === 'lo' || el.dataset.ed === 'hi')) { editor.items[+el.dataset.i][el.dataset.ed] = el.value; return; }
    if (!d) return;
    if (el.dataset.wf) { var wit = findItem(el.dataset.u); if (wit && wit.warm && wit.warm[+el.dataset.i]) { wit.warm[+el.dataset.i][el.dataset.wf] = el.value; touchDraft(); } return; }
    if (el.id === 'draft-name') { d.name = el.value; document.getElementById('wbar-name').textContent = d.name || 'Workout'; touchDraft(); return; }
    if (!el.dataset || !el.dataset.f) return;
    var f = el.dataset.f;
    if (f === 'notes') d.notes = el.value;
    else { var it = findItem(el.dataset.u); if (!it) return; if (f === 'note') it.note = el.value; else { it.rows[+el.dataset.i][f] = el.value; var pe = document.getElementById('p-' + el.dataset.u + '-' + el.dataset.i); if (pe) { var se = exi(it.ex), so = rowSets({ ex: it.ex, rows: [it.rows[+el.dataset.i]] }), pt = so.length && so[0].dist ? paceText(se, so[0].dist, so[0].r) : ''; pe.textContent = pt ? 'Pace ' + pt : ''; } var n = draftCount(), fb = document.getElementById('finish-btn'), wf = document.getElementById('wbar-fin'); if (fb) fb.disabled = !n; if (wf) wf.disabled = !n; } }
    touchDraft();
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.id === 'block-start' && el.value && el.value <= today()) { state.settings.block = Object.assign({}, state.settings.block, { start: weekStart(el.value), easy: null }); saveSettings(); render(); blockSheet(); return; }
    if (el.id === 'draft-date' && state.draft && el.value) { state.draft.date = el.value; state.draft.dateSet = true; touchDraft(); }
    if (el.id === 'draft-dur' && state.draft && state.draft.editing) { var mins = num(el.value); state.draft.dur = mins > 0 ? Math.round(Math.min(600, mins) * 60) : null; touchDraft(); }
    if (editor && el.id === 'ed-core') editor.core = el.checked;
    if (editor && el.dataset && el.dataset.ed === 'restSec') editor.items[+el.dataset.i].restSec = +el.value;
    if (editor && el.dataset && el.dataset.ed === 'link') { editor.items[+el.dataset.i].link = el.checked; render(); }
    if (el.id === 'set-goalw') { var g = num(el.value); state.settings.goalWeight = g != null && g >= (isLb() ? 66 : 30) && g <= (isLb() ? 550 : 250) ? g : null; saveSettings(); render(); }
    if (el.id === 'set-goalr') { var gr = num(el.value); state.settings.goalRate = gr != null && gr >= 0.05 && gr <= (isLb() ? 3.5 : 1.5) ? gr : (isLb() ? 0.5 : 0.25); saveSettings(); render(); }
    if (el.id === 'backup-file' && el.files && el.files[0]) { var fr = new FileReader(); fr.onload = function () { restore(String(fr.result || '')); }; fr.readAsText(el.files[0]); }
  });
  document.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (ev.target.id !== 'body-form') return;
    var dt = document.getElementById('bw-d').value || today(), rec = Object.assign({}, state.body[dt] || {}, { date: dt, updatedAt: Date.now() }), any = false;
    var lb = isLb();
    measures().forEach(function (m) { var v = num(document.getElementById('bw-' + m[0]).value); if (v == null) return; if (m[0] === 'weight' ? (v >= (lb ? 66 : 30) && v <= (lb ? 550 : 250)) : (v >= (lb ? 4 : 10) && v <= (lb ? 100 : 250))) { rec[m[0]] = v; any = true; } });
    if (!any) { document.getElementById('bw-weight').focus(); toast('Enter at least one measurement.'); return; }
    state.body[dt] = rec; mark('body/' + dt); render(); toast('Saved');
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !scrim.hidden) { closeSheet(); summary = null; } });
  window.addEventListener('hashchange', fromHash);
  var rz, lastW = window.innerWidth;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (window.innerWidth !== lastW && state.ui.tab === 'progress' && !isTyping()) { lastW = window.innerWidth; render(); } }, 200); });
  var lastPull = Date.now();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && db && Date.now() - lastPull > 5 * 60000) { lastPull = Date.now(); pullRemote(); }
    if (!document.hidden) applyTod();
    if (!document.hidden) { if (freshenDraft() && !isTyping()) render(); flushDirty(); tickClock(); drawRest(); }
    wake();
  });
  if (window.matchMedia) { try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { applyTheme(); if (!isTyping()) render(); }); } catch (e) {} }

  /* ================= boot ================= */
  state.draft = migrateDraft(state.draft);
  var h0 = (location.hash || '').replace('#', '');
  if (h0 === 'log' || h0 === 'progress' || h0 === 'exercises') state.ui.tab = h0;
  else if (state.draft) state.ui.tab = 'log';
  applyTheme();
  setInterval(applyTod, 60000);
  freshenDraft();
  render();
  enter();
  refreshSync();
  if (syncSettled) weeklyCopy();
  connect();
  wake();
  setInterval(tickClock, 1000);
  setInterval(drawRest, 250);
  if (STANDALONE) {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    if ('serviceWorker' in navigator) {
      var hadSw = !!navigator.serviceWorker.controller;
      /* a new version has been downloaded: load it straight away unless that would interrupt something */
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!hadSw) { hadSw = true; return; }
        if (!state.draft && !editor && scrim.hidden && !isTyping()) location.reload();
        else toast('Update downloaded. It loads the next time you open the app.');
      });
      window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
    }
  }
})();
