
  /* ================= endurance: the workout row ================= */
  /* distance, minutes and seconds in three fields; grey numbers are last time's and a tick accepts them */
  function sportRow(it, e, i, s, ls) {
    var lt = ls ? Math.round(ls.r * 60) : null, id = it.u + '-' + i, u = UD(e), left = '';
    function fld(f, pre, val, ph, unit, label, mode) {
      return '<div class="field"><input id="' + pre + '-' + id + '" type="text" inputmode="' + mode + '" autocomplete="off" data-f="' + f + '" data-u="' + it.u + '" data-i="' + i + '" value="' + esc(val || '') + '" placeholder="' + ph + '" aria-label="Set ' + (i + 1) + ', ' + label + '"><span>' + unit + '</span></div>';
    }
    var h = '<div class="set sp' + (s.d ? ' done' : '') + (s.d && s.pr ? ' pr' : '') + '"><span class="set-n">' + (i + 1) + '</span>' +
      fld('dist', 'd', s.dist, ls && ls.dist ? fmt(ls.dist) : '', u, 'distance in ' + u, 'decimal') +
      fld('r', 'r', s.r, lt != null ? Math.floor(lt / 60) : '', 'min', 'minutes', 'numeric') +
      fld('sec', 's', s.sec, lt != null && lt % 60 ? lt % 60 : '', 's', 'seconds', 'numeric') +
      '<button class="tick' + (s.pop ? ' pop' : '') + '" type="button" data-act="tick" data-u="' + it.u + '" data-i="' + i + '" aria-pressed="' + (s.d ? 'true' : 'false') + '" aria-label="Set ' + (i + 1) + ' done">' + (s.d && s.pr ? IC.star : IC.check) + left + '</button></div>';
    var one = rowSets({ ex: it.ex, rows: [s] }), p = one.length && one[0].dist ? paceText(e, one[0].dist, one[0].r) : '';
    return h + '<div class="pace" id="p-' + id + '">' + (p ? 'Pace ' + p : '') + '</div>';
  }

  /* ================= endurance: the card on Train ================= */
  var outEdit = false;
  function outCard(f) {
    var ws = weekStart(today()), wk = {}, bits = [], tiles = outList(), h = '';
    if (outEdit) {
      h += '<section class="card"><div class="plan-head"><div><h3>Endurance</h3><p class="sub">Each one starts a workout in one tap. Up to six fit here.</p></div><button class="btn quiet" type="button" data-act="out-edit" data-v="0">Done</button></div>';
      if (tiles.length) {
        h += '<ul class="list">';
        tiles.forEach(function (id, i) {
          var e = exi(id), nm = esc(e.name);
          h += '<li class="plan-row out-row"><span class="thumb sm" aria-hidden="true">' + illoSvg(e.illo) + '</span><span class="txt"><b>' + nm + '</b><small>' + esc(e.equip) + '</small></span><span class="mini">' +
            '<button class="icon-btn" type="button" data-act="out-move" data-i="' + i + '" data-d="-1" aria-label="Move ' + nm + ' earlier"' + (i ? '' : ' disabled') + '>' + IC.up + '</button>' +
            '<button class="icon-btn" type="button" data-act="out-move" data-i="' + i + '" data-d="1" aria-label="Move ' + nm + ' later"' + (i < tiles.length - 1 ? '' : ' disabled') + '>' + IC.down + '</button>' +
            '<button class="icon-btn" type="button" data-act="out-swap" data-i="' + i + '" aria-label="Replace ' + nm + ' with another">' + IC.swap + '</button>' +
            '<button class="icon-btn" type="button" data-act="out-del" data-i="' + i + '" aria-label="Remove ' + nm + '">' + IC.x + '</button></span></li>';
        });
        h += '</ul>';
      }
      return h + (tiles.length < 6 ? '<button class="add-ex" type="button" data-act="out-add">+ Add one</button>' : '') + '</section>';
    }
    f.forEach(function (s) { if (s.date < ws) return; sessSports(s).forEach(function (b) { wk[b.sport] = r2((wk[b.sport] || 0) + b.dist); }); });
    SPORTS.forEach(function (sp) { if (wk[sp[0]]) bits.push(distText({ sport: sp[0] }, wk[sp[0]]) + ' ' + sportWord(sp[0])); });
    h += '<section class="card"><div class="plan-head"><div><h3>Endurance</h3><p class="sub">' + (bits.length ? 'This week: ' + esc(bits.join(', ')) + '.' : 'Tap one to start it.') + '</p></div><button class="btn quiet" type="button" data-act="out-edit" data-v="1">Edit</button></div>';
    if (!tiles.length) return h + '<p class="empty">Nothing here. Tap Edit to add a run, a ride, a swim or any other cardio.</p></section>';
    h += '<div class="out-tiles">';
    tiles.forEach(function (id) {
      var e = exi(id), key = outKey(id), ld = lastDone(key), sub = '', nm = OUT_SHORT[id] || e.name;
      if (ld) { var b = e.sport ? sessSports(ld).filter(function (x) { return x.sport === e.sport; })[0] : null; sub = 'last ' + (b && b.dist ? distText(e, b.dist) : fmtDate(ld.date, true)); }
      h += '<button class="out-tile" type="button" data-act="start" data-key="' + esc(key) + '" aria-label="Start: ' + esc(e.name) + '"><span class="illo">' + illoSvg(e.illo, null, true, true) + '</span><b' + (nm.length > 8 ? ' class="long"' : '') + '>' + esc(nm) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>';
    });
    return h + '</div></section>';
  }

  /* ================= endurance: the finish summary ================= */
  function outTiles(doc, dT) {
    if (!doc || !allSport(doc)) return '';
    var sp = sessSports(doc), min = 0; sp.forEach(function (b) { min += b.min; });
    var h = '<div class="tiles three"><div class="tile"><b>' + mmss(min) + '</b><span>time' + (dT ? '<em>' + dT + '</em>' : '') + '</span></div>';
    if (sp.length === 1) {
      var b = sp[0], e = { sport: b.sport }, pv = paceVal(e, b.dist, b.dmin);
      h += '<div class="tile"><b>' + (b.dist ? fmt(b.sport === 'swim' ? Math.round(b.dist) : Math.round(b.dist * 100) / 100) : '–') + '</b><span>' + UD(e) + '</span></div><div class="tile"><b>' + (pv == null ? '–' : paceFmt(e, pv)) + '</b><span>' + (b.sport === 'ride' ? paceUnit(e) : 'pace ' + paceUnit(e)) + '</span></div>';
    } else sp.slice(0, 2).forEach(function (b) { var e = { sport: b.sport }; h += '<div class="tile"><b>' + (b.dist ? fmt(b.sport === 'swim' ? Math.round(b.dist) : Math.round(b.dist * 100) / 100) : mmss(b.min)) + '</b><span>' + (b.dist ? UD(e) + ' ' : '') + sportWord(b.sport) + '</span></div>'; });
    return h + '</div>';
  }

  /* ================= endurance: the Progress page ================= */
  function endurView() {
    var f = finished(), logs = {}, any = false, h = '';
    SPORTS.forEach(function (sp) { logs[sp[0]] = sportLog(sp[0], f); if (logs[sp[0]].length) any = true; });
    var cur = state.ui.sport && logs[state.ui.sport] ? state.ui.sport : (SPORTS.filter(function (sp) { return logs[sp[0]].length; })[0] || SPORTS[0])[0];
    var meta = SPORTS.filter(function (sp) { return sp[0] === cur; })[0], e = { sport: cur }, log = logs[cur], u = UD(e), word = sportWord(cur);
    h += '<div class="seg" role="group" aria-label="Sport">' + SPORTS.map(function (sp) { return '<button type="button" data-act="sport" data-v="' + sp[0] + '" aria-pressed="' + (sp[0] === cur) + '">' + sp[1] + '</button>'; }).join('') + '</div>';
    if (!log.length) {
      return h + '<section class="card out-empty"><div class="illo">' + illoSvg(meta[2], null, true) + '</div><div><h3>No ' + word + 's logged yet</h3><p class="sub">Log the distance and the time of a ' + word + ' and this page shows your weekly distance, your pace over time and your bests.</p></div>' +
        (state.draft ? '' : '<button class="btn primary-sm" type="button" data-act="start" data-key="' + meta[2] + '">Log a ' + word + '</button>') + '</section>';
    }
    var ws = weekStart(today()), weeks = lastWeeks(12), by = {}, longest = log[0], fast = null, least = cur === 'swim' ? 200 : cur === 'ride' ? 5 : 1, four = 0, total = 0, mins = 0;
    weeks.forEach(function (w) { by[w.start] = w; });
    log.forEach(function (x) {
      var w = by[weekStart(x.date)]; if (w) w.a = r2(w.a + x.dist);
      if (x.dist > longest.dist) longest = x;
      total += x.dist; mins += x.min;
      if (x.dist >= least && x.dmin > 0 && (!fast || x.dmin / x.dist < fast.dmin / fast.dist)) fast = x;
      if (x.date >= addDays(ws, -28) && x.date < ws) four += x.dist;
    });
    var best = weeks.reduce(function (a, w) { return w.a > a.a ? w : a; }, weeks[0]), now = weeks[weeks.length - 1].a, sw = cur === 'swim';
    function D(v) { return fmt(sw ? Math.round(v) : Math.round(v * 10) / 10); }
    h += '<div class="tiles three"><div class="tile"><b>' + D(now) + '</b><span>' + u + ' this week</span></div><div class="tile"><b>' + D(four / 4) + '</b><span>' + u + ' a week, last 4 weeks</span></div><div class="tile"><b>' + log.length + '</b><span>' + (log.length === 1 ? word : word + 's') + ' logged</span></div></div>';
    h += '<section class="card"><div><h3>Distance per week</h3><p class="sub">' + D(total) + ' ' + u + ' in ' + mmss(mins) + ' so far.</p></div><div class="chart out" data-chart="ew">' +
      colChart('ew', weeks, { label: 'Distance per week for the last 12 weeks, in ' + u, tip: function (w) { return '<b>Week of ' + fmtDate(w.start, true) + '</b><br>' + D(w.a) + ' ' + u; } }) + '</div></section>';
    var pts = log.filter(function (x) { return x.dist > 0 && x.dmin > 0; }).map(function (x) { return { x: x.date, y: paceVal(e, x.dist, x.dmin), tip: '<b>' + fmtDate(x.date) + '</b><br>' + distText(e, x.dist) + ' in ' + mmss(x.dmin) + '<br>' + paceText(e, x.dist, x.dmin) }; });
    if (pts.length > 1) h += '<section class="card"><div><h3>' + (cur === 'ride' ? 'Speed' : 'Pace') + '</h3><p class="sub">' + (cur === 'ride' ? 'Average speed of each ride, in ' + paceUnit(e) + '. Higher is faster.' : 'Average pace of each ' + word + ', per ' + (sw ? '100 ' + u : u) + '. Lower is faster.') + '</p></div><div class="chart out" data-chart="ep">' +
      lineChart('ep', pts, null, { out: true, fmt: function (v) { return paceFmt(e, v); } }) + '</div></section>';
    h += '<section class="card"><h3>Bests</h3><ul class="list">' +
      '<li><button class="item" type="button" data-act="open-session" data-id="' + esc(longest.id) + '"><span class="txt"><b>Longest ' + word + '</b><small>' + fmtDate(longest.date) + '</small></span><span class="num">' + esc(distText(e, longest.dist)) + '</span></button></li>' +
      (fast ? '<li><button class="item" type="button" data-act="open-session" data-id="' + esc(fast.id) + '"><span class="txt"><b>Fastest ' + (cur === 'ride' ? 'average speed' : 'pace') + '</b><small>' + fmtDate(fast.date) + ' · ' + esc(distText(e, fast.dist)) + '</small></span><span class="num">' + esc(paceText(e, fast.dist, fast.dmin)) + '</span></button></li>' : '') +
      (best.a > 0 ? '<li><div class="item"><span class="txt"><b>Biggest week</b><small>week of ' + fmtDate(best.start, true) + '</small></span><span class="num">' + D(best.a) + ' ' + u + '</span></div></li>' : '') + '</ul></section>';
    h += '<section class="card"><h3>Latest</h3><ul class="list">';
    log.slice(-6).reverse().forEach(function (x) {
      var dd = toDate(x.date);
      h += '<li><button class="item" type="button" data-act="open-session" data-id="' + esc(x.id) + '"><span class="date-tile" aria-hidden="true"><b>' + dd.getDate() + '</b><span>' + MONTHS[dd.getMonth()] + '</span></span><span class="txt"><b>' + (x.dist ? esc(distText(e, x.dist)) + ' in ' + mmss(x.min) : esc(minText(x.min))) + '</b><small>' + esc(x.name) + (x.dist && x.dmin ? ' · ' + esc(paceText(e, x.dist, x.dmin)) : '') + '</small></span></button><span class="chev" aria-hidden="true">›</span></li>';
    });
    return h + '</ul></section>';
  }
