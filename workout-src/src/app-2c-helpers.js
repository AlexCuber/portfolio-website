
  /* ================= workout helpers: warm-up and plates ================= */
  IC.timer = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2.3 1.6M9.5 3.5h5M12 3.5v3"/></svg>';
  IC.stop = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>';
  var help = null;
  function plateSvg(pl, bar) {
    var W = 230, H = 92, cy = 44, x = 64, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="One end of the bar with ' + (pl.side.length ? pl.side.map(fmt).join(', ') : 'no plates') + '">';
    s += '<rect class="pb" x="0" y="' + (cy - 4) + '" width="' + W + '" height="8" rx="4"/><rect class="pc" x="' + (x - 10) + '" y="' + (cy - 11) + '" width="10" height="22" rx="3"/>';
    var max = plateSizes()[0];
    pl.side.forEach(function (p) {
      var h = 30 + 46 * Math.sqrt(p / max), w = p >= max * 0.55 ? 20 : p >= max * 0.3 ? 17 : p >= max * 0.15 ? 14 : 11;
      s += '<rect class="pp" x="' + x + '" y="' + (cy - h / 2).toFixed(1) + '" width="' + w + '" height="' + h.toFixed(1) + '" rx="4"/><text x="' + (x + w / 2) + '" y="' + (H - 2) + '">' + fmt(p) + '</text>';
      x += w + 3;
    });
    if (!pl.side.length) s += '<text x="' + (x + 50) + '" y="' + (cy - 14) + '">no plates</text>';
    return s + '</svg>';
  }
  function helpBody() {
    var it = findItem(help.u); if (!it) return '';
    var e = exi(it.ex), W = help.w, uw = ' ' + UW() + '', h = '', bar = barFor(e), plates = isBar(e) || (state.settings.bars || {})[e.id] != null;
    if (W == null || !(W > 0)) return '<p class="sub">Type the weight you will work with to see the warm-up' + (plates ? ' and the plates.' : '.') + '</p>';
    if (plates) {
      var pl = platesFor(W, bar);
      h += '<div class="plates"><h3>Plates</h3>';
      if (!pl) h += '<p class="sub">' + fmt(W) + uw + ' is lighter than the ' + fmt(bar) + uw + ' bar.</p>';
      else {
        h += plateSvg(pl, bar) + '<p class="plate-t"><b>' + (pl.side.length ? 'Each side: ' + pl.side.map(fmt).join(' + ') + uw : 'Just the bar') + '</b>' + (bar ? ' on a ' + fmt(bar) + uw + ' bar' : '') + '</p>';
        if (pl.rem > 0.01) h += '<p class="sub">Standard plates cannot make ' + fmt(W) + uw + ' exactly. This loads ' + fmt(pl.loaded) + uw + '.</p>';
      }
      h += '<div class="bar-pick"><span class="label">Bar</span><div class="chips">' + barChoices().map(function (b) { return '<button class="chip" type="button" data-act="help-bar" data-v="' + b + '" aria-pressed="' + (b === bar) + '">' + (b ? fmt(b) + uw : 'None') + '</button>'; }).join('') + '</div></div></div>';
    }
    var full = help.full, ws = warmups(W, e, full);
    h += '<div><div class="spread"><h3>' + (full ? 'Warm-up sets' : 'Feeler set') + '</h3><button class="btn quiet sm" type="button" data-act="help-ramp">' + (full ? 'One feeler set instead' : 'Show the full ramp') + '</button></div>';
    if (!ws.length) h += '<p class="sub">This is light enough to go straight in. Do a few easy reps first if it is your first exercise.</p>';
    else {
      h += '<ol class="warm-list">';
      ws.forEach(function (x) {
        var pl2 = plates && !x.bar ? platesFor(x.w, bar) : null;
        h += '<li><b>' + (x.bar ? 'Empty bar' : fmt(x.w) + uw) + ' × ' + x.r + '</b><span>' + (x.bar ? fmt(x.w) + uw : pl2 && pl2.side.length ? 'each side ' + pl2.side.map(fmt).join(' + ') : pl2 ? 'just the bar' : '') + '</span></li>';
      });
      h += '</ol>';
      var has = it.warm && it.warm.length;
      h += '<div class="row"><button class="btn sm primary-sm" type="button" data-act="warm-add">' + (has ? 'Replace the warm-up sets' : (ws.length > 1 ? 'Add these to the workout' : 'Add this to the workout')) + '</button>' + (has ? '<button class="btn sm quiet danger" type="button" data-act="warm-clear">Remove them</button>' : '') + '</div>';
    }
    h += '<p class="foot">' + (full ? 'About 50, 70 and 85 percent of the working weight. Keep them easy and rest about a minute between them.' : 'About 60 percent. After the first exercise you are warm, and this is only to feel the movement.') + ' Added warm-up sets go above set 1, marked W instead of a number. They are saved with the workout but do not count as sets, toward records or toward weight lifted.</p></div>';
    return h;
  }
  function helpSheet(u) {
    var it = findItem(u); if (!it) return;
    var e = exi(it.ex), keep = help && help.u === u;
    if (!keep) help = { u: u, w: workingWeight(it), full: !warmedUp(it) };
    openSheet(head(isBar(e) ? 'Warm-up and plates' : 'Warm-up', e.name) +
      '<div class="help-w"><button class="step" type="button" data-act="help-step" data-d="-1" aria-label="Less weight">−</button><label class="fld"><span class="sr">Working weight</span><input id="help-w" type="text" inputmode="decimal" autocomplete="off" value="' + (help.w != null ? fmt(help.w) : '') + '" placeholder="Working weight"></label><span class="help-u">' + UW() + '</span><button class="step" type="button" data-act="help-step" data-d="1" aria-label="More weight">+</button></div>' +
      '<div class="contents" id="help-body">' + helpBody() + '</div><button class="btn primary block" type="button" data-act="sheet-x">Done</button>');
  }

  /* ================= workout helpers: swaps ================= */
  function swapSheet(u) {
    var d = state.draft, it = findItem(u); if (!d || !it) return;
    var e = exi(it.ex), list = swapsFor(it, d), plan = it.swap || e.swap, h = head('Swap for today', 'Instead of ' + e.name);
    if (plan) h += '<p class="note"><b>The plan suggests.</b> ' + esc(plan) + '</p>';
    if (list.length) {
      h += '<ul class="list">';
      list.forEach(function (x) {
        var c = x.c, last = historyOf(c.id).slice(-1)[0];
        h += '<li><button class="item" type="button" data-act="swap-pick" data-u="' + u + '" data-ex="' + esc(c.id) + '"><span class="thumb sm" aria-hidden="true">' + illoSvg(c.illo) + '</span><span class="txt"><b>' + esc(c.name) + '</b><small>' + esc(c.equip) + (last ? ' · last ' + esc(setsText(c, last.sets)) : '') + '</small></span></button><span class="chev" aria-hidden="true">›</span></li>';
      });
      h += '</ul>';
    } else h += '<p class="sub">Nothing close enough in the library for the same muscles.</p>';
    h += '<button class="btn block" type="button" data-act="ex-replace" data-u="' + u + '">Browse all exercises</button><p class="foot">Only today’s workout changes. The sets and rep range of this slot are kept. After the workout you can choose to update the saved session.</p>';
    openSheet(h);
  }

  /* ================= first-run setup and templates ================= */
  function tplCards(cur, days, act, plansOnly) {
    var rec = templateFor(days);
    return TEMPLATES.filter(function (t) { return !plansOnly || t.id !== 'none'; }).map(function (t) {
      var ss = templateSessions(t, days), on = t.id === cur;
      return '<button type="button" class="tpl' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-act="' + act + '" data-v="' + t.id + '"><span class="tpl-dot" aria-hidden="true">' + (on ? IC.check : '') + '</span><span class="txt"><b>' + esc(t.name) + (t.id === rec ? '<span class="pill good">fits ' + days + ' days</span>' : '') + '</b><small>' + esc(t.blurb) + '</small>' +
        (ss.length ? '<span class="tpl-s">' + ss.map(function (s) { return esc(s.name) + (s.extra ? ' (optional)' : ''); }).join(' · ') + '</span>' : '') + '</span></button>';
    }).join('');
  }
  function setupView() {
    var su = setupState(), h = '';
    h += '<section class="setup-top"><h2>Three choices and you are ready</h2><p class="sub">All of them can be changed later.</p></section>';
    h += '<section class="card"><div><h3>Units</h3><p class="sub">' + (su.unit === 'lb' ? 'Weights in pounds, body measurements in inches.' : 'Weights in kilograms, body measurements in centimetres.') + '</p></div><div class="seg" role="group" aria-label="Units"><button type="button" data-act="setup-unit" data-v="kg" aria-pressed="' + (su.unit === 'kg') + '">Kilograms</button><button type="button" data-act="setup-unit" data-v="lb" aria-pressed="' + (su.unit === 'lb') + '">Pounds</button></div></section>';
    h += '<section class="card"><div><h3>Days a week</h3><p class="sub">How often you plan to train. This becomes your weekly goal.</p></div><div class="seg" role="group" aria-label="Days a week">' + [2, 3, 4, 5, 6].map(function (n) { return '<button type="button" data-act="setup-days" data-v="' + n + '" aria-pressed="' + (su.days === n) + '">' + n + '</button>'; }).join('') + '</div></section>';
    h += '<section class="card"><div><h3>Starting plan</h3><p class="sub">Every session can be edited, reordered or replaced once you are in.</p></div><div class="tpls" role="radiogroup" aria-label="Starting plan">' + tplCards(su.tpl, su.days, 'setup-tpl') + '</div></section>';
    h += '<button class="btn primary block" type="button" data-act="setup-go">Start</button>';
    h += '<p class="foot setup-foot">Used Hitit before? <label class="link">Restore from a backup file<input id="backup-file" type="file" accept=".json,application/json,text/plain" hidden></label></p>';
    return h;
  }
  /* shown instead of the app when a stored log is there but cannot be read; nothing is written until the user chooses */
  var lostArm = false;
  function lostView() {
    return '<section class="setup-top"><h2>Your log could not be opened</h2><p class="sub">The log saved on this ' + (STANDALONE ? 'phone' : 'device') + ' is still there, but it could not be read. Nothing has been changed or deleted.</p></section>' +
      '<section class="card lost"><button class="btn primary block" type="button" data-act="lost-retry">Try again</button>' +
      (function () { var c = copyInfo(); return c ? '<button class="btn block" type="button" data-act="copy-restore" data-now="1">Use the copy from ' + fmtDate(iso(new Date(c.at))) + ' (' + plural(c.n, 'workout') + ')</button>' : ''; })() +
      '<label class="btn block">Restore from a backup file<input id="backup-file" type="file" accept=".json,application/json,text/plain" hidden></label>' +
      '<button class="btn block" type="button" data-act="lost-save">Save the unreadable log as a file</button></section>' +
      '<p class="foot setup-foot"><button class="link" type="button" data-act="lost-new">' + (lostArm ? 'Tap again to start a new log' : 'Start a new log') + '</button></p>' +
      '<p class="foot setup-foot">Starting a new log or restoring a backup keeps a copy of the unreadable one on this ' + (STANDALONE ? 'phone' : 'device') + '.</p>';
  }
  function loadingView() { return '<section class="card"><h3>Opening your log</h3><p class="sub">Checking for workouts saved from another device.</p></section>'; }
  function templateSheet() {
    var days = state.settings.weeklyGoal || 4;
    openSheet(head('Start from a template', 'For ' + days + ' days a week, your weekly goal.') + '<div class="tpls">' + tplCards(null, days, 'tpl-apply', true).replace(/role="radio" aria-checked="false" /g, '') + '</div>' +
      '<p class="foot">The sessions in your plan now move to “Not in the plan”. Nothing is deleted, and your history stays.</p>');
  }
  /* settings: switching units converts what is logged, so it asks once */
  function unitRow() {
    var s = state.settings, cur = s.unit === 'lb' ? 'lb' : 'kg', other = cur === 'kg' ? 'lb' : 'kg', n = Object.keys(state.sessions).length + Object.keys(state.body).length;
    var h = '<div class="setting stack"><div><b>Units</b><small>' + (cur === 'lb' ? 'Pounds and inches.' : 'Kilograms and centimetres.') + '</small></div><div class="seg" role="group" aria-label="Units"><button type="button" data-act="unit" data-v="kg" aria-pressed="' + (cur === 'kg') + '">Kilograms</button><button type="button" data-act="unit" data-v="lb" aria-pressed="' + (cur === 'lb') + '">Pounds</button></div>';
    if (armed === 'unit') h += '<p class="note">' + (state.draft ? 'Finish or discard the workout in progress first.' : 'This converts your ' + n + ' saved ' + (n === 1 ? 'entry' : 'entries') + ' to ' + (other === 'lb' ? 'pounds and inches' : 'kilograms and centimetres') + ', rounded to the nearest quarter. Tap ' + (other === 'lb' ? 'Pounds' : 'Kilograms') + ' again to go ahead.') + '</p>';
    return h + '</div>';
  }
