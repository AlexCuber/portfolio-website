
  /* ================= small pieces ================= */
  var view = document.getElementById('view');
  var IC = {
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2.6-1.5L14 2.6h-4l-.5 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3 1 2-3.4z"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10l6 6 6-6"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.1 6.6 20l1.1-6.1L3.2 9.6l6.1-.8z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.6 3.2 2.3 4.6 3.7 6.3 1.3 1.6 2.3 3.3 2.3 5.5a6 6 0 0 1-12 0c0-1.7.6-3.1 1.6-4.3.3 1.3 1 2.1 2 2.5-.6-3.3.3-7 2.4-10z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>',
    target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/></svg>',
    weight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 20h11l1.5-9h-14z"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
    swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h13l-3.2-3.2M19 16H6l3.2 3.2"/></svg>',
    bar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5v5M6.5 7v10M17.5 7v10M21 9.5v5M6.5 12h11"/></svg>'
  };
  function illoSvg(key, t, live, wide) { return '<svg viewBox="' + (wide ? '-20 0 160 120' : '0 0 120 120') + '" aria-hidden="true"' + (key.indexOf('out-') === 0 ? ' class="out"' : '') + (live ? ' data-illo="' + esc(key) + '"' : '') + '>' + ILLO.render(key, t == null ? ILLO.restT(key) : t) + '</svg>'; }
  function muscleNames(e, mainOnly) {
    var out = []; LIBRARY.MUSCLES.forEach(function (m) { var v = e.muscles[m.id]; if (v && (!mainOnly || v >= 1)) out.push(m.name); });
    return out;
  }
  function exSub(e) { var m = muscleNames(e, true); return [e.equip, m.length ? m.join(', ') : (e.group === 'Cardio' ? 'Cardio' : '')].filter(Boolean).join(' · '); }
  function targetOf(it, e) {
    if (e.log === 'cardio') return repsText(it, e);
    var rest = it.link ? 'then next' : (it.rest || restText(it.restSec));
    return (it.sets + ' × ' + repsText(it, e) + (it.rir && it.rir !== '—' ? ' · RIR ' + it.rir : '') + (rest && rest !== '—' ? (/^then/.test(rest) ? ' · ' : ' · rest ') + rest : '')).replace(/–/g, '-');
  }
  /* the same line for the workout card, where it must stay on one line: on a narrow phone the word "rest" is dropped */
  function targetHtml(it, e) { return esc(targetOf(it, e)).replace(' · rest ', ' · <span class="xs-hide">rest </span>'); }
  function toast(msg, rec) {
    var el = document.getElementById('toast'); el.textContent = msg; el.className = 'toast' + (rec ? ' rec' : ''); el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, rec ? 3400 : 2600);
  }
  /* ================= top bars ================= */
  var DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  /* The workout's progress: one thin bar, sets done out of all sets. The fill is kept between draws so its width
     can ease and its colours keep flowing. A light sweeps across when it grows, and it flashes orange once when
     the set just ticked is a record. Nothing plays on the first draw of a workout or after a reload. */
  var progSeen = null;
  function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function drawProg(d, p) {
    var box = document.getElementById('wbar-prog'), f = box.querySelector('.wp-fill'), prs = 0, key = d.id || d.startedAt || d.key || 'w';
    d.items.forEach(function (it) { it.rows.forEach(function (r) { if (r.d && r.pr) prs++; }); });
    if (!f) { box.innerHTML = '<b class="wp-track"><i class="wp-fill"></i></b>'; f = box.querySelector('.wp-fill'); progSeen = null; }
    var pct = p.all ? Math.round(p.done / p.all * 1000) / 10 : 0, old = progSeen && progSeen.key === key ? progSeen : null;
    if (!old) { f.classList.remove('wp-sweep', 'wp-rec'); f.style.transition = 'none'; f.style.width = pct + '%'; void f.offsetWidth; f.style.transition = ''; }
    else {
      f.style.width = pct + '%';
      if (prs > old.prs) replay(f, 'wp-rec'); else if (p.done > old.done) replay(f, 'wp-sweep');
    }
    progSeen = { key: key, done: p.done, prs: prs };
  }
  function chrome() {
    var d = state.draft, live = wLive() && !state.ui.wmin && state.ui.tab === 'log' && !editor, bar = document.getElementById('bar'), wbar = document.getElementById('wbar'), tab = state.ui.tab, now = new Date();
    bar.hidden = !!live; wbar.hidden = !live;
    if (document.body.classList.contains('setup')) { document.getElementById('bar-title').textContent = 'Hitit'; document.getElementById('bar-date').textContent = loadFail != null && syncSettled ? '' : 'Welcome'; return; }
    document.getElementById('bar-title').textContent = tab === 'progress' ? 'Progress' : tab === 'exercises' ? (state.ui.lib3 === 'exercises' ? 'Exercises' : 'History') : DAYS_FULL[now.getDay()];
    document.getElementById('bar-date').textContent = tab === 'progress' ? plural(Object.keys(state.sessions).length, 'workout') + ' logged' : tab === 'exercises' ? (state.ui.lib3 === 'exercises' ? allEx().length + ' exercises' : plural(Object.keys(state.sessions).length, 'workout')) : now.getDate() + ' ' + MONTHS_FULL[now.getMonth()];
    if (!live) return;
    var p = draftProgress();
    document.getElementById('wbar-name').textContent = d.name || 'Workout';
    document.getElementById('wbar-sub').textContent = p.done + ' of ' + p.all + ' sets done';
    drawProg(d, p);
    var fin = document.getElementById('wbar-fin'); fin.disabled = !draftCount(); fin.textContent = armed === 'finish' ? 'Sure?' : 'Finish';
    tickClock();
  }
  function tickClock() { var d = state.draft, el = document.getElementById('wbar-clock'); if (d && !d.editing && el) el.textContent = fmtClock((Date.now() - d.startedAt) / 1000); }

  /* ================= log tab: home ================= */
  function initials(name) { var w = shortName(name).trim().split(/\s+/); return (w.length > 1 ? w[0].charAt(0) + w[1].charAt(0) : w[0].slice(0, 2)).toUpperCase(); }
  /* two letters per session in the plan, told apart when names start alike (Full body A, B, C; Push, Pull) */
  function sessInitials() {
    var m = {}, seen = {};
    routineList().forEach(function (r) {
      var nm = shortName(r.name).trim(), w = nm.split(/\s+/), base = initials(nm), c = [];
      if (w.length > 2 && w[w.length - 1].length === 1) c.push((w[0].charAt(0) + w[w.length - 1]).toUpperCase());
      c.push(base);
      if (w[0].length > 2) c.push((w[0].charAt(0) + w[0].charAt(2)).toUpperCase(), (w[0].charAt(0) + w[0].charAt(w[0].length - 1)).toUpperCase());
      var pick = c.filter(function (x) { return !seen[x]; })[0] || base; seen[pick] = 1; m[r.id] = pick;
    });
    Object.keys(OUT).forEach(function (k) { m[k] = OUT[k].ini; });
    return m;
  }
  function weekCard(f) {
    var ws = weekStart(today()), goal = state.settings.weeklyGoal || 4, h = '', n = 0, letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    for (var i = 0; i < 7; i++) {
      var dt = addDays(ws, i), day = f.filter(function (s) { return s.date === dt; });
      n += day.filter(isCore).length;
      h += '<div class="day' + (day.length ? ' done' : '') + (day.length && day.every(allSport) ? ' out' : '') + (dt === today() ? ' today' : '') + '"><i>' + (day.length ? IC.check : '') + '</i>' + letters[i] + '</div>';
    }
    var st = streakWeeks(f), bi = routineList().length ? blockInfo() : null;
    return '<section class="card"><div class="week"><div class="days" role="img" aria-label="' + n + ' of ' + goal + ' sessions done this week">' + h + '</div>' +
      '<div class="week-n' + (n >= goal ? ' hit' : '') + '" aria-hidden="true"><b>' + n + '<i>/' + goal + '</i></b><span>this week</span></div></div>' +
      (st >= 2 || bi ? '<div class="pills">' + (bi ? '<button class="pill blk' + (bi.easy ? ' easy' : '') + '" type="button" data-act="block-open">Week ' + bi.week + ' of ' + bi.weeks + ' · ' + bi.name + '</button>' : '') + (st >= 2 ? '<span class="pill hot">' + IC.flame + st + ' weeks in a row</span>' : '') + '</div>' : '') + '</section>';
  }
  /* Train: a slim strip for the weigh-in (T3, N4). It appears once a weight or a goal weight exists, goes when today is
     logged, and says so when the last weigh-in is four days old or the waist two weeks old (the plan's own rhythm). */
  function weighStrip() {
    var b = state.body, ks = Object.keys(b).sort(), wk = ks.filter(function (k) { return b[k].weight != null; }), ck = ks.filter(function (k) { return b[k].waist != null; });
    if (!wk.length && state.settings.goalWeight == null) return '';
    var td = today(), done = !!(b[td] && b[td].weight != null), last = wk[wk.length - 1], age = last ? Math.round((toDate(td) - toDate(last)) / 864e5) : null;
    var wAge = ck.length ? Math.round((toDate(td) - toDate(ck[ck.length - 1])) / 864e5) : null, wDue = wAge != null && wAge >= 14, h = '';
    if (done && !wDue) return '';
    if (!done) {
      var from = addDays(td, -6), wk7 = wk.filter(function (k) { return k >= from; }), avg = wk7.length ? Math.round(wk7.reduce(function (a, k) { return a + b[k].weight; }, 0) / wk7.length * 10) / 10 : null;
      var late = age != null && age >= 4;
      h += '<div class="weigh-row"><span class="weigh-t">' + (last ? '<b>' + fmt(avg != null ? avg : b[last].weight) + ' ' + UW() + '</b>' : '<b>Weight</b>') +
        '<small' + (late ? ' class="late"' : '') + '>' + (late ? 'last weighed ' + age + ' days ago' : avg != null ? '7-day average' : last ? fmtDate(last) : 'no weigh-in yet') + '</small></span>' +
        '<button class="act" type="button" data-act="weigh-open">Log weight</button></div>';
    }
    if (wDue) h += '<div class="weigh-row"><span class="weigh-t"><b>Waist</b><small class="late">measured ' + wAge + ' days ago</small></span><button class="act" type="button" data-act="weigh-body">Measure</button></div>';
    return '<section class="card weigh">' + h + '</section>';
  }
  var planEdit = false;
  function planCard() {
    var list = routineList(), h = '', ini = sessInitials();
    if (!planEdit) {
      var nk = wLive() ? null : nextKey(), rest = list.filter(function (x) { return x.id !== nk; });
      h += '<section class="card"><div class="plan-head"><div><h3>' + (nk && list.length > rest.length ? 'Other sessions' : 'Your plan') + '</h3></div><button class="btn quiet" type="button" data-act="plan-edit">Edit</button></div>';
      if (!list.length) return h + '<p class="empty">Your plan is empty. Tap Edit to bring a session back or build a new one.</p></section>';
      if (!rest.length) return h + '</section>';
      h += '<div class="sess-row">';
      list.forEach(function (x, i) {
        if (x.id === nk) return;
        var l = lastDone(x.id);
        h += '<button class="sess" type="button" data-act="start" data-key="' + esc(x.id) + '"><span class="avatar av' + (i % 5) + '" aria-hidden="true">' + esc(ini[x.id] || initials(x.name)) + '</span><b>' + esc(shortName(x.name)) + '</b><small>' + (l ? fmtDate(l.date, true) : '&nbsp;') + '</small></button>';
      });
      return h + '</div></section>';
    }
    var off = offList();
    h += '<section class="card"><div class="plan-head"><div><h3>Your plan</h3><p class="sub">Put the sessions in the order you train them. Next up follows this order.</p></div><button class="btn quiet" type="button" data-act="plan-done">Done</button></div>';
    if (list.length) {
      h += '<ul class="list">';
      list.forEach(function (x, i) {
        var k = esc(x.id), nm = esc(x.name);
        h += '<li class="plan-row"><span class="plan-n" aria-hidden="true">' + (i + 1) + '</span><span class="txt"><b>' + nm + '</b><small>' + plural(rStats(x).n, 'exercise') + (x.core === false ? ' · extra' : '') + '</small></span><span class="mini">' +
          '<button class="icon-btn" type="button" data-act="ed-open" data-key="' + k + '" aria-label="Edit ' + nm + '">' + IC.edit + '</button>' +
          '<button class="icon-btn" type="button" data-act="plan-up" data-key="' + k + '" aria-label="Move ' + nm + ' up"' + (i ? '' : ' disabled') + '>' + IC.up + '</button>' +
          '<button class="icon-btn" type="button" data-act="plan-down" data-key="' + k + '" aria-label="Move ' + nm + ' down"' + (i < list.length - 1 ? '' : ' disabled') + '>' + IC.down + '</button>' +
          '<button class="icon-btn" type="button" data-act="plan-off" data-key="' + k + '" aria-label="Remove ' + nm + ' from the plan">' + IC.x + '</button></span></li>';
      });
      h += '</ul>';
    } else h += '<p class="empty">Nothing in the plan yet.</p>';
    h += '<button class="add-ex" type="button" data-act="ed-new">+ Add a session</button><button class="btn quiet" type="button" data-act="tpl-open">Start from a template</button>';
    if (off.length) {
      h += '<p class="sec-title">Not in the plan</p><ul class="list">';
      off.forEach(function (x) {
        var k = esc(x.id), own = BUILTIN.indexOf(x.id) < 0;
        h += '<li class="plan-row"><span class="txt"><b>' + esc(x.name) + '</b><small>' + plural(rStats(x).n, 'exercise') + '</small></span><span class="mini">' +
          (own ? '<button class="btn sm quiet danger" type="button" data-act="plan-del" data-key="' + k + '">' + (armed === 'pdel' + x.id ? 'Tap again' : 'Delete') + '</button>' : '') +
          '<button class="btn sm" type="button" data-act="plan-on" data-key="' + k + '">Add back</button></span></li>';
      });
      h += '</ul><p class="foot">Workouts you logged with a session stay in your history either way.</p>';
    }
    return h + '</section>';
  }
  function homeView() {
    var key = nextKey(), r = key ? getRoutine(key) : null, f = finished(), h = weekCard(f) + (planEdit ? '' : recapCard(f));
    if (wLive()) {
      var dp = draftProgress();
      h += '<section class="card next"><div class="spread"><span class="label">In progress</span><span class="next-last">' + dp.done + ' of ' + dp.all + ' sets done</span></div>' +
        '<div><div class="next-title">' + esc(state.draft.name || 'Workout') + '</div></div>' +
        '<button class="btn start block" type="button" data-act="go-workout">' + IC.play + 'Back to the workout</button></section>';
    } else if (r) {
      var st = rStats(r), ld = lastDone(key), seen = {}, strip = '';
      r.items.forEach(function (it) { var k = exi(it.ex).illo; if (seen[k] || Object.keys(seen).length >= 5) return; seen[k] = 1; strip += '<div class="illo">' + illoSvg(k, null, true) + '</div>'; });
      h += '<section class="card next"><div class="spread"><span class="label">Next up</span><span class="next-last">' + (ld ? 'last done ' + fmtDate(ld.date) : '') + '</span></div>' +
        '<div><div class="next-title">' + esc(shortName(r.name)) + '</div>' + (r.focus ? '<p class="sub">' + esc(r.focus) + '</p>' : '') + '</div>' +
        (strip ? '<div class="strip">' + strip + '</div>' : '') +
        '<p class="next-meta">' + plural(st.n, 'exercise') + (st.sets ? ' · ' + st.sets + ' sets' : '') + ' · about ' + st.minutes + ' min</p>' +
        '<button class="btn start block" type="button" data-act="start" data-key="' + esc(key) + '">' + IC.play + 'Start ' + esc(shortName(r.name)) + '</button></section>';
    }
    var bk = STANDALONE && !planEdit ? backupState() : null;
    if (bk && bk.due) h += '<section class="card backup-card"><div><h3>Back up your log</h3><p class="sub">' + (bk.at ? plural(bk.fresh, 'workout') + ' since your last backup on ' + fmtDate(iso(new Date(bk.at))) + '.' : 'Your ' + plural(bk.n, 'workout') + ' are stored on this phone only.') + ' A backup file lets you bring everything back if the app is removed or the phone is reset.</p></div>' +
      '<div class="row"><button class="btn sm primary-sm" type="button" data-act="backup-save">Save backup file</button><button class="btn sm quiet" type="button" data-act="backup-later">Later</button></div></section>';
    if (!planEdit) h += weighStrip();
    h += planCard();
    if (!planEdit) h += outCard(f);
    h += '<div class="train-more"><button class="act" type="button" data-act="ed-new">' + IC.plus + 'New session</button><button class="act" type="button" data-act="start" data-key="free">' + IC.bolt + 'Empty workout</button></div>';
    return h;
  }
  /* ================= log tab: session editor ================= */
  var RESTS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
  function editorView() {
    var ed = editor, h = '<section class="draft-head"><div class="spread"><h2>' + (ed.isNew ? 'New session' : 'Edit session') + '</h2><button class="btn quiet" type="button" data-act="ed-cancel">Cancel</button></div>' +
      '<label class="fld">Name<input id="ed-name" type="text" maxlength="40" autocomplete="off" value="' + esc(ed.name) + '" placeholder="Push day, Arms, Full body…"></label>' +
      '<label class="fld">Focus or note (optional)<input id="ed-focus" type="text" maxlength="80" autocomplete="off" value="' + esc(ed.focus) + '"></label>' +
      '<label class="check"><input type="checkbox" id="ed-core"' + (ed.core ? ' checked' : '') + '> Counts toward my weekly goal</label></section>';
    if (!ed.items.length) h += '<p class="empty">No exercises yet. Add the first one below.</p>';
    ed.items.forEach(function (it, i) {
      var e = exi(it.ex), unit = e.log === 'cardio' ? 'Minutes' : e.log === 'time' ? 'Seconds' : 'Reps';
      h += '<div class="ed-item' + (isLinked(ed.items, i) ? ' linked' : '') + '"><div class="ed-top"><span class="thumb">' + illoSvg(e.illo) + '</span><div><b>' + esc(e.name) + '</b><br><small class="sub">' + esc(exSub(e)) + '</small></div>' +
        '<div class="mini"><button class="icon-btn" type="button" data-act="ed-up" data-i="' + i + '" aria-label="Move up"' + (i ? '' : ' disabled') + '>' + IC.up + '</button>' +
        '<button class="icon-btn" type="button" data-act="ed-down" data-i="' + i + '" aria-label="Move down"' + (i < ed.items.length - 1 ? '' : ' disabled') + '>' + IC.down + '</button>' +
        '<button class="icon-btn" type="button" data-act="ed-del" data-i="' + i + '" aria-label="Remove ' + esc(e.name) + '">' + IC.x + '</button></div></div><div class="ed-grid">';
      h += e.log === 'cardio' ? '<span></span>' : '<div class="fld"><span>Sets</span><div class="stepper"><button type="button" data-act="ed-sets" data-i="' + i + '" data-d="-1" aria-label="One set fewer">−</button><b>' + it.sets + '</b><button type="button" data-act="ed-sets" data-i="' + i + '" data-d="1" aria-label="One set more">+</button></div></div>';
      h += '<div class="fld"><span>' + unit + '</span><div class="range"><input id="ed-lo-' + i + '" type="text" inputmode="numeric" data-ed="lo" data-i="' + i + '" value="' + it.lo + '" aria-label="Lowest ' + unit.toLowerCase() + '"><span>–</span><input id="ed-hi-' + i + '" type="text" inputmode="numeric" data-ed="hi" data-i="' + i + '" value="' + it.hi + '" aria-label="Highest ' + unit.toLowerCase() + '"></div></div>';
      h += e.log === 'cardio' ? '<span></span>' : '<label class="fld">Rest<select id="ed-rest-' + i + '" data-ed="restSec" data-i="' + i + '"' + (it.link ? ' disabled' : '') + '>' + RESTS.map(function (s) { return '<option value="' + s + '"' + (s === it.restSec ? ' selected' : '') + '>' + (s ? restText(s) : 'None') + '</option>'; }).join('') + (RESTS.indexOf(it.restSec) < 0 ? '<option value="' + it.restSec + '" selected>' + restText(it.restSec) + '</option>' : '') + '</select></label>';
      h += '</div>';
      if (i < ed.items.length - 1 && e.log !== 'cardio') h += '<label class="check"><input type="checkbox" data-ed="link" data-i="' + i + '"' + (it.link ? ' checked' : '') + '> Superset with the next exercise</label>';
      h += '</div>';
    });
    h += '<button class="add-ex" type="button" data-act="ed-add">+ Add exercise</button>' +
      '<button class="btn primary block" type="button" data-act="ed-save">Save session</button>';
    if (!ed.isNew) {
      var edited = BUILTIN.indexOf(ed.id) >= 0 && state.routines[ed.id];
      if (edited) h += '<button class="btn quiet" type="button" data-act="ed-reset">' + (armed === 'ed-reset' ? 'Tap again to reset' : 'Reset to the original plan') + '</button>';
      h += '<button class="btn quiet danger" type="button" data-act="ed-remove">Remove from the plan</button>' +
        '<p class="foot">It moves to “Not in the plan” under Edit on the Train screen, where you can add it back. Workouts you logged with it are kept.</p>';
    }
    return h;
  }

  /* ================= log tab: the workout ================= */
  /* "Remove a set" turns the ticks of one exercise into crosses; tapping a cross removes that set */
  var delMode = null;
  var nextSet = '', noteOpen = null; /* the set the rest bar names as next; the exercise whose note field was opened by hand */
  function delBtn(u, i, warm, label) { return '<button class="tick del" type="button" data-act="del-row" data-u="' + u + '" data-i="' + i + '"' + (warm ? ' data-w="1"' : '') + ' aria-label="' + label + '">' + IC.x + '</button>'; }
  function warmRow(it, i, s, prev) {
    var n = i + 1;
    return '<div class="set warm' + (s.d ? ' done' : '') + '"><span class="set-n" title="Warm-up set">W</span>' + (prev ? '<span class="set-prev"></span>' : '') +
      '<div class="field"><input type="text" inputmode="decimal" autocomplete="off" data-wf="w" data-u="' + it.u + '" data-i="' + i + '" value="' + esc(s.w) + '" aria-label="Warm-up set ' + n + ' weight in ' + UW() + '"><span>' + UW() + '</span></div><span class="set-x">×</span>' +
      '<div class="field"><input type="text" inputmode="numeric" autocomplete="off" data-wf="r" data-u="' + it.u + '" data-i="' + i + '" value="' + esc(s.r) + '" aria-label="Warm-up set ' + n + ' reps"><span>reps</span></div>' +
      (delMode === it.u ? delBtn(it.u, i, 1, 'Remove warm-up set ' + n) : '<button class="tick" type="button" data-act="wtick" data-u="' + it.u + '" data-i="' + i + '" aria-pressed="' + (s.d ? 'true' : 'false') + '" aria-label="Warm-up set ' + n + ' done">' + IC.check + '</button>') + '</div>';
  }
  /* what was done on this set last time, short and without units: "60 × 9", "+10 × 8", "12", "45 s" */
  function prevText(e, p) {
    if (!p) return '';
    if (e.log === 'time') return fmt(p.r) + ' s';
    if (e.log === 'cardio') return fmt(p.r) + ' min';
    return (e.log === 'bw' ? (p.w > 0 ? '+' + fmt(p.w) + ' × ' : '') : fmt(p.w) + ' × ') + fmt(p.r);
  }
  function setRow(it, e, i, s, lastSets, prev) {
    var d = state.draft, ls = lastSets ? (lastSets[i] || lastSets[lastSets.length - 1]) : null, one = e.log === 'cardio' || e.log === 'time';
    if (e.sport) return sportRow(it, e, i, s, ls);
    var tm = one && !d.editing && !s.d, run = !!(d.timer && d.timer.u === it.u && d.timer.i === i), left = s.d && s.rir != null ? (s.rir >= 3 ? '3+' : String(s.rir)) : '';
    var h = '<div class="set' + (one ? ' one' : '') + (tm ? ' tm' : '') + (s.d ? ' done' : '') + (s.d && s.pr ? ' pr' : '') + '"><span class="set-n">' + (i + 1) + '</span>';
    if (prev) h += '<span class="set-prev">' + esc(prevText(e, prev[i])) + '</span>';
    if (!one) h += '<div class="field"><input id="w-' + it.u + '-' + i + '" type="text" inputmode="decimal" autocomplete="off" data-f="w" data-u="' + it.u + '" data-i="' + i + '" value="' + esc(s.w) + '" placeholder="' + (ls ? fmt(ls.w) : (e.log === 'bw' ? '0' : '')) + '" aria-label="Set ' + (i + 1) + ' weight in ' + UW() + '"><span>' + UW() + '</span></div><span class="set-x">×</span>';
    h += '<div class="field"><input id="r-' + it.u + '-' + i + '" type="text" inputmode="' + (one ? 'decimal' : 'numeric') + '" autocomplete="off" data-f="r" data-u="' + it.u + '" data-i="' + i + '" value="' + esc(s.r) + '" placeholder="' + (ls ? fmt(ls.r) : '') + '" aria-label="Set ' + (i + 1) + ' ' + e.unit + '"><span>' + e.unit + '</span></div>';
    if (tm) h += '<button class="tbtn' + (run ? ' on' : '') + '" type="button" data-act="timer" data-u="' + it.u + '" data-i="' + i + '" aria-label="' + (run ? 'Stop the countdown' : 'Start a countdown for set ' + (i + 1)) + '">' + (run ? IC.stop : IC.timer) + '</button>';
    if (delMode === it.u && it.rows.length > 1) h += delBtn(it.u, i, 0, 'Remove set ' + (i + 1)) + '</div>';
    else h += '<button class="tick' + (s.pop ? ' pop' : '') + '" type="button" data-act="tick" data-u="' + it.u + '" data-i="' + i + '" aria-pressed="' + (s.d ? 'true' : 'false') + '" aria-label="Set ' + (i + 1) + (s.d && s.pr ? ' done, new best' : ' done') + (left ? ', ' + (left === '3+' ? '3 or more' : left) + ' left in the tank' : '') + '">' + (s.d && s.pr ? IC.star : IC.check) + (left ? '<span class="rir-b" aria-hidden="true">' + left + '</span>' : '') + '</button></div>';
    if (state.settings.rir && !d.editing && (e.log === 'wr' || e.log === 'bw') && s.d && s.rir == null && !it.rows.slice(i + 1).some(function (x) { return x.d; }))
      h += '<div class="rir" role="group" aria-label="Reps left in the tank after set ' + (i + 1) + '"><span>Reps left in the tank</span>' + [0, 1, 2, 3].map(function (v) { return '<button type="button" data-act="rir" data-u="' + it.u + '" data-i="' + i + '" data-v="' + v + '">' + (v === 3 ? '3+' : v) + '</button>'; }).join('') + '</div>';
    return h;
  }
  function draftView() {
    var d = state.draft, r = d.key === 'free' ? null : getRoutine(d.key), h = '';
    h += '<section class="draft-head">';
    if (d.editing) h += '<div class="spread"><h2>' + esc(d.name) + '</h2><span class="pill">editing a saved workout</span></div>';
    if (d.key === 'free' && !d.editing) h += '<label class="fld">Workout name<input id="draft-name" type="text" maxlength="40" autocomplete="off" value="' + esc(d.name) + '"></label>';
    var lead = d.editing ? (r && r.focus ? r.focus : '') : (d.items.length ? '' : 'Add your first exercise to get going.');
    if (d.editing) h += '<div class="spread"><p class="sub">' + esc(lead) + '</p><input class="date-in" id="draft-date" type="date" value="' + esc(d.date) + '" max="' + today() + '" aria-label="Workout date"></div>';
    else if (lead) h += '<p class="sub">' + esc(lead) + '</p>';
    h +=
      (d.editing ? '<label class="dur-row">How long it took<span><input class="text-in" id="draft-dur" type="number" inputmode="numeric" min="0" max="600" step="1" placeholder="–" value="' + (d.dur ? Math.round(d.dur / 60) : '') + '">minutes</span></label>' : '') + '</section>';
    if (!d.editing && d.items.length) h += '<div class="wtop">' + (d.easy ? '<span class="pill blk easy">Easy week · half the sets</span>' : '') + (r && r.warmup ? '<button class="act" type="button" data-act="warm-plan">Warm-up plan</button>' : '') + '<button class="act" type="button" data-act="notes-go">Workout notes</button></div>';
    h += '<!--T-->';
    var anyPr = false, anyTarget = false, hintTip = '', cur = curItem(d), open = cur ? mates(d, cur) : [];
    histMemo = null;
    nextSet = '';
    d.items.forEach(function (it, idx) {
      var e = exi(it.ex), last = lastEntry(d.key, it.ex, d.id), tg = d.editing ? null : targetFor(it, e, last, exHist(it.ex)), hi = tg ? { t: tg.text, s: tg.short, up: tg.up } : hint(it, e, last), showT = !!(tg && tg.sets && e.log !== 'cardio'), linked = isLinked(d.items, idx), grouped = it.group || linked;
      var first = it.group ? (idx === 0 || d.items[idx - 1].group !== it.group) : (linked && !(idx > 0 && d.items[idx - 1].link));
      var allDone = it.rows.length && it.rows.every(function (x) { return x.d; }), nDone = it.rows.filter(function (x) { return x.d; }).length, isOpen = d.editing || open.indexOf(it) >= 0;
      var ph = tg && tg.sets ? tg.sets : (last ? last.sets : null), star = it.rows.some(function (x) { return x.d && x.pr; });
      if (star) anyPr = true;
      if (showT) anyTarget = true;
      if (grouped && first && (isOpen || !allDone)) h += '<div class="group-tag">' + esc(it.group || 'Superset') + (isOpen ? ': back to back, rest after the last one' : '') + '</div>';
      if (!isOpen) {
        /* folded: one line. Done shows what was done, the rest show the plan and today's target */
        var did = setsText(e, rowSets({ ex: it.ex, rows: it.rows.filter(function (x) { return x.d; }) })), plan = e.log === 'cardio' ? repsText(it, e) : it.sets + ' × ' + repsText(it, e).replace(/–/g, '-');
        var sub = allDone ? did : nDone ? nDone + ' of ' + it.rows.length + ' sets · ' + did : plan + (ph && !e.sport ? ' · ' + setsText(e, ph.slice(0, Math.max(1, Math.min(it.rows.length, ph.length)))) : '');
        h += '<button class="card exc fold' + (grouped ? ' in-group' : '') + (allDone ? ' done' : '') + '" type="button" id="x-' + it.u + '" data-act="ex-open" data-u="' + it.u + '" aria-expanded="false" aria-label="' + esc(e.name) + ', ' + (allDone ? 'done' : nDone ? nDone + ' of ' + it.rows.length + ' sets done' : 'to do') + '. Open">' +
          (allDone ? '<span class="fold-ck">' + IC.check + '</span>' : '<span class="fold-th">' + illoSvg(e.illo) + '</span>') +
          '<span class="fold-t"><b>' + esc(e.name) + (star ? '<i class="fold-star">' + IC.star + '</i>' : '') + '</b><small>' + esc(sub) + '</small></span><span class="fold-go">' + IC.right + '</span></button>';
        it.rows.forEach(function (x) { x.pop = false; }); it.recNew = null;
        return;
      }
      h += '<section class="card exc' + (d.editing ? '' : ' cur') + (grouped ? ' in-group' : '') + (allDone ? ' all-done' : '') + '" id="x-' + it.u + '"><div class="exc-head">' +
        '<button class="thumb" type="button" data-act="open-ex" data-ex="' + esc(it.ex) + '" data-u="' + it.u + '" aria-label="How to do ' + esc(e.name) + '">' + illoSvg(e.illo) + '</button>' +
        '<div><div class="exc-name">' + (it.n && it.n.charAt(0) !== 'x' ? '<span class="exc-n">' + esc(it.n) + '</span>' : '') + esc(e.name) + '</div><div class="exc-target">' + targetHtml(it, e) + '</div></div>' +
        '<button class="icon-btn" type="button" data-act="ex-menu" data-u="' + it.u + '" aria-label="More options for ' + esc(e.name) + '">' + IC.more + '</button></div>';
      if (!d.editing && (hi.s || hi.t)) h += '<p class="why' + (hi.up ? ' up' : '') + '">' + esc(hi.s || hi.t) + (it.plus ? ' · +1 set, push weeks' : '') + '</p>';
      if (last && last.note) h += '<p class="last-note">Last note: ' + esc(last.note) + '</p>';
      var prev = last && !e.sport && e.log !== 'cardio' ? (tg && tg.shown ? tg.shown : last.sets) : null;
      if (tg && tg.light && !d.editing) h += '<p class="last-note">Lighter last time, counted as warm-up: ' + esc(setsText(e, tg.light)) + '</p>';
      var one1 = e.log === 'time';
      if (prev) h += '<div class="set-cols' + (one1 ? ' one' : '') + (one1 && !d.editing && undone(it) ? ' tm' : '') + '" aria-hidden="true"><span>Last · ' + fmtDate(last.date, true) + '</span>' + (one1 ? '' : '<span>' + UW() + '</span><span></span>') + '<span>' + esc(e.unit) + '</span><span></span></div>';
      else if (last && e.sport) h += '<p class="last-note">Last time · ' + fmtDate(last.date) + ': ' + esc(setsText(e, last.sets)) + '</p>';
      h += '<div class="sets' + (prev ? ' hp' : '') + '">';
      if (it.warm && it.warm.length) it.warm.forEach(function (s, i) { h += warmRow(it, i, s, prev); });
      it.rows.forEach(function (s, i) { h += setRow(it, e, i, s, ph, prev); s.pop = false; });
      h += '</div>';
      var rc = itemRecords(it, d), chips = '', nw = it.recNew || {};
      if (rc.w) chips += '<span class="rec-chip' + (nw.w ? ' new' : '') + '">' + IC.star + 'Record weight · ' + fmt(rc.maxW) + ' ' + UW() + '</span>';
      if (rc.v) chips += '<span class="rec-chip' + (nw.v ? ' new' : '') + '">' + IC.star + 'Record volume · ' + compact(rc.vol) + ' ' + UW() + '</span>';
      if (rc.b && e.log !== 'wr') chips += '<span class="rec-chip' + (nw.b ? ' new' : '') + '">' + IC.star + (e.log === 'bw' ? 'Most reps yet · ' + fmt(rc.best) : e.log === 'time' ? 'Longest hold yet · ' + fmt(rc.best) + ' s' : 'Longest yet · ' + fmt(rc.best) + ' min') + '</span>';
      if (chips) h += '<div class="recs">' + chips + '</div>';
      it.recNew = null;
      if (e.weightHint && !d.editing && !tipSeen('b')) { h += '<span class="unit-hint">' + esc(e.weightHint) + '</span>'; tipShown.b = 1; }
      /* one row of small actions; while sets are being removed it is only the way out */
      var acts = '';
      if (delMode === it.u) acts = '<button class="act on" type="button" data-act="del-set" data-u="' + it.u + '">Done removing</button>';
      else {
        if (e.sport && !d.editing && !allDone) { var op = 0; while (op < it.rows.length - 1 && it.rows[op].d) op++; var on = !!(d.timer && d.timer.u === it.u); acts += '<button class="act' + (on ? ' on' : '') + '" type="button" data-act="timer" data-u="' + it.u + '" data-i="' + (on ? d.timer.i : op) + '">' + (on ? IC.stop + 'Stop the stopwatch' : IC.timer + 'Stopwatch') + '</button>'; }
        if (e.log !== 'cardio') acts += '<button class="act" type="button" data-act="add-set" data-u="' + it.u + '">+ Set</button>';
        if (e.log === 'wr' && !d.editing && !allDone) acts += '<button class="act" type="button" data-act="warm-one" data-u="' + it.u + '" aria-label="Add a warm-up set">Warm-up</button>';
        if (!d.editing && !nDone) acts += '<button class="act" type="button" data-act="swap-open" data-u="' + it.u + '">Swap</button>';
        if (!it.note && noteOpen !== it.u) acts += '<button class="act" type="button" data-act="note-open" data-u="' + it.u + '">Note</button>';
      }
      h += '<div class="acts">' + acts + '</div>';
      if (it.note || noteOpen === it.u) h += '<input class="note-in" id="note-' + it.u + '" type="text" data-f="note" data-u="' + it.u + '" value="' + esc(it.note) + '" placeholder="Note (machine setting, swap used…)" aria-label="Note for ' + esc(e.name) + '">';
      h += '</section>';
    });
    /* what the rest bar names as coming up: the first open set of the open exercise, taking turns in a superset */
    if (cur) (function () {
      var todo = open.filter(undone); if (!todo.length) return;
      var it = todo.reduce(function (a, b) { return b.rows.filter(function (x) { return x.d; }).length < a.rows.filter(function (x) { return x.d; }).length ? b : a; });
      var e = exi(it.ex), i = 0; while (it.rows[i].d) i++;
      if (e.sport || e.log === 'cardio') return;
      var last = lastEntry(d.key, it.ex, d.id), tg = targetFor(it, e, last, exHist(it.ex)), ph = tg && tg.sets ? tg.sets : (last ? last.sets : null), p = ph ? (ph[i] || ph[ph.length - 1]) : null, s = it.rows[i];
      var w = num(s.w), r = num(s.r); if (w == null && p) w = p.w; if (r == null && p) r = p.r;
      nextSet = r == null ? (todo.length > 1 || open.length > 1 ? e.name : '') : e.log === 'time' ? fmt(r) + ' s' : (e.log === 'bw' ? (w > 0 ? '+' + fmt(w) + ' ' + UW() + ' × ' : '') + fmt(r) + (w > 0 ? '' : ' reps') : fmt(w || 0) + ' ' + UW() + ' × ' + fmt(r));
      if (nextSet && open.length > 1 && r != null) nextSet = e.name + ', ' + nextSet;
    })();
    h += '<button class="add-ex" type="button" data-act="add-ex">+ Add exercise</button>';
    if (anyPr && !d.editing && !tipSeen('s')) { h += '<p class="foot">A star marks a set that beats your best set for that exercise so far.</p>'; tipShown.s = 1; }
    var tTip = anyTarget && !draftProgress().done && !tipSeen('t'); if (tTip) tipShown.t = 1;
    h = h.replace('<!--T-->', tTip ? '<p class="note">The grey numbers in each set are today’s target. Tick a set to log it as written, or type what you did.</p>' : '');
    h += '<section class="card"><label class="label" for="draft-notes">Workout notes</label><textarea class="notes-in" id="draft-notes" data-f="notes" placeholder="Sleep, energy, anything worth remembering">' + esc(d.notes) + '</textarea>' +
      '<button class="btn primary block" type="button" data-act="finish-now" id="finish-btn"' + (draftCount() ? '' : ' disabled') + '>' + (d.editing ? 'Save changes' : 'Finish workout') + '</button>' +
      (d.editing ? '' : '<button class="btn quiet" type="button" data-act="clock">Change the date or start time</button>') +
      '<button class="btn quiet danger" type="button" data-act="discard">' + (armed === 'discard' ? 'Tap again to discard' : (d.editing ? 'Cancel editing' : 'Discard workout')) + '</button></section>';
    return h;
  }

  /* ================= progress ================= */
  function demoSessions() {
    var out = [], start = addDays(weekStart(today()), -49), dayOf = { upperA: 0, lowerA: 1, upperB: 3, lowerB: 4 };
    for (var w = 0; w < 8; w++) CORE.forEach(function (k) {
      if ((w === 3 && k === 'lowerB') || addDays(start, w * 7 + dayOf[k]) > today()) return;
      var entries = [];
      PLAN.sessions[k].exercises.forEach(function (ex) {
        var span = ex.hi - ex.lo + 1, step = w % (span + 1), bump = Math.floor(w / (span + 1));
        var wgt = Math.round(ex.demo * Math.pow(1.05, bump) / 2.5) * 2.5, top = Math.min(ex.hi, ex.lo + step), sets = [];
        for (var i = 0; i < ex.sets; i++) sets.push({ w: ex.log === 'wr' ? wgt : 0, r: Math.max(ex.lo - 1, top - (i > 0 ? 1 : 0) - (i > 1 && step < 2 ? 1 : 0)) });
        entries.push({ n: ex.n, ex: ex.id, name: ex.name, sets: sets });
      });
      out.push({ id: 'demo' + w + k, key: k, name: PLAN.sessions[k].name, date: addDays(start, w * 7 + dayOf[k]), finishedAt: w, dur: (58 + ((w * 7 + k.length * 3) % 13)) * 60, core: true, entries: entries });
    });
    return out;
  }
  function demoBody() { var o = {}, start = addDays(weekStart(today()), -56); for (var w = 0; w < 24; w++) { var dt = addDays(start, Math.round(w * 2.4)); if (dt > today()) break; o[dt] = { date: dt, weight: Math.round((75 + w * 0.06 + ((w * 7) % 5 - 2) * 0.14) * (isLb() ? 2.2 : 1) * 10) / 10, waist: Math.round((82 - w * 0.03) * (isLb() ? 0.394 : 1) * 10) / 10 }; } return o; }
  function niceTicks(lo, hi, n) {
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    var rawStep = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(rawStep))), nr = rawStep / mag;
    var step = (nr <= 1 ? 1 : nr <= 2 ? 2 : nr <= 2.5 ? 2.5 : nr <= 5 ? 5 : 10) * mag;
    var t0 = Math.floor(lo / step) * step, t1 = Math.ceil(hi / step) * step, out = [];
    for (var v = t0; v <= t1 + step / 2; v += step) out.push(Math.round(v * 1000) / 1000);
    return out;
  }
  var charts = {};
  function chartW() { return Math.max(240, Math.min(574, view.clientWidth - 66)); }
  /* pts: [{x: date, y, tip}]; trend: optional parallel array of smoothed values drawn as the line while pts stay as dots */
  /* a curve through the points that never overshoots them */
  function smoothPath(P) {
    var n = P.length, i, f = function (v) { return v.toFixed(1); };
    if (n < 3) return P.map(function (p, k) { return (k ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]); }).join(' ');
    var dx = [], m = [], t = [];
    for (i = 0; i < n - 1; i++) { dx.push((P[i + 1][0] - P[i][0]) || 1e-6); m.push((P[i + 1][1] - P[i][1]) / dx[i]); }
    t.push(m[0]);
    for (i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
    t.push(m[n - 2]);
    for (i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      var a = t[i] / m[i], b = t[i + 1] / m[i], q = a * a + b * b;
      if (q > 9) { var k = 3 / Math.sqrt(q); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    var d = 'M' + f(P[0][0]) + ' ' + f(P[0][1]);
    for (i = 0; i < n - 1; i++) { var h = dx[i] / 3; d += 'C' + f(P[i][0] + h) + ' ' + f(P[i][1] + t[i] * h) + ' ' + f(P[i + 1][0] - h) + ' ' + f(P[i + 1][1] - t[i + 1] * h) + ' ' + f(P[i + 1][0]) + ' ' + f(P[i + 1][1]); }
    return d;
  }
  /* colour helpers: mix in OKLCH so the steps between two colours stay clean */
  function hex2lch(h) {
    function lin(i) { var c = parseInt(h.substr(i, 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    var r = lin(1), g = lin(3), b = lin(5);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, Math.sqrt(A * A + B * B), Math.atan2(B, A)];
  }
  function lch2hex(L, C, H) {
    var A = C * Math.cos(H), B = C * Math.sin(H);
    var l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3), m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3), s = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3);
    function gam(c) { c = Math.max(0, Math.min(1, c)); var v = Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) + gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) + gam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
  }
  /* the scale for "how close to the mark": orange when far off, green only close to the mark. The stops live in the stylesheet (--ramp for bars, --ramp-line for lines). */
  var rampMemo = {};
  function ramp(name, t) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(), st = rampMemo[v];
    if (!st) {
      /* each stop is #rrggbb or #rrggbb@position; without positions the stops are spread evenly */
      st = rampMemo[v] = v.split(/\s+/).map(function (x) { var m = /^(#[0-9a-f]{6})(?:@([0-9.]+))?$/i.exec(x); return m ? { c: hex2lch(m[1]), p: m[2] == null ? null : +m[2] } : null; }).filter(Boolean);
      st.forEach(function (x, k) { if (x.p == null) x.p = st.length > 1 ? k / (st.length - 1) : 0; });
    }
    if (st.length < 2) return '#1aa858';
    t = Math.max(0, Math.min(1, t));
    var i = 0; while (i < st.length - 2 && t > st[i + 1].p) i++;
    var a = st[i], b = st[i + 1], f = b.p > a.p ? Math.max(0, Math.min(1, (t - a.p) / (b.p - a.p))) : 1;
    return lch2hex(a.c[0] + (b.c[0] - a.c[0]) * f, a.c[1] + (b.c[1] - a.c[1]) * f, a.c[2] + (b.c[2] - a.c[2]) * f);
  }
  function gradDefs(id, W, H, m) {
    return '<defs><linearGradient id="' + id + '-b" gradientUnits="userSpaceOnUse" x1="0" y1="' + m.t + '" x2="0" y2="' + (H - m.b) + '"><stop offset="0" style="stop-color:var(--series-1b)"/><stop offset="1" style="stop-color:var(--series-1)"/></linearGradient></defs>';
  }
  /* pts: [{x: date, y, tip}]; trend: optional parallel array of smoothed values drawn as the line while pts stay as dots.
     opt.scale [low, high]: the line is orange at or below low and green at or above high. opt.up: blue at the bottom of the chart, green at the top. Neither: one colour. */
  function lineChart(id, pts, trend, opt) {
    var W = chartW(), H = 190, m = { l: 36, r: 46, t: 14, b: 24 };
    if (!pts.length) return '<p class="sub">No entries yet.</p>';
    var extra = (opt && opt.extra) || [], xs = pts.map(function (p) { return toDate(p.x).getTime(); }), ys = pts.map(function (p) { return p.y; }), all = (trend ? ys.concat(trend) : ys).concat(extra.map(function (p) { return p.y; }));
    var bars = !!(opt && opt.bars), bp = bars ? 12 : 0; if (bars) all.push(0);
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), ticks = niceTicks(Math.min.apply(null, all), Math.max.apply(null, all), 3);
    var y0 = ticks[0], y1 = ticks[ticks.length - 1];
    function X(v) { return x1 === x0 ? m.l + (W - m.l - m.r) / 2 : m.l + bp + (v - x0) / (x1 - x0) * (W - m.l - m.r - 2 * bp); }
    function Y(v) { return H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b); }
    var lineY = trend || ys, last = lineY[lineY.length - 1], stops = '', ga = H - m.b, gb = m.t, k;
    opt = opt || {};
    if (opt.scale) { ga = Y(opt.scale[0]); gb = Y(opt.scale[1]); for (k = 0; k <= 6; k++) stops += '<stop offset="' + (k / 6).toFixed(3) + '" stop-color="' + ramp('--ramp-line', k / 6) + '"/>'; }
    else if (opt.out) stops = '<stop offset="0" style="stop-color:var(--out)"/><stop offset="1" style="stop-color:var(--out)"/>';
    else if (opt.up) stops = '<stop offset="0" style="stop-color:var(--line-lo)"/><stop offset="0.55" style="stop-color:var(--line-mid)"/><stop offset="1" style="stop-color:var(--line-top)"/>';
    else stops = '<stop offset="0" style="stop-color:var(--line-lo)"/><stop offset="1" style="stop-color:var(--line-hi)"/>';
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Line chart with ' + pts.length + ' entries, latest ' + fmt(Math.round(last * 10) / 10) + '">' +
      '<defs><linearGradient id="' + id + '-l" gradientUnits="userSpaceOnUse" x1="0" y1="' + ga.toFixed(1) + '" x2="0" y2="' + gb.toFixed(1) + '">' + stops + '</linearGradient>' +
      '<linearGradient id="' + id + '-f" gradientUnits="userSpaceOnUse" x1="0" y1="' + m.t + '" x2="0" y2="' + (H - m.b) + '"><stop offset="0" stop-color="#fff" stop-opacity="0.3"/><stop offset="1" stop-color="#fff" stop-opacity="0.03"/></linearGradient>' +
      '<mask id="' + id + '-m" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#' + id + '-f)"/></mask></defs>';
    ticks.forEach(function (t) { s += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + (opt && opt.fmt ? opt.fmt(t) : fmt(t)) + '</text>'; });
    var P = pts.map(function (p, i) { return [X(xs[i]), Y(p.y)]; }), Lp = lineY.map(function (v, i) { return [X(xs[i]), Y(v)]; });
    /* opt.best is the index of the best entry: a dashed line at its height and a ring on it, in the record colour */
    var hasBest = opt.best != null && P.length > 1 && P[opt.best], bw = 0;
    if (hasBest) s += '<line class="bestline" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + P[opt.best][1].toFixed(1) + '" y2="' + P[opt.best][1].toFixed(1) + '"/>';
    if (bars) {
      /* a total per day is a sum, so it is drawn as columns from zero; the latest is solid */
      var gx = Infinity; P.forEach(function (p, i) { if (i) gx = Math.min(gx, p[0] - P[i - 1][0]); });
      bw = Math.max(3, Math.min(20, (isFinite(gx) ? gx : 20) * 0.7));
      P.forEach(function (p, i) { s += '<rect class="bar' + (i === P.length - 1 ? ' last' : '') + '" style="fill:url(#' + id + '-l)" x="' + (p[0] - bw / 2).toFixed(1) + '" y="' + p[1].toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, Y(0) - p[1]).toFixed(1) + '" rx="' + Math.min(3, bw / 2) + '"/>'; });
    } else if (Lp.length > 1) {
      var dstr = smoothPath(Lp);
      s += '<path class="area" style="fill:url(#' + id + '-l)" mask="url(#' + id + '-m)" d="' + dstr + ' L' + Lp[Lp.length - 1][0].toFixed(1) + ' ' + (H - m.b) + ' L' + Lp[0][0].toFixed(1) + ' ' + (H - m.b) + ' Z"/><path class="ln draw" pathLength="1" style="stroke:url(#' + id + '-l)" d="' + dstr + '"/>';
    }
    var XP = extra.map(function (p) { return [X(toDate(p.x).getTime()), Y(p.y)]; });
    XP.forEach(function (p) { s += '<circle class="dot3" r="3.4" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '"/>'; });
    if (extra.length && P.length > 1) P.forEach(function (p) { s += '<circle class="dot2" r="2.8" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '"/>'; });
    if (trend) P.forEach(function (p) { s += '<circle class="dot2" r="2.6" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '"/>'; });
    var e = Lp[Lp.length - 1];
    s += '<line class="cross" id="' + id + '-x" y1="' + m.t + '" y2="' + (H - m.b) + '" x1="0" x2="0" visibility="hidden"/><circle class="dot" id="' + id + '-d" r="4" cx="0" cy="0" visibility="hidden"/>';
    if (hasBest) s += '<circle class="bestdot" r="' + (bars ? 4.5 : 7.5) + '" cx="' + P[opt.best][0].toFixed(1) + '" cy="' + P[opt.best][1].toFixed(1) + '"/>';
    if (!bars) s += '<circle class="halo" r="5" style="fill:url(#' + id + '-l)" cx="' + e[0] + '" cy="' + e[1] + '"/><circle class="dot end" r="5" style="fill:url(#' + id + '-l)" cx="' + e[0] + '" cy="' + e[1] + '"/>';
    s += '<text class="val" x="' + (e[0] + (bars ? bw / 2 + 6 : 10)) + '" y="' + (e[1] + 4) + '">' + (opt.end ? opt.end(last) : opt.fmt ? opt.fmt(last) : fmt(Math.round(last * 10) / 10)) + '</text>';
    s += '<text x="' + P[0][0] + '" y="' + (H - 6) + '" text-anchor="' + (P.length > 1 ? 'start' : 'middle') + '">' + fmtDate(pts[0].x, true) + '</text>';
    if (P.length > 1) s += '<text x="' + e[0] + '" y="' + (H - 6) + '" text-anchor="end">' + fmtDate(pts[pts.length - 1].x, true) + '</text>';
    s += '</svg><div class="tip" id="' + id + '-t" hidden></div>';
    charts[id] = { type: 'line', P: P, pts: pts, W: W, XP: XP, extra: extra };
    return s;
  }
  /* weekly columns; each week {start, a, b}: a is the main series, b is stacked on top in the second colour */
  function colChart(id, weeks, opt) {
    var W = chartW(), H = 160, m = { l: 30, r: opt.target != null ? 48 : 12, t: 14, b: 22 }, N = weeks.length;
    var maxV = Math.max(opt.min || 0, Math.max.apply(null, weeks.map(function (w) { return w.a + (w.b || 0); })));
    var ticks = opt.int ? null : niceTicks(0, maxV || 1, 3); if (ticks) maxV = ticks[ticks.length - 1];
    var band = (W - m.l - m.r) / N, bw = Math.min(24, band * 0.62);
    function Y(v) { return H - m.b - v / maxV * (H - m.t - m.b); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.label) + '">' + gradDefs(id, W, H, m);
    if (ticks) ticks.forEach(function (t) { s += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + (opt.fmt ? opt.fmt(t) : t) + '</text>'; });
    else for (var t = 0; t <= maxV; t += (maxV > 6 ? 2 : 1)) s += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + t + '</text>';
    function bar(x, yTop, yBot, cls, round, i) {
      var hgt = yBot - yTop; if (hgt <= 0.2) return ''; var r = round ? Math.min(5, hgt, bw / 2) : 0;
      return '<path class="' + cls + ' grow" style="' + (cls === 'col-core' ? 'fill:url(#' + id + '-b);' : '') + '--i:' + i + '" d="M' + x + ' ' + yBot + ' V' + (yTop + r) + ' Q' + x + ' ' + yTop + ' ' + (x + r) + ' ' + yTop + ' H' + (x + bw - r) + ' Q' + (x + bw) + ' ' + yTop + ' ' + (x + bw) + ' ' + (yTop + r) + ' V' + yBot + ' Z"/>';
    }
    weeks.forEach(function (w, i) {
      var x = m.l + band * i + (band - bw) / 2;
      s += bar(x, Y(w.a), Y(0), 'col-core', !w.b, i);
      if (w.b) s += bar(x, Y(w.a + w.b), Y(w.a) - (w.a ? 2 : 0), 'col-extra', true, i + 2);
      if (i % 3 === (N - 1) % 3) s += '<text x="' + (x + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + (i === N - 1 ? 'now' : fmtDate(w.start, true)) + '</text>';
      w.cx = x + bw / 2; w.top = Y(w.a + (w.b || 0));
    });
    s += '<line class="axis" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
    if (opt.target != null) s += '<line class="target" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(opt.target) + '" y2="' + Y(opt.target) + '"/><text class="val" x="' + (W - m.r + 6) + '" y="' + (Y(opt.target) + 4) + '">goal ' + opt.target + '</text>';
    s += '</svg><div class="tip" id="' + id + '-t" hidden></div>';
    charts[id] = { type: 'cols', weeks: weeks, W: W, band: band, m: m, tip: opt.tip };
    return s;
  }
  function lastWeeks(n) { var ws = weekStart(today()), out = []; for (var i = n - 1; i >= 0; i--) out.push({ start: addDays(ws, -7 * i), a: 0, b: 0 }); return out; }
  function spark(vals) {
    if (vals.length < 2) return '<svg viewBox="0 0 64 24" aria-hidden="true"><circle class="dot" cx="58" cy="12" r="3"/></svg>';
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), span = hi - lo || 1;
    var P = vals.map(function (v, i) { return [3 + i / (vals.length - 1) * 55, 20 - (v - lo) / span * 16]; });
    return '<svg viewBox="0 0 64 24" aria-hidden="true"><path class="ln" d="' + P.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('') + '"/><circle class="dot" cx="' + P[P.length - 1][0] + '" cy="' + P[P.length - 1][1].toFixed(1) + '" r="3"/></svg>';
  }
  function topSet(e, sets, mode) { return bestSet(e, sets, mode || 'e1rm'); }
  /* one square per day, greener the more sets were logged, like a contribution graph */
  function calendar(list) {
    var W = 16, ws = weekStart(today()), start = addDays(ws, -7 * (W - 1)), sets = {}, h = '', months = '', lastM = -1;
    list.forEach(function (s) { sets[s.date] = (sets[s.date] || 0) + Math.max(1, countSets(s)); });
    for (var w = 0; w < W; w++) {
      var wk = addDays(start, w * 7), mo = toDate(addDays(wk, 6)).getMonth();
      months += '<span>' + (mo !== lastM ? MONTHS[mo] : '') + '</span>'; lastM = mo;
      for (var d = 0; d < 7; d++) {
        var dt = addDays(wk, d), n = sets[dt] || 0, lv = n >= 20 ? 4 : n >= 14 ? 3 : n >= 8 ? 2 : n > 0 ? 1 : 0;
        h += '<i class="' + (dt > today() ? 'future' : (lv ? 'on l' + lv : '')) + (dt === today() ? ' now' : '') + '"' + (lv ? ' style="--w:' + w + '" title="' + fmtDate(dt) + ': ' + n + ' sets"' : '') + '></i>';
      }
    }
    var days = list.filter(function (s) { return s.date >= start; }).length;
    return '<div class="cal" role="img" aria-label="' + days + ' workouts in the last ' + W + ' weeks"><span></span><div class="cal-months">' + months + '</div>' +
      '<div class="cal-rows"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span>Sun</span></div><div class="cal-grid">' + h + '</div></div>';
  }
  function muscleBars(list) {
    var md = musData(list), got = md.got, h = '', plan = md.plan;
    var rows = LIBRARY.MUSCLES.filter(function (m) { return plan[m.id] || got[m.id]; }), free = 10;
    if (!rows.length) return '<p class="sub">Add a session to your plan to get weekly targets.</p>';
    rows.forEach(function (m) { if (!plan[m.id]) free = Math.max(free, got[m.id] || 0); });
    h += '<div class="mus">';
    rows.forEach(function (m) {
      var g = Math.round((got[m.id] || 0) * 10) / 10, p = plan[m.id] ? Math.round(plan[m.id] * 10) / 10 : 0, pct = Math.min(1, g / (p || free)), hit = p && g >= p;
      h += '<span>' + esc(m.name) + '</span><div class="mus-track" role="img" aria-label="' + esc(m.name) + ': ' + fmt(g) + (p ? ' of ' + fmt(p) + ' planned sets' : ' sets') + '"><div class="mus-fill" style="' + (p ? 'background:' + ramp('--ramp', pct) + ';' : '') + 'width:' + (g > 0 ? Math.max(4, pct * 100) : 0).toFixed(1) + '%"></div></div>' +
        '<span class="mus-val">' + (hit ? IC.check : '') + '<span><b>' + fmt(g) + '</b>' + (p ? ' / ' + fmt(p) : '') + '</span></span>';
    });
    return h + '</div>';
  }
  /* milestone levels climb through these, like ranks in a game */
  /* name, fill, text on the fill, the name's colour on a light page, and on a dark page */
  var TIERS = [['Tin', '#9ba6a9', '#16262a', '#6c797d', '#aab5b8'], ['Copper', '#c57a4c', '#ffffff', '#a9582a', '#dd9467'], ['Silver', '#c5ced2', '#16262a', '#7a878d', '#cfd8dc'], ['Gold', '#e4b93e', '#3b2a00', '#a07700', '#ecc552'], ['Emerald', '#1faa72', '#ffffff', '#0e8558', '#40d195'], ['Platinum', '#e8eef0', '#16262a', '#5c7c88', '#e8eef0'], ['Diamond', '#7fe2f5', '#06323a', '#0a8aab', '#7fe2f5'], ['Onyx', '#5b21b6', '#ffffff', '#6d28d9', '#a78bfa']];
  function tierOf(level) { return level > 0 ? TIERS[Math.min(level, TIERS.length) - 1] : null; }
  function msNum(m, v) { return m.unit === 't' ? fmt(Math.round(v * 10) / 10) : String(Math.floor(v)); }
  function badgesHtml(list) {
    return '<div class="badges">' + milestones(list).map(function (m, i) {
      var t = tierOf(m.level);
      return '<button type="button" data-act="ms-open" data-i="' + i + '" class="badge' + (m.got ? ' got' : '') + (m.next ? '' : ' full') + '"' + (t ? ' style="--tier:' + t[1] + ';--tier-ink:' + t[2] + '"' : '') + '><i style="--p:' + Math.round((m.next ? m.pct : 1) * 100) + '"><b>' + m.show + '</b></i><span>' + esc(m.label) + '</span><span class="foot">' + (t ? '<b>' + t[0] + '</b> · ' : '') + (m.next ? msNum(m, m.value) + ' of ' + m.next : 'all done') + '</span></button>';
    }).join('') + '</div>';
  }
  function msSheet(i) {
    var list = finished(), m = milestones(list.length ? list : [])[i]; if (!m) return;
    var t = tierOf(m.level), unit = m.unit === 't' ? ' t' : m.unit === 'wk' ? ' weeks' : '';
    var h = head(m.label, 'You are at ' + msNum(m, m.value) + unit + (t ? ', level ' + m.level + ' of ' + m.steps.length + ' (' + t[0] + ').' : ', no level reached yet.'));
    if (m.next) h += '<div><div class="ms-bar"><i style="width:' + Math.round(m.pct * 100) + '%"></i></div><p class="foot">' + msNum(m, Math.max(0, m.next - m.value)) + unit + ' more to reach ' + TIERS[Math.min(m.level, TIERS.length - 1)][0] + ' at ' + m.next + unit + '.</p></div>';
    h += '<ul class="ms-list">';
    m.steps.forEach(function (g, k) {
      var tt = TIERS[Math.min(k, TIERS.length - 1)], done = k < m.level, cur = k === m.level;
      h += '<li class="' + (cur ? 'cur' : done ? '' : 'off') + '" style="--tier:' + tt[1] + ';--tl:' + tt[3] + ';--td:' + tt[4] + '"><span class="tier-dot' + (done ? ' on' : ' off') + '">' + (done ? IC.check : '') + '</span><span class="txt"><b>' + tt[0] + '</b><small>' + g + unit + '</small></span><span class="st">' + (done ? '<span class="sr">Reached</span>' : cur ? msNum(m, Math.max(0, g - m.value)) + unit + ' to go' : 'Locked') + '</span></li>';
    });
    h += '</ul><button class="btn primary block" type="button" data-act="sheet-x">Done</button>';
    openSheet(h);
  }
  function overviewView(list, demo) {
    var h = '', ws = weekStart(today()), goal = state.settings.weeklyGoal || 4;
    var thisWeek = list.filter(function (s) { return weekStart(s.date) === ws && isCore(s); }).length, vol = 0, secs = 0, prs = 0;
    list.forEach(function (s) { vol += volOf(s); secs += durOf(s) || 0; });
    records(list).forEach(function (r) { prs += r.prs; });
    var hrs = secs / 3600, hShow = hrs >= 10 ? Math.round(hrs) : Math.round(hrs * 10) / 10;
    function cnt(v, f) { return '<em class="cnt" data-count="' + v + '"' + (f ? ' data-fmt="' + f + '"' : '') + '>' + (f === 'short' ? shortNum(v) : v) + '</em>'; }
    function tile(cls, ic, num, label) { return '<div class="tile' + (cls ? ' ' + cls : '') + '"><span class="ico">' + ic + '</span><b>' + num + '</b><span>' + label + '</span></div>'; }
    h += '<section class="card"><div class="spread"><h3>Consistency</h3><div class="legend"><span class="scale"><i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> Sets</span></div></div>' + calendar(list) + '</section>';
    h += '<div class="tiles six">' + tile('', IC.cal, cnt(list.length), 'workouts') +
      tile('t-green', IC.target, cnt(thisWeek) + '<small>of ' + goal + '</small>', 'this week') +
      tile('t-hot', IC.flame, cnt(streakWeeks(list)), 'weeks in a row') +
      tile('t-teal', IC.timer, hrs >= 10 ? cnt(hShow) : fmt(hShow), (hShow === 1 ? 'hour' : 'hours') + ' trained') +
      tile('t-violet', IC.weight, cnt(Math.round(vol), 'short'), UW() + ' lifted') +
      tile('t-star', IC.star, cnt(prs), prs === 1 ? 'personal best' : 'personal bests') + '</div>';
    h += attentionCard(list);
    var mdN = musData(list), nMus = LIBRARY.MUSCLES.filter(function (m) { return mdN.plan[m.id] || mdN.got[m.id]; }).length;
    h += '<section class="card"><h3>Hard sets per muscle</h3>' +
      '<div class="seg" role="group" aria-label="Period"><button type="button" data-act="mus-win" data-v="week" aria-pressed="' + (state.ui.musWin !== 'four') + '">Last 7 days</button><button type="button" data-act="mus-win" data-v="four" aria-pressed="' + (state.ui.musWin === 'four') + '">4-week average</button></div>' +
      muscleFigure(list) + (musAll ? muscleBars(list) : '') + (nMus ? '<button class="act more" type="button" data-act="mus-all" aria-expanded="' + musAll + '">' + (musAll ? 'Hide the list' : 'All ' + nMus + ' muscles') + '</button>' : '') + '</section>';
    var wk = lastWeeks(10), vw = lastWeeks(10);
    list.forEach(function (s) { var k = weekStart(s.date); wk.forEach(function (w) { if (w.start === k) { if (isCore(s)) w.a++; else w.b++; } }); vw.forEach(function (w) { if (w.start === k) w.a += volOf(s); }); });
    var durs = [], dayIx = {};
    list.forEach(function (s) { var dd = durOf(s); if (!dd) return; var o = dayIx[s.date]; if (!o) { o = dayIx[s.date] = { date: s.date, d: 0, names: [] }; durs.push(o); } o.d += dd; o.names.push(s.name || 'Workout'); });
    durs = durs.slice(-24);
    /* one card for the three weekly trends; what each shows is behind the info button */
    var tr = state.ui.trend === 'vol' || state.ui.trend === 'dur' ? state.ui.trend : 'wk';
    h += '<section class="card"><div class="spread" style="align-items:center"><h3>Trends</h3><button class="info-btn" type="button" data-act="trend-info" aria-expanded="' + trendInfo + '" aria-label="What this chart shows">i</button></div>' +
      '<div class="seg" role="group" aria-label="Which trend"><button type="button" data-act="trend" data-v="wk" aria-pressed="' + (tr === 'wk') + '">Sessions</button><button type="button" data-act="trend" data-v="vol" aria-pressed="' + (tr === 'vol') + '">' + (isLb() ? 'Pounds' : 'Kilograms') + '</button><button type="button" data-act="trend" data-v="dur" aria-pressed="' + (tr === 'dur') + '">Length</button></div>';
    if (trendInfo) h += '<p class="note">' + (tr === 'wk' ? 'Sessions per week for the last 10 weeks. The dashed line is your weekly goal; sessions that do not count toward it are shown as extra.' : tr === 'vol' ? 'Weight lifted per week: weight times reps, added up over every set.' : 'Minutes from start to finish, added up when a day has more than one workout. The line is orange for short days and turns green at 60 minutes.') + '</p>';
    if (tr === 'wk') h += '<div class="chart" data-chart="wk">' +
      colChart('wk', wk, { int: true, min: Math.max(5, goal + 1), target: goal, label: 'Sessions per week for the last 10 weeks', tip: function (w) { return '<b>Week of ' + fmtDate(w.start, true) + '</b><br>' + plural(w.a, 'main session') + (w.b ? ' + ' + w.b + ' extra' : ''); } }) + '</div>' +
      (wk.some(function (w) { return w.b; }) ? '<div class="legend"><span><i></i>Main</span><span><i class="x"></i>Extra</span></div>' : '');
    else if (tr === 'vol') h += '<div class="chart" data-chart="vol">' +
      colChart('vol', vw, { label: 'Weight lifted per week for the last 10 weeks', fmt: function (t) { return t >= 1000 ? (t / 1000) + 'K' : t; }, tip: function (w) { return '<b>Week of ' + fmtDate(w.start, true) + '</b><br>' + compact(w.a) + ' ' + UW() + ' lifted'; } }) + '</div>';
    else h += durs.length ? '<div class="chart" data-chart="dur">' + lineChart('dur', durs.map(function (x) { return { x: x.date, y: Math.round(x.d / 60), tip: '<b>' + fmtDate(x.date) + '</b><br>' + esc(x.names.join(' + ')) + ' · ' + fmtDur(x.d) }; }), null, { scale: [30, 60] }) + '</div><div class="pills"><span class="pill">average ' + fmtDur(durs.reduce(function (a, x) { return a + x.d; }, 0) / durs.length) + '</span></div>' : '<p class="sub">Your next finished workout shows up here.</p>';
    h += '</section>';
    h += '<section class="card"><h3>Milestones</h3>' + badgesHtml(list) + '</section>';
    return h;
  }
  var liftInfo = false, trendInfo = false, musAll = false, attOpen = {};
  function modeSeg() {
    var mode = state.ui.liftMode === 'e1rm' ? 'e1rm' : 'max';
    return '<div class="seg" role="group" aria-label="What to show for weighted lifts"><button type="button" data-act="lift-mode" data-v="max" aria-pressed="' + (mode === 'max') + '">Top weight</button><button type="button" data-act="lift-mode" data-v="e1rm" aria-pressed="' + (mode === 'e1rm') + '">Est. 1-rep max</button></div>';
  }
  /* The order the arrows and a sideways swipe step through: exercises in plan order, then any others by name.
     Only exercises that have something logged, and none of the endurance ones. */
  function liftOrder(list, recs) {
    var ok = {}, seen = {}, out = [], rest = [];
    recs.forEach(function (r) { ok[r.id] = r; });
    routineList().forEach(function (r) { r.items.forEach(function (it) { if (ok[it.ex] && !seen[it.ex]) { seen[it.ex] = 1; out.push(it.ex); } }); });
    recs.forEach(function (r) { if (!seen[r.id]) rest.push(r); });
    rest.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    return out.concat(rest.map(function (r) { return r.id; }));
  }
  /* By muscle: every exercise of one group as a line on the same graph, four at most. Each exercise keeps the colour
     it was given while it stays on the graph. Exercises measured in different units can only be compared as a change. */
  var liftShow = {}, LIFT_MAX = 4;
  function muscleLifts(list, recs, mode, cur) {
    var groups = [], by = {}, order = liftOrder(list, recs), rk = {};
    recs.forEach(function (r) { rk[r.id] = r; });
    order.forEach(function (id) { var r = rk[id], g = r.e.group || 'Other'; if (r.e.log === 'cardio') return; if (!by[g]) { by[g] = []; groups.push(g); } by[g].push(r); });
    if (!groups.length) return '<p class="sub">Log a strength exercise and it appears here.</p>';
    var g = by[state.ui.liftGrp] ? state.ui.liftGrp : (by[cur.group] ? cur.group : groups[0]), rs = by[g], show = liftShow[g];
    if (!show) { show = liftShow[g] = {}; rs.slice().sort(function (a, b) { return a.lastDate < b.lastDate ? 1 : -1; }).slice(0, LIFT_MAX).sort(function (a, b) { return rs.indexOf(a) - rs.indexOf(b); }).forEach(function (r, i) { show[r.id] = i; }); }
    Object.keys(show).forEach(function (id) { if (!rk[id]) delete show[id]; });
    var units = {}; rs.forEach(function (r) { units[metricUnit(r.e)] = 1; });
    var mixed = Object.keys(units).length > 1, pct = mixed || !!state.ui.liftPct, anyWr = rs.some(function (r) { return r.e.log === 'wr'; }), unit = pct ? '%' : metricUnit(rs[0].e);
    if (!anyWr && mode === 'e1rm') mode = 'max';
    var sers = [];
    rs.forEach(function (r) {
      if (show[r.id] == null) return;
      var first = null, pts = historyOf(r.id, list).map(function (x) { var v = liftVal(r.e, x.sets, mode, x.warm); if (first == null && v > 0) first = v; return { x: x.date, raw: v, y: pct ? (first ? Math.round((v / first - 1) * 1000) / 10 : 0) : v }; });
      sers.push({ id: r.id, name: r.name, slot: show[r.id], e: r.e, pts: pts });
    });
    var h = '<div class="chips" role="group" aria-label="Muscle group">' + groups.map(function (x) { return '<button class="chip" type="button" data-act="lift-grp" data-v="' + esc(x) + '" aria-pressed="' + (x === g) + '">' + esc(x) + '</button>'; }).join('') + '</div>';
    h += '<div class="lchips" role="group" aria-label="Exercises on the graph">' + rs.map(function (r) {
      var on = show[r.id] != null;
      return '<button class="lchip" type="button" data-act="lift-line" data-g="' + esc(g) + '" data-ex="' + esc(r.id) + '" aria-pressed="' + on + '"><i' + (on ? ' style="background:var(--cat-' + (show[r.id] + 1) + ')"' : '') + '></i><span>' + esc(r.name) + '</span></button>';
    }).join('') + '</div>';
    if (liftInfo) h += '<p class="note">One line per exercise, up to ' + LIFT_MAX + ' at a time. Tap a name to hide or show its line.' + (pct ? ' The change is measured from each exercise\'s first logged workout, so light and heavy lifts can be compared.' : '') + (mixed ? ' These exercises are measured in different units, so only the change can be shown.' : '') + (mode === 'tot' ? ' Total is weight × reps added up over every set that day.' : '') + ' Tap the graph to see a day.</p>';
    h += sers.length ? '<div class="chart" data-chart="mus">' + multiChart('mus', sers, { pct: pct, unit: unit }) + '</div>' : '<p class="sub" style="padding:36px 0;text-align:center">Tap a name to show its line.</p>';
    h += '<div class="opt-row">' + modePills(anyWr) + (mixed ? '<span class="opt-note">Change since the start, %</span>' : pctPill(pct)) + '</div>';
    return h;
  }
  function multiChart(id, sers, opt) {
    var W = chartW(), H = 200, m = { l: 38, r: 46, t: 14, b: 24 }, all = [], ts = [], dates = {}, ends = [];
    sers.forEach(function (se) { se.pts.forEach(function (p) { all.push(p.y); p.t = toDate(p.x).getTime(); ts.push(p.t); dates[p.x] = 1; }); });
    if (opt.pct) all.push(0);
    var x0 = Math.min.apply(null, ts), x1 = Math.max.apply(null, ts), ticks = niceTicks(Math.min.apply(null, all), Math.max.apply(null, all), 3), y0 = ticks[0], y1 = ticks[ticks.length - 1];
    function X(v) { return x1 === x0 ? m.l + (W - m.l - m.r) / 2 : m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); }
    function Y(v) { return H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b); }
    function val(p, e) { return opt.pct ? (p.y > 0 ? '+' : p.y < 0 ? '−' : '') + fmt(Math.abs(p.y)) + '% (' + big(p.raw) + ' ' + metricUnit(e) + ')' : big(p.y) + ' ' + metricUnit(e); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Line chart comparing ' + sers.map(function (x) { return x.name; }).join(', ') + '">';
    ticks.forEach(function (t) { s += '<line class="grid' + (opt.pct && t === 0 ? ' zero' : '') + '" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + (t >= 1000 ? (t / 1000) + 'K' : fmt(t)) + (opt.pct ? '%' : '') + '</text>'; });
    s += '<line class="cross" id="' + id + '-x" y1="' + m.t + '" y2="' + (H - m.b) + '" x1="0" x2="0" visibility="hidden"/>';
    sers.forEach(function (se) {
      var P = se.pts.map(function (p) { return [X(p.t), Y(p.y)]; }), c = 'var(--cat-' + (se.slot + 1) + ')', e = P[P.length - 1];
      if (P.length > 1) s += '<path class="ln draw" pathLength="1" style="stroke:' + c + '" d="' + smoothPath(P) + '"/>';
      s += '<circle class="mdot" r="4.5" style="fill:' + c + '" cx="' + e[0].toFixed(1) + '" cy="' + e[1].toFixed(1) + '"/>';
      var lp = se.pts[se.pts.length - 1]; ends.push({ x: e[0], y: e[1], t: opt.pct ? (lp.y > 0 ? '+' : lp.y < 0 ? '−' : '') + fmt(Math.abs(Math.round(lp.y))) + '%' : big(lp.y) });
    });
    /* one number at the end of each line, no unit; numbers that would sit on top of each other are spread apart */
    ends.sort(function (a, b) { return a.y - b.y; });
    var gap = 14, i;
    for (i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < gap) ends[i].y = ends[i - 1].y + gap;
    if (ends.length && ends[ends.length - 1].y > H - m.b) { ends[ends.length - 1].y = H - m.b; for (i = ends.length - 2; i >= 0; i--) if (ends[i + 1].y - ends[i].y < gap) ends[i].y = ends[i + 1].y - gap; }
    ends.forEach(function (q) { s += '<text class="val" x="' + (q.x + 9).toFixed(1) + '" y="' + (q.y + 4).toFixed(1) + '">' + q.t + '</text>'; });
    var ds = Object.keys(dates).sort();
    s += '<text x="' + X(x0) + '" y="' + (H - 6) + '" text-anchor="' + (x1 === x0 ? 'middle' : 'start') + '">' + fmtDate(ds[0], true) + '</text>';
    if (x1 !== x0) s += '<text x="' + X(x1) + '" y="' + (H - 6) + '" text-anchor="end">' + fmtDate(ds[ds.length - 1], true) + '</text>';
    s += '</svg><div class="tip" id="' + id + '-t" hidden></div>';
    charts[id] = { type: 'multi', W: W, top: m.t, cols: ds.map(function (d) {
      var rows = []; sers.forEach(function (se) { se.pts.forEach(function (p) { if (p.x === d) rows.push('<span class="trow"><i style="background:var(--cat-' + (se.slot + 1) + ')"></i>' + esc(se.name) + ' · ' + val(p, se.e) + '</span>'); }); });
      return { x: X(toDate(d).getTime()), html: '<b>' + fmtDate(d) + '</b>' + rows.join('') };
    }) };
    return s;
  }
  /* the small options under the Exercise progress graph: the same place in both views, metric on the left */
  function modePills(anyWr) {
    var mode = liftModeNow(), opts = anyWr ? [['max', 'Top weight'], ['e1rm', 'Est. 1RM'], ['tot', 'Total']] : [['max', 'Best set'], ['tot', 'Total']];
    if (!anyWr && mode === 'e1rm') mode = 'max';
    return '<div class="mseg" role="group" aria-label="What to measure">' + opts.map(function (o) { return '<button class="opt" type="button" data-act="lift-mode" data-v="' + o[0] + '" aria-pressed="' + (mode === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function pctPill(on) { return '<button class="opt solo end" type="button" data-act="lift-pct" aria-pressed="' + on + '" aria-label="Show the change since the start in percent">%</button>'; }
  /* every time an exercise beat its own best, oldest first; the first time an exercise is logged is not a record */
  function recordEvents(list) {
    var best = {}, out = [];
    list.forEach(function (sn) {
      (sn.entries || []).forEach(function (en) {
        var e = exi(en.ex, en.name), mv = e.sport ? null : metric(e, en.sets); if (mv == null) return;
        if (best[en.ex] != null && mv > best[en.ex] + 1e-9) out.push({ id: en.ex, e: e, name: e.gone ? en.name : e.name, date: sn.date, sets: en.sets });
        if (best[en.ex] == null || mv > best[en.ex]) best[en.ex] = mv;
      });
    });
    return out;
  }
  function bestNum(e, sets) {
    var bs = bestSet(e, sets, 'e1rm');
    return e.log === 'wr' ? '<b class="num">' + fmt(bs.w) + '<small>' + UW() + ' × ' + bs.r + '</small></b>' : '<b class="num">' + fmt(bs.r) + '<small>' + metricUnit(e) + '</small></b>';
  }
  /* Personal bests: when records were set (eight weeks), the newest ones, then every best as a tile */
  var pbWeek = null, pbAll = false;
  function bestsCard(list) {
    var recs = records(list), ev = recordEvents(list), td = today(), weeks = lastWeeks(8), h = '', max = 1;
    if (!recs.length) return '';
    ev.forEach(function (x) { var k = weekStart(x.date); weeks.forEach(function (w) { if (w.start === k) w.a++; }); });
    weeks.forEach(function (w) { if (w.a > max) max = w.a; });
    if (pbWeek && !weeks.some(function (w) { return w.start === pbWeek; })) pbWeek = null;
    var n4 = ev.filter(function (x) { return x.date >= addDays(td, -27); }).length;
    h += '<section class="card"><h3>Personal bests</h3>';
    h += '<p class="pb-head"><b class="num">' + n4 + '</b> ' + (n4 === 1 ? 'record' : 'records') + ' in the last four weeks</p>';
    h += '<div class="pbweeks" role="group" aria-label="Records set in each of the last eight weeks">' + weeks.map(function (w, i) {
      var ago = weeks.length - 1 - i;
      return '<button class="pbw' + (w.a ? '' : ' none') + '" type="button" data-act="pb-week" data-v="' + w.start + '" aria-pressed="' + (pbWeek === w.start) + '" aria-label="Week of ' + fmtDate(w.start, true) + ', ' + plural(w.a, 'record') + '">' +
        (w.a ? '<b>' + w.a + '</b>' : '') + '<i style="height:' + (w.a ? Math.max(12, Math.round(w.a / max * 100)) + '%' : '3px') + '"></i><span>' + (ago ? ago + 'w' : 'now') + '</span></button>';
    }).join('') + '</div>';
    var pick = ev.filter(function (x) { return pbWeek ? weekStart(x.date) === pbWeek : x.date >= addDays(td, -13); }), seen = {}, fresh = [];
    for (var i = pick.length - 1; i >= 0; i--) if (!seen[pick[i].id]) { seen[pick[i].id] = 1; fresh.push(pick[i]); }
    h += '<h4 class="pb-h">' + (pbWeek ? 'Week of ' + fmtDate(pbWeek, true) : 'New in the last two weeks') + '</h4>';
    h += fresh.length ? '<div class="pb-row">' + fresh.map(function (x) { return '<button class="pb-new" type="button" data-act="lift" data-ex="' + esc(x.id) + '">' + bestNum(x.e, x.sets) + '<span>' + esc(x.name) + '</span><em>' + fmtDate(x.date, true) + '</em></button>'; }).join('') + '</div>'
      : '<p class="sub">' + (pbWeek ? 'No records that week.' : 'No records in the last two weeks. The next one shows up here.') + '</p>';
    var groups = [], by = {}, rk = {}; recs.forEach(function (r) { rk[r.id] = r; });
    liftOrder(list, recs).forEach(function (id) { var g = rk[id].e.group || 'Other'; if (!by[g]) { by[g] = 1; groups.push(g); } });
    var grp = by[state.ui.pbGrp] ? state.ui.pbGrp : '', sort = state.ui.pbSort === 'top' || state.ui.pbSort === 'gain' ? state.ui.pbSort : 'new';
    function gain(r) { return r.n >= 2 && r.first > 0 && r.last > r.first ? (r.last - r.first) / r.first : -1; }
    function heavy(r) { return r.e.log === 'wr' ? 1e6 + bestSet(r.e, r.sets, 'e1rm').w : r.best; }
    var rs = recs.filter(function (r) { return !grp || (r.e.group || 'Other') === grp; }).sort(function (a, b) {
      var d = sort === 'top' ? heavy(b) - heavy(a) : sort === 'gain' ? gain(b) - gain(a) : (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
      return d || (a.name < b.name ? -1 : 1);
    }), total = rs.length;
    h += '<h4 class="pb-h">Every best</h4>';
    h += '<div class="chips" role="group" aria-label="Muscle group"><button class="chip" type="button" data-act="pb-grp" data-v="" aria-pressed="' + !grp + '">All</button>' + groups.map(function (g) { return '<button class="chip" type="button" data-act="pb-grp" data-v="' + esc(g) + '" aria-pressed="' + (g === grp) + '">' + esc(g) + '</button>'; }).join('') + '</div>';
    h += '<div class="opt-row"><div class="mseg" role="group" aria-label="Order">' + [['new', 'Newest'], ['top', 'Heaviest'], ['gain', 'Biggest gain']].map(function (o) { return '<button class="opt" type="button" data-act="pb-sort" data-v="' + o[0] + '" aria-pressed="' + (sort === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>';
    if (!pbAll) rs = rs.slice(0, 6);
    h += '<div class="pb-grid">' + rs.map(function (r) {
      var isNew = r.prs > 0 && r.date >= addDays(td, -13), gn = gain(r);
      return '<button class="pb-tile" type="button" data-act="lift" data-ex="' + esc(r.id) + '">' + (isNew ? '<i class="pb-badge">New</i>' : '') + bestNum(r.e, r.sets) + '<span>' + esc(r.name) + '</span><em>' + (sort === 'gain' && gn > 0 ? '+' + Math.round(gn * 100) + '% since the start' : fmtDate(r.date, true)) + '</em></button>';
    }).join('') + '</div>';
    if (total > 6) h += '<button class="opt solo" type="button" data-act="pb-all" style="align-self:flex-start">' + (pbAll ? 'Show fewer' : 'Show all ' + total) + '</button>';
    return h + '</section>';
  }
  function liftsView(list) {
    var h = '', mode = liftModeNow(), recs = records(list, mode === 'tot' ? 'max' : mode);
    var exId = state.ui.ex && historyOf(state.ui.ex, list).length ? state.ui.ex : null;
    if (!exId && recs.length) { var byDate = recs.slice().sort(function (a, b) { return a.lastDate < b.lastDate ? 1 : -1; }); exId = byDate[0].id; routineList().some(function (r) { return r.items.some(function (it) { if (historyOf(it.ex, list).length) { exId = it.ex; return true; } return false; }); }); }
    if (!exId) return '<p class="empty">Log a workout and your lifts appear here.</p>';
    var e = exi(exId), hist = historyOf(exId, list), wr = e.log === 'wr', pct = !!state.ui.liftPct, em = wr ? mode : (mode === 'tot' ? 'tot' : 'max'), unit = metricUnit(e);
    var onGraph = state.ui.liftSets === 'graph' && em !== 'tot' && !pct, extra = [];
    if (onGraph) hist.forEach(function (x) {
      var by = {};
      x.sets.forEach(function (st) { var v = liftVal(e, [st], em), k = String(Math.round(v * 100) / 100); (by[k] = by[k] || { v: v, sets: [] }).sets.push(st); });
      Object.keys(by).forEach(function (k) { extra.push({ x: x.date, y: by[k].v, tip: '<b>' + fmtDate(x.date) + '</b><br>' + esc(setsText(e, by[k].sets)) }); });
    });
    var order = liftOrder(list, recs), at = order.indexOf(exId), byMus = state.ui.liftView === 'mus';
    h += '<section class="card"><div class="spread" style="align-items:center"><h3>Exercise progress</h3><button class="info-btn" type="button" data-act="lift-info" aria-expanded="' + liftInfo + '" aria-label="What this chart shows">i</button></div>' +
      '<div class="seg" role="group" aria-label="What to compare"><button type="button" data-act="lift-view" data-v="one" aria-pressed="' + !byMus + '">One exercise</button><button type="button" data-act="lift-view" data-v="mus" aria-pressed="' + byMus + '">By muscle</button></div>';
    if (byMus) h += muscleLifts(list, recs, mode, e) + '</section>';
    else {
      h += '<div class="lift-nav">' +
        (order.length > 1 ? '<button class="icon-btn" type="button" data-act="lift" data-ex="' + esc(order[(at - 1 + order.length) % order.length]) + '" data-step="-1" aria-label="Previous exercise">' + IC.left + '</button>' : '') +
        '<button class="btn lift-name" type="button" data-act="pick-lift" aria-label="' + esc(e.name) + ', choose another exercise"><span>' + esc(e.name) + '</span>' + (order.length > 1 ? '<small>' + (at + 1) + ' of ' + order.length + '</small>' : '') + '</button>' +
        (order.length > 1 ? '<button class="icon-btn" type="button" data-act="lift" data-ex="' + esc(order[(at + 1) % order.length]) + '" data-step="1" aria-label="Next exercise">' + IC.right + '</button>' : '') + '</div>';
      /* the latest value and the best for each measure; tapping one puts it on the graph */
      var ms = wr ? [['max', 'Top weight'], ['e1rm', 'Est. 1RM'], ['tot', 'Total']] : [['max', e.log === 'bw' ? 'Most reps' : e.log === 'time' ? 'Longest hold' : 'Longest'], ['tot', e.log === 'bw' ? 'Total reps' : 'Total time']];
      h += '<div class="stats' + (ms.length === 2 ? ' two' : '') + '" role="group" aria-label="What to show on the graph">' + ms.map(function (q) {
        var vs = hist.map(function (x) { return liftVal(e, x.sets, q[0], x.warm); }), lastV = vs[vs.length - 1], bestV = Math.max.apply(null, vs);
        return '<button class="stat" type="button" data-act="lift-mode" data-v="' + q[0] + '" aria-pressed="' + (q[0] === em) + '"><small>' + q[1] + '</small><b class="num">' + big(lastV) + '<i>' + unit + '</i></b><span>best ' + big(bestV) + '</span></button>';
      }).join('') + '</div>';
      var vals = hist.map(function (x) { return liftVal(e, x.sets, em, x.warm); }), first = null, bi = 0;
      vals.forEach(function (v, i) { if (first == null && v > 0) first = v; if (v > vals[bi] + 1e-9) bi = i; });
      function ch(v) { return first ? Math.round((v / first - 1) * 1000) / 10 : 0; }
      function sg(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(Math.round(v))) + '%'; }
      if (liftInfo) h += '<p class="note">' + (em === 'tot' ? 'Total is ' + (wr ? 'weight × reps' : 'the ' + unit) + ' added up over every set that day.' : wr ? (em === 'max' ? 'Top weight is the heaviest weight you used in each workout.' : 'Estimated 1-rep max, from the best set of each workout: weight × (1 + reps ÷ 30). It lets sets with different weights and reps be compared.') : esc(metricLabel(e)) + ' in each workout.') +
        ' Each tile shows the latest workout and your best; tap one to graph it. The orange ring and dashed line mark the best.' + (pct ? ' % is the change since your first workout with this exercise.' : '') + ' Tap the graph to see the sets.' + (onGraph ? ' Grey dots are the sets below the top one.' : '') + '</p>';
      h += '<div class="chart" data-chart="exc">' + lineChart('exc', hist.map(function (x, i) {
        return { x: x.date, y: pct ? ch(vals[i]) : vals[i], tip: '<b>' + fmtDate(x.date) + '</b><br>' + esc(setsText(e, onGraph ? [bestSet(e, x.sets, em)] : x.sets)) + (em === 'tot' ? '<br>Total ' + big(vals[i]) + ' ' + unit : '') + (pct ? '<br>' + sg(ch(vals[i])) + ' since the start' : '') + (i === bi && vals.length > 1 ? '<br>Your best' : '') };
      }), null, { up: true, extra: extra, bars: em === 'tot' && !pct, best: bi, fmt: pct ? function (t) { return fmt(t) + '%'; } : function (t) { return t >= 1000 ? (t / 1000) + 'K' : fmt(t); }, end: pct ? sg : big }) + '</div>';
      h += '<div class="opt-row">' + (em !== 'tot' && !pct ? '<button class="opt solo" type="button" data-act="lift-sets" data-v="' + (onGraph ? 'off' : 'graph') + '" aria-pressed="' + onGraph + '">All sets</button>' : '') + pctPill(pct) + '</div>';
      h += '</section>';
    }
    return h + bestsCard(list);
  }
  function measures() { var w = UW(), l = UL(); return [['weight', 'Weight', w], ['waist', 'Waist', l], ['chest', 'Chest', l], ['arm', 'Arm', l], ['thigh', 'Thigh', l]]; }
  function bodyView(demo) {
    var MEASURES = measures(), body = demo ? demoBody() : state.body, ms = MEASURES.filter(function (m) { return m[0] === state.ui.measure; })[0] || MEASURES[0], key = ms[0], unit = ms[2], h = '';
    h += '<div class="chips" role="group" aria-label="Measurement">' + MEASURES.map(function (m) { return '<button class="chip" type="button" data-act="measure" data-v="' + m[0] + '" aria-pressed="' + (m[0] === key) + '">' + m[1] + '</button>'; }).join('') + '</div>';
    var keys = Object.keys(body).sort().filter(function (k) { return body[k][key] != null; }), pts = keys.map(function (k) { return { x: k, y: body[k][key], tip: '<b>' + fmtDate(k) + '</b><br>' + fmt(body[k][key]) + ' ' + unit }; });
    var trend = pts.map(function (p, i) { var from = addDays(p.x, -6), s = 0, n = 0; for (var j = i; j >= 0 && pts[j].x >= from; j--) { s += pts[j].y; n++; } return Math.round(s / n * 100) / 100; });
    if (pts.length) {
      var latest = trend[trend.length - 1], ref = null, refDate = addDays(pts[pts.length - 1].x, -28);
      for (var i = 0; i < pts.length; i++) if (pts[i].x >= refDate) { ref = { v: trend[i], x: pts[i].x }; break; }
      var days = ref ? Math.round((toDate(pts[pts.length - 1].x) - toDate(ref.x)) / 864e5) : 0, diff = ref ? latest - ref.v : 0;
      h += '<div class="tiles three"><div class="tile"><b>' + fmt(Math.round(pts[pts.length - 1].y * 10) / 10) + '</b><span>latest, ' + unit + '</span></div>' +
        '<div class="tile"><b>' + (days >= 7 ? (diff >= 0 ? '+' : '−') + fmt(Math.abs(Math.round(diff * 10) / 10)) : '–') + '</b><span>' + (days >= 7 ? 'change in ' + days + ' days' : 'change, needs a week of entries') + '</span></div>' +
        '<div class="tile"><b>' + (days >= 7 ? (diff >= 0 ? '+' : '−') + fmt(Math.abs(Math.round(diff / days * 7 * 100) / 100)) : '–') + '</b><span>' + unit + ' per week</span></div></div>';
    }
    if (key === 'weight' && state.settings.goalWeight && pts.length && !demo) h += goalCard(pts, trend);
    h += '<section class="card"><div class="spread"><h3>' + ms[1] + '</h3>' + (pts.length > 1 ? '<div class="legend"><span><i class="dot-k"></i>Each entry</span><span><i style="height:2px;border-radius:0;width:14px"></i>7-day average</span></div>' : '') + '</div><div class="chart" data-chart="bw">' + lineChart('bw', pts, pts.length > 1 ? trend : null) + '</div></section>';
    h += '<section class="card"><h3>Add a measurement</h3><form class="body-form" id="body-form"><label class="wide">Date<input id="bw-d" type="date" value="' + today() + '" max="' + today() + '"></label>' +
      '<label>Weight, ' + UW() + '<input id="bw-weight" type="text" inputmode="decimal" autocomplete="off"></label><label>Waist, ' + UL() + '<input id="bw-waist" type="text" inputmode="decimal" autocomplete="off" placeholder="optional"></label>' +
      '<label>Chest, ' + UL() + '<input id="bw-chest" type="text" inputmode="decimal" autocomplete="off" placeholder="optional"></label><label>Arm, ' + UL() + '<input id="bw-arm" type="text" inputmode="decimal" autocomplete="off" placeholder="optional"></label>' +
      '<label>Thigh, ' + UL() + '<input id="bw-thigh" type="text" inputmode="decimal" autocomplete="off" placeholder="optional"></label><button class="btn" type="submit" style="align-self:end">Save</button></form>' +
      '<p class="foot">Weigh in on 3–4 mornings a week and watch the average, not single days. Measure in the same spot each time.</p></section>';
    var all = Object.keys(state.body).sort().reverse();
    if (all.length && !demo) {
      h += '<section class="card"><h3>Entries</h3><table class="hist"><tbody>';
      all.slice(0, 12).forEach(function (k) { var b = state.body[k], parts = []; MEASURES.forEach(function (m) { if (b[m[0]] != null) parts.push(m[1].toLowerCase() + ' ' + fmt(b[m[0]]) + ' ' + m[2]); }); h += '<tr><td>' + fmtDate(k) + '</td><td>' + esc(parts.join(' · ')) + '</td><td class="del"><button class="icon-btn" type="button" data-act="body-del" data-id="' + k + '" aria-label="Delete the entry for ' + fmtDate(k) + '">' + IC.x + '</button></td></tr>'; });
      h += '</tbody></table></section>';
    }
    return h;
  }
  function progressView() {
    var real = finished(), sub = state.ui.prog, demo = sub === 'endur' ? false : sub === 'body' ? !Object.keys(state.body).length : !real.length, list = real.length ? real : demoSessions(), h = '';
    h += '<div class="seg" role="group" aria-label="Progress section">' + [['overview', 'Overview'], ['lifts', 'Lifts'], ['endur', 'Endurance'], ['body', 'Body']].map(function (s) { return '<button type="button" data-act="prog" data-v="' + s[0] + '" aria-pressed="' + (sub === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>';
    if (demo) h += '<p class="demo"><b>Example data.</b> ' + (sub === 'body' ? 'These are made-up measurements so you can see how this page works. Your own replace them after your first entry.' : 'This is a made-up eight weeks so you can see how this page works. Your own numbers replace it after your first saved workout.') + '</p>';
    return h + (sub === 'endur' ? endurView() : sub === 'lifts' ? liftsView(list) : sub === 'body' ? bodyView(demo) : overviewView(list, demo));
  }

  /* ================= exercises tab and picker ================= */
  var libQ = '';
  function matchEx(e, q) { if (!q) return true; var hay = (e.name + ' ' + e.equip + ' ' + e.group + ' ' + muscleNames(e).join(' ')).toLowerCase(); return q.toLowerCase().split(/\s+/).every(function (t) { return hay.indexOf(t) >= 0; }); }
  function libRows(filter, q, mode) {
    var list = allEx().filter(function (e) { return matchEx(e, q) && (filter === 'all' || filter === 'logged' || e.group === filter); }), h = '';
    if (mode === 'tile') { var have = outList(), keep = picker && picker.i >= 0 ? have[picker.i] : null; list = list.filter(function (e) { return e.log === 'cardio' && (have.indexOf(e.id) < 0 || e.id === keep); }); }
    if (filter === 'logged') { var has = {}; finished().forEach(function (s) { (s.entries || []).forEach(function (en) { has[en.ex] = 1; }); }); list = list.filter(function (e) { return has[e.id]; }); }
    if (!list.length) return '<p class="empty">' + (filter === 'logged' ? 'Nothing logged yet.' : 'No exercise matches that. You can create your own below.') + '</p>';
    GROUPS.forEach(function (g) {
      var rows = list.filter(function (e) { return e.group === g; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
      if (!rows.length) return;
      h += '<div class="lib-head"><span>' + g + '</span><small>' + rows.length + '</small></div>';
      rows.forEach(function (e) {
        h += '<button class="lib-row" type="button" data-act="' + (mode ? 'pick' : 'open-ex') + '" data-ex="' + esc(e.id) + '"><span class="thumb">' + illoSvg(e.illo) + '</span><span><b>' + esc(e.name) + '</b><small>' + esc(exSub(e)) + '</small></span>' + (mode ? '<span class="plus" aria-hidden="true">' + (mode === 'lift' ? '›' : '+') + '</span>' : '<span class="chev" aria-hidden="true">›</span>') + '</button>';
      });
    });
    return h;
  }
  function chipsHtml(cur, act, extra, groups) {
    return '<div class="chips" role="group" aria-label="Filter">' + (extra || []).concat([['all', 'All']], (groups || GROUPS).map(function (g) { return [g, g]; })).map(function (c) { return '<button class="chip" type="button" data-act="' + act + '" data-key="' + c[0] + '" aria-pressed="' + (cur === c[0]) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>';
  }
  function searchBox(id, val) { return '<div class="search">' + IC.search + '<input id="' + id + '" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search ' + allEx().length + ' exercises" value="' + esc(val) + '" aria-label="Search exercises"></div>'; }
  function libraryView() {
    /* once, the list moves to "In my plan": the exercises you train are a short list and the rest is one tap or a search away */
    if (!state.ui.libPlan) { state.ui.libPlan = 1; if (routineList().length) state.ui.lib = 'mine'; saveLocal(); }
    var f = state.ui.lib || 'all', h = searchBox('lib-q', libQ) + chipsHtml(f, 'lib', [['mine', 'In my plan']]);
    if (f === 'mine' && !libQ) {
      routineList().forEach(function (r) {
        h += '<section class="card"><div><h2>' + esc(r.name) + '</h2>' + (r.focus ? '<p class="sub">' + esc(r.focus) + '</p>' : '') + '</div><div class="guide">';
        r.items.forEach(function (it) {
          var e = exi(it.ex);
          h += '<button class="g-item" type="button" data-act="open-ex" data-ex="' + esc(it.ex) + '" data-rk="' + esc(r.id) + '"><div class="illo">' + illoSvg(e.illo, null, true) + '</div><div><div class="g-name">' + (it.n ? '<span class="exc-n">' + esc(it.n) + '</span>' : '') + esc(e.name) + '</div>' +
            (it.detail ? '<div class="g-detail">' + esc(it.detail) + '</div>' : '') + '<p class="g-cue">' + esc(it.cue || e.cue) + '</p><p class="g-meta">' + esc(targetOf(it, e)) + '</p></div></button>';
        });
        h += '</div></section>';
      });
    } else h += '<div id="lib-list">' + libRows(f === 'mine' ? 'all' : f, libQ, null) + '</div>';
    h += '<button class="add-ex" type="button" data-act="create-ex">+ Create your own exercise</button>' +
      '<p class="foot">Orange marks the muscles doing most of the work. The figures are simplified sketches of each movement.</p>';
    return h;
  }

  /* ================= sheets ================= */
  var scrim = document.getElementById('scrim'), sheet = document.getElementById('sheet');
  function openSheet(html, tall) { sheet.className = 'sheet' + (tall ? ' tall' : ''); sheet.innerHTML = html; scrim.hidden = false; sheet.scrollTop = 0; document.documentElement.style.overflow = 'hidden'; observe(); }
  function closeSheet() { scrim.hidden = true; sheet.innerHTML = ''; armed = null; picker = null; help = null; document.documentElement.style.overflow = ''; observe(); }
  function head(title, sub) { return '<div class="sheet-head"><div><h2>' + esc(title) + '</h2>' + (sub ? '<p class="sub">' + esc(sub) + '</p>' : '') + '</div><button class="btn quiet" type="button" data-act="sheet-x">Close</button></div>'; }
  function exSheet(exId, ctx) {
    var e = exi(exId), it = null, d = state.draft;
    if (ctx && ctx.u) it = findItem(ctx.u);
    if (!it && ctx && ctx.rk) { var r = getRoutine(ctx.rk); if (r) it = r.items.filter(function (x) { return x.ex === exId; })[0]; }
    var base = it || { sets: e.sets, lo: e.lo, hi: e.hi, restSec: e.restSec, rir: e.rir };
    var main = muscleNames(e, true), all = muscleNames(e), assist = all.filter(function (m) { return main.indexOf(m) < 0; });
    var rec = records(finished()).filter(function (r) { return r.id === exId; })[0], hist = historyOf(exId);
    var h = head(e.name, [e.equip, it && it.detail ? it.detail : e.detail].filter(Boolean).join(' · ')) + '<div class="illo big">' + illoSvg(e.illo, null, true) + '</div><dl>';
    if ((it && it.cue) || e.cue) h += '<div><dt>How</dt><dd>' + esc((it && it.cue) || e.cue) + '</dd></div>';
    h += '<div><dt>' + (it ? 'Target' : 'Usual target') + '</dt><dd>' + esc(targetOf(base, e)) + '</dd></div>';
    if (all.length) h += '<div><dt>Muscles</dt><dd>' + esc(main.join(', ')) + (assist.length ? (main.length ? '; ' : '') + 'assisting: ' + esc(assist.join(', ').toLowerCase()) : '') + '</dd></div>';
    var why = (it && it.why) || e.why, swap = (it && it.swap) || e.swap;
    if (why) h += '<div><dt>Why it is in the plan</dt><dd>' + esc(why) + '</dd></div>';
    if (swap) h += '<div><dt>Swap if needed</dt><dd>' + esc(swap) + '</dd></div>';
    if (rec) h += '<div><dt>Your best set</dt><dd>' + esc(setsText(e, [topSet(e, rec.sets)])) + ' on ' + fmtDate(rec.date) + (e.log === 'wr' ? ' (estimated 1-rep max ' + fmt(Math.round(rec.best * 10) / 10) + ' ' + UW() + ')' : '') + '</dd></div>';
    h += '</dl>';
    if (hist.length) { h += '<table class="hist"><tbody>'; hist.slice(-3).reverse().forEach(function (x) { h += '<tr><td>' + fmtDate(x.date) + '</td><td>' + esc(setsText(e, x.sets)) + '</td></tr>'; }); h += '</tbody></table>'; }
    h += '<div class="row">';
    if (d && !d.editing && !(ctx && ctx.u)) h += '<button class="btn" type="button" data-act="add-this" data-ex="' + esc(exId) + '">Add to this workout</button>';
    if (hist.length) h += '<button class="btn" type="button" data-act="lift" data-ex="' + esc(exId) + '">See progress</button>';
    if (e.custom) h += '<button class="btn danger" type="button" data-act="custom-del" data-ex="' + esc(exId) + '">' + (armed === 'cdel' + exId ? 'Tap again to delete' : 'Delete exercise') + '</button>';
    h += '</div>';
    openSheet(h);
  }
  function sessionSheet(id) {
    var s = state.sessions[id]; if (!s) return;
    var du = durOf(s), vol = volOf(s);
    var h = head(s.name || 'Workout', fmtDate(s.date) + ' · ' + countSets(s) + ' sets' + (du ? ' · ' + fmtDur(du) : '') + (vol ? ' · ' + compact(vol) + ' ' + UW() + ' lifted' : ''));
    (s.entries || []).forEach(function (en) { var e = exi(en.ex, en.name); h += '<div class="sess-entry"><b>' + esc(e.gone ? en.name : e.name) + '</b>' + (en.warm && en.warm.length ? '<span class="warm-l">Warm-up: ' + esc(setsText(e, en.warm)) + '</span>' : '') + '<span>' + esc(setsText(e, en.sets)) + '</span>' + rirLine(en.sets) + (en.note ? '<span>Note: ' + esc(en.note) + '</span>' : '') + '</div>'; });
    if (s.notes) h += '<p class="sub">Notes: ' + esc(s.notes) + '</p>';
    h += '<div class="row"><button class="btn primary-sm" type="button" data-act="again" data-id="' + esc(id) + '"' + (state.draft ? ' disabled' : '') + '>Do this again</button><button class="btn" type="button" data-act="edit-session" data-id="' + esc(id) + '"' + (state.draft ? ' disabled' : '') + '>Edit</button><button class="btn danger" type="button" data-act="delete-session" data-id="' + esc(id) + '">' + (armed === 'del' + id ? 'Tap again to delete' : 'Delete') + '</button></div>';
    if (state.draft) h += '<p class="foot">Finish or discard the workout in progress before editing or repeating an older one.</p>';
    openSheet(h);
  }
  function rirLine(sets) { return sets.some(function (x) { return x.rir != null; }) ? '<span>Reps left in the tank: ' + sets.map(function (x) { return x.rir == null ? '–' : x.rir >= 3 ? '3+' : x.rir; }).join(', ') + '</span>' : ''; }
  function menuSheet(u) {
    var d = state.draft, it = findItem(u); if (!it) return;
    var i = d.items.indexOf(it), e = exi(it.ex);
    openSheet(head(e.name) + '<div class="menu"><button type="button" data-act="open-ex" data-ex="' + esc(it.ex) + '" data-u="' + u + '">How to do it</button>' +
      (e.log === 'wr' && !d.editing ? '<button type="button" data-act="help-open" data-u="' + u + '">' + (isBar(e) ? 'Plates and warm-up weights' : 'Warm-up weights') + '</button>' : '') +
      (e.log === 'wr' ? '<button type="button" data-act="step-open" data-u="' + u + '">Weight step</button>' : '') +
      '<button type="button" data-act="' + (d.editing ? 'ex-replace' : 'swap-open') + '" data-u="' + u + '">Swap for another exercise</button>' +
      (it.rows.length > 1 || (it.warm && it.warm.length) ? '<button type="button" data-act="del-set" data-u="' + u + '">Remove set</button>' : '') +
      '<button type="button" data-act="ex-up" data-u="' + u + '"' + (i ? '' : ' disabled') + '>Move up</button><button type="button" data-act="ex-down" data-u="' + u + '"' + (i < d.items.length - 1 ? '' : ' disabled') + '>Move down</button>' +
      '<button type="button" class="danger" data-act="ex-remove" data-u="' + u + '">Remove from this workout</button></div>');
  }
  function clockSheet() {
    var d = state.draft; if (!d) return; var st = new Date(d.startedAt);
    openSheet(head('Date and time', 'Started ' + fmtDate(iso(st)) + ' at ' + pad(st.getHours()) + ':' + pad(st.getMinutes())) +
      '<label class="fld">Workout date<input id="draft-date" type="date" value="' + esc(d.date) + '" max="' + today() + '"></label>' +
      '<label class="fld">Start time<input id="clock-t" type="time" value="' + pad(st.getHours()) + ':' + pad(st.getMinutes()) + '"></label>' +
      '<div class="row"><button class="btn" type="button" data-act="clock-set">Use this time</button><button class="btn" type="button" data-act="clock-now">Restart from now</button></div>' +
      '<p class="foot">A workout is saved under the day of its first set unless you pick a date here. The clock keeps running if you close the app.</p>');
  }
  function pickerSheet() {
    var p = picker, title = { draft: 'Add exercise', replace: 'Replace exercise', editor: 'Add exercise', lift: 'Choose exercise', tile: 'Choose a workout' }[p.mode], h = '';
    if (p.creating) {
      h = head('Your own exercise') + '<label class="fld">Name<input id="cx-name" type="text" maxlength="50" autocomplete="off" value="' + esc(p.q || '') + '"></label>' +
        '<label class="fld">Muscle group<select id="cx-group">' + GROUPS.map(function (g) { return '<option' + (g === p.group ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select></label>' +
        '<label class="fld">What you log<select id="cx-kind"><option value="M">Weight and reps</option><option value="B">Reps with body weight (plus optional added weight)</option><option value="T">Seconds held</option><option value="K">Minutes of cardio</option></select></label>' +
        '<label class="fld">Cue to remember (optional)<input id="cx-cue" type="text" maxlength="140" autocomplete="off"></label>' +
        '<div class="row"><button class="btn primary" type="button" data-act="cx-save">Save exercise</button><button class="btn quiet" type="button" data-act="cx-back">Back</button></div>';
      openSheet(h); return;
    }
    h = head(title, p.mode === 'editor' ? 'Tap to add. You can add several.' : '') + searchBox('pick-q', p.q) + chipsHtml(p.group, 'pick-group', p.mode === 'lift' ? [['logged', 'Logged']] : null, p.mode === 'tile' ? ['Endurance', 'Cardio'] : null) +
      '<div id="pick-list">' + libRows(p.group, p.q, p.mode) + '</div>' + (p.mode === 'lift' || p.mode === 'tile' ? '' : '<button class="add-ex" type="button" data-act="cx-new">+ Create your own exercise</button>');
    openSheet(h, true);
  }
  function openPicker(mode, extra) { picker = Object.assign({ mode: mode, q: '', group: mode === 'lift' ? 'logged' : 'all', creating: false }, extra || {}); pickerSheet(); }
  /* the training block: twelve weeks as a strip, the four phases, and the two things you can do with it */
  function blockSheet() {
    var bi = blockInfo(), b = state.settings.block || {}; if (!bi) { closeSheet(); return; }
    var h = head('Training block', (bi.num > 1 ? 'Block ' + bi.num + ' · ' : '') + 'started ' + fmtDate(bi.start)), cells = '', i;
    for (i = 1; i <= bi.weeks; i++) { var ph = bi.early && i === bi.week ? PHASES[3] : PHASES.filter(function (p) { return i >= p[2] && i <= p[3]; })[0]; cells += '<i class="bw ' + ph[0] + (i === bi.week ? ' now' : i < bi.week ? ' past' : '') + (bi.early && i > bi.week ? ' off' : '') + '">' + i + '</i>'; }
    h += '<div class="bweeks" role="img" aria-label="Week ' + bi.week + ' of ' + bi.weeks + ', ' + bi.name + '">' + cells + '</div><ul class="bphases">';
    PHASES.forEach(function (p) { h += '<li class="' + p[0] + (p[0] === bi.phase ? ' now' : '') + '"><i></i><span><b>' + p[1] + '</b><small>' + (p[2] === p[3] ? 'Week ' + p[2] : 'Weeks ' + p[2] + ' to ' + p[3]) + ' · ' + p[4] + '</small></span></li>'; });
    h += '</ul>';
    if (bi.phase === 'push' && routineList().some(function (r) { return r.items.some(function (it) { return PLUS_EX.indexOf(it.ex) >= 0; }); }))
      h += '<div class="setting"><div><b>One more set in the push weeks</b><small>On lateral raises, calf raises, pec deck and pushdowns.</small></div><button class="switch" type="button" role="switch" data-act="block-plus" aria-checked="' + (b.plus ? 'true' : 'false') + '" aria-label="One more set in the push weeks"></button></div>';
    h += bi.early ? '<button class="btn block" type="button" data-act="block-easy" data-v="0">Back to a normal week</button>' : bi.easy ? '' : '<button class="btn block" type="button" data-act="block-easy" data-v="1">Start the easy week now</button>';
    if (!bi.easy) h += '<p class="foot">Take it early when two of these show up together: two sessions in a row go worse, a joint keeps aching, sleep or motivation drops. The next block starts the week after.</p>';
    h += '<label class="fld">This block started in the week of<input id="block-start" type="date" value="' + bi.start + '" max="' + today() + '"></label>';
    openSheet(h);
  }
  function settingsSheet() {
    var s = state.settings, h = head('Settings');
    h += '<div class="setting stack"><div><b>Appearance</b><small>Automatic follows your phone.</small></div><div class="seg" role="group" aria-label="Appearance">' + [['auto', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']].map(function (t) { return '<button type="button" data-act="theme" data-v="' + t[0] + '" aria-pressed="' + (s.theme === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div>';
    h += '<div class="setting stack"><div><b>Theme</b></div><div class="pal" role="group" aria-label="Theme">' + PALETTES.map(function (p) { return '<button type="button" data-act="palette" data-v="' + p[0] + '" aria-pressed="' + ((s.palette || '') === p[0]) + '"><span class="pal-sw" style="background-image:linear-gradient(135deg, ' + p[2] + ')" aria-hidden="true"></span><span>' + p[1] + '</span></button>'; }).join('') + '</div></div>';
    h += unitRow();
    h += '<div class="setting"><div><b>Sessions per week</b><small>Your weekly goal.</small></div><div class="stepper"><button type="button" data-act="goal" data-d="-1" aria-label="One fewer">−</button><b>' + s.weeklyGoal + '</b><button type="button" data-act="goal" data-d="1" aria-label="One more">+</button></div></div>';
    h += '<div class="setting"><div><b>Training block</b><small>Twelve weeks that end in an easy week.</small></div><button class="switch" type="button" role="switch" data-act="block-toggle" aria-checked="' + (s.blockOff ? 'false' : 'true') + '" aria-label="Training block"></button></div>';
    function sw(key, title, sub) { return '<div class="setting"><div><b>' + title + '</b><small>' + sub + '</small></div><button class="switch" type="button" role="switch" data-act="toggle" data-k="' + key + '" aria-checked="' + (s[key] ? 'true' : 'false') + '" aria-label="' + title + '"></button></div>'; }
    h += sw('autoRest', 'Start the rest timer', 'When you tick a set.') + sw('sound', 'Sound when rest ends', 'A short beep. Your phone must not be on silent.') + sw('awake', 'Keep the screen on', 'During a workout, where the phone allows it.') + sw('outCore', 'Count runs, rides and swims toward the weekly goal', 'Off, they still show in the week and in History, in their own colour.') + sw('rir', 'Ask for reps left in the tank', 'After each set, tap how many more reps you had in you. Three or more on every set raises the next target.');
    h += '<div class="setting"><div><b>Goal body weight</b><small>Shown on the Body page. Leave empty for none.</small></div><div class="fld" style="width:96px"><input id="set-goalw" type="text" inputmode="decimal" autocomplete="off" value="' + (s.goalWeight != null ? fmt(s.goalWeight) : '') + '" placeholder="' + UW() + '" aria-label="Goal body weight in ' + UW() + '"></div></div>';
    h += '<div class="setting"><div><b>Target pace</b><small>Kilograms a week toward your goal weight.</small></div><div class="fld" style="width:96px"><input id="set-goalr" type="text" inputmode="decimal" autocomplete="off" value="' + fmt(s.goalRate || (isLb() ? 0.5 : 0.25)) + '" placeholder="' + (isLb() ? '0.5' : '0.25') + '" aria-label="Target pace in ' + UW() + ' per week"></div></div>';
    h += '<div class="setting stack"><div><b>Backup</b><small>' + (STANDALONE ? 'Everything is stored on this phone only. ' + (function () { var b = backupState(); return b.at ? 'Last backup ' + fmtDate(iso(new Date(b.at))) + (b.fresh ? ', ' + plural(b.fresh, 'workout') + ' since then.' : ', nothing new since then.') : 'No backup made yet.'; })() + ' To bring a backup back, use Restore from file.' : 'Your log syncs through Claude. A backup lets you move it elsewhere.') + '</small></div>' +
      '<div class="row">' + (STANDALONE ? '<button class="btn sm" type="button" data-act="backup-save">Save backup file</button>' : '') + '<button class="btn sm" type="button" data-act="backup-show">Show backup text</button><label class="btn sm">Restore from file<input id="backup-file" type="file" accept=".json,application/json,text/plain" hidden></label></div>' +
      '<div id="backup-box" hidden><textarea class="backup" id="backup-text" spellcheck="false" aria-label="Backup text"></textarea><div class="row"><button class="btn sm" type="button" data-act="backup-copy">Copy</button><button class="btn sm" type="button" data-act="backup-restore">Restore from this text</button></div></div></div>';
    h += '<p class="foot">Hitit · ' + allEx().length + ' exercises · ' + Object.keys(state.sessions).length + ' workouts saved</p>';
    openSheet(h);
  }
  function openSummary() {
    var s = summary; if (!s) return;
    var doc = state.sessions[s.id], h = '<div class="done-hero"><span class="label">' + (s.edited ? 'Changes saved' : 'Workout complete') + '</span><div class="big gtext">' + esc(s.name) + '</div><p class="sub">' + (doc ? fmtDate(doc.date) : '') + '</p></div>';
    var c = s.cmp, dT = c && c.durDiff != null && s.dur ? (c.durDiff === 0 ? 'same as last time' : Math.abs(c.durDiff) + ' min ' + (c.durDiff < 0 ? 'shorter' : 'longer')) : '', dV = c && c.volPct != null ? (c.volPct === 0 ? 'same as last time' : (c.volPct > 0 ? 'up ' : 'down ') + Math.abs(c.volPct) + '%') : '';
    h += outTiles(doc, dT) || '<div class="tiles three"><div class="tile"><b>' + (s.dur ? fmtClock(s.dur) : '–') + '</b><span>time' + (dT ? '<em>' + dT + '</em>' : '') + '</span></div><div class="tile"><b>' + s.sets + '</b><span>sets</span></div><div class="tile"><b>' + compact(s.vol) + '</b><span>' + UW() + ' lifted' + (dV ? '<em>' + dV + '</em>' : '') + '</span></div></div>';
    if (c) h += cmpHtml(s);
    else if (s.prs.length || s.volRec) {
      h += '<div><h3>' + (s.prs.length ? plural(s.prs.length, 'exercise') + ' with a record' : 'A record') + '</h3></div><div class="pr-list">';
      s.prs.forEach(function (p) { h += '<div>' + IC.star + '<span><b>' + esc(p.name) + '</b>' + esc(p.tags.join(' · ')) + '</span></div>'; });
      if (s.volRec) h += '<div>' + IC.star + '<span><b>Whole workout</b>the most weight you have lifted in ' + esc(/^[aeiou]/i.test(s.name) ? 'an ' : 'a ') + esc(s.name) + ' workout</span></div>';
      h += '</div>';
    }
    if (s.fresh && s.fresh.length) h += '<div class="pills">' + s.fresh.map(function (m) { return '<span class="pill hot">Milestone: ' + m.show + (m.unit === 't' ? ' t' : '') + ' ' + esc(m.label.toLowerCase()) + '</span>'; }).join('') + '</div>';
    var fun = !s.edited && funVolume(s.vol); if (fun) h += '<p class="done-fun">' + esc(fun) + '</p>';
    if (s.offer === 'update') h += '<button class="btn block" type="button" data-act="sum-update">Update ' + esc(s.name) + ' to match today</button><p class="foot">You did different exercises from the saved session. Updating changes it for next time.</p>';
    if (s.offer === 'save') h += '<button class="btn block" type="button" data-act="sum-save">Save these exercises as a session</button>';
    h += '<button class="btn primary block" type="button" data-act="sheet-x">Done</button>';
    openSheet(h);
    if (!s.edited && !s.shown) { s.shown = true; if (s.prs.length || s.volRec || s.first || (s.fresh && s.fresh.length)) confetti(140); else confetti(40); }
  }
  /* ================= render and routing ================= */
  function render() {
    var tab = state.ui.tab; charts = {}; histMemo = null;
    document.querySelectorAll('.tab').forEach(function (b) { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    var lost = loadFail != null && syncSettled, su = !lost && syncSettled && needSetup(), wait = !syncSettled && (needSetup() || loadFail != null);
    document.body.classList.toggle('setup', !!(su || wait || lost));
    view.innerHTML = lost ? lostView() : su ? setupView() : wait ? loadingView() : tab === 'progress' ? progressView() : tab === 'exercises' ? thirdView() : (editor ? editorView() : wOpen() ? draftView() : homeView());
    var full = wLive() && !state.ui.wmin && tab === 'log' && !editor && !su && !wait && !lost, mini = wLive() && !full && !su && !wait && !editor && !lost;
    document.body.classList.toggle('in-workout', full); document.body.classList.toggle('has-mini', mini);
    document.getElementById('wmini').hidden = !mini;
    chrome(); observe(); if (mini) drawMini();
  }
  function go(tab, push) {
    planEdit = false; outEdit = false; delMode = null; if (wLive() && tab !== 'log') state.ui.wmin = true; state.ui.tab = tab; saveLocal(); render(); enter(); window.scrollTo(0, 0);
    if (push) { try { if (location.hash !== '#' + tab) location.hash = tab; } catch (e) {} }
  }
  function fromHash() { var h = (location.hash || '').replace('#', ''); if (h === 'log' || h === 'progress' || h === 'exercises') { if (h !== state.ui.tab) go(h, false); return true; } return false; }
