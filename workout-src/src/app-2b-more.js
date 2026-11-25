
  /* ================= muscle figure ================= */
  IC.left = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l-6 6 6 6"/></svg>';
  IC.right = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6l6 6-6 6"/></svg>';
  /* Half a body per view, mirrored about x = 60. Each shape: [muscles, outline, 1 when it sits on the centre line, 1 when it only
     shows once it has sets]. 'a|b' takes the first of the two that has a target; 'a,b' averages them; '' is plain body. */
  var FIG_FRONT = [
    ['', 'M54 31 L66 31 L66 40 L54 40 Z', 1],
    ['traps|back', 'M53 35 L41 42 L53 42 Z'],
    ['frontDelts,sideDelts', 'M40 43 C30 41 22 49 23 64 C30 63 36 57 40 49 Z'],
    ['chest', 'M43 45 L58.6 45 L58.6 64 C53 69 45 67 41 61 C39 55 40 49 43 45 Z'],
    ['biceps', 'M23 67 C20 77 21 89 25 96 C31 92 35 81 35 68 C32 62 26 62 23 67 Z'],
    ['forearms', 'M21 100 C17 111 16 123 18 134 L25 134 C29 124 31 112 29 100 C27 97 23 97 21 100 Z', 0, 1],
    ['', 'M17 138 C15 144 17 151 21 152 C25 151 26 144 25 138 Z'],
    ['abs', 'M52.6 69 L55.2 69 C58.2 69 58.2 69 58.2 72 L58.2 76.5 C58.2 79.5 58.2 79.5 55.2 79.5 L52.6 79.5 C49.6 79.5 49.6 79.5 49.6 76.5 L49.6 72 C49.6 69 49.6 69 52.6 69 Z'],
    ['abs', 'M53 81.5 L55.2 81.5 C58.2 81.5 58.2 81.5 58.2 84.5 L58.2 89 C58.2 92 58.2 92 55.2 92 L53 92 C50 92 50 92 50 89 L50 84.5 C50 81.5 50 81.5 53 81.5 Z'],
    ['abs', 'M50.4 94 L58.6 94 L58.6 108 C55 108 52.5 105 51 101 Z'],
    ['abs', 'M41 66 C39 78 40 92 44 102 L48 104 L47 70 Z'],
    ['', 'M44 106 L58.6 111 L58.6 116 L43 112 Z'],
    ['quads', 'M43 116 C38 130 39 154 45 172 L55 172 C58.6 156 58.6 132 58.6 120 Z'],
    ['', 'M45 176 C44 181 46 186 50 186 C54 186 56 181 55 176 Z'],
    ['calves', 'M44 190 C41 201 42 219 46 230 L53 230 C57 219 57 201 55 190 Z'],
    ['', 'M45 234 L54 234 L55 242 L41 242 Z']
  ];
  var FIG_BACK = [
    ['', 'M54 31 L66 31 L66 36 L54 36 Z', 1],
    ['traps|back', 'M60 34 L42 43 L52 57 L60 78 Z'],
    ['rearDelts', 'M40 44 C30 41 22 49 23 64 C30 63 36 57 41 50 Z'],
    ['back', 'M42 53 L51 60 L58.6 80 L58.6 98 C50 94 44 82 41 68 C40 62 40 57 42 53 Z'],
    ['triceps', 'M23 67 C20 77 21 89 25 96 C31 92 35 81 35 68 C32 62 26 62 23 67 Z'],
    ['forearms', 'M21 100 C17 111 16 123 18 134 L25 134 C29 124 31 112 29 100 C27 97 23 97 21 100 Z', 0, 1],
    ['', 'M17 138 C15 144 17 151 21 152 C25 151 26 144 25 138 Z'],
    ['lowerBack', 'M47 100 L58.6 102 L58.6 112 L45 110 Z', 0, 1],
    ['glutes', 'M44 114 C39 120 39 135 45 140 C51 143 58.6 139 58.6 130 L58.6 116 Z'],
    ['hams', 'M43 144 C40 154 41 168 46 176 L55 176 C58.6 166 58.6 152 58.6 145 C54 147 48 147 43 144 Z'],
    ['', 'M46 180 L55 180 L55 186 L46 186 Z'],
    ['calves', 'M44 190 C39 199 41 214 47 222 L53 222 C58 214 58.6 199 55 190 Z'],
    ['', 'M47 225 L53 225 L53 233 L47 233 Z'],
    ['', 'M45 236 L54 236 L55 242 L41 242 Z']
  ];
  /* Sets per muscle over the last 7 days, or a week's worth from the last 28, next to what the plan gives each one.
     Both windows end today and are always full, so the numbers mean the same on a Monday as on a Sunday. */
  function musData(list) {
    var four = state.ui.musWin === 'four', from = addDays(today(), four ? -27 : -6), got = {};
    list.forEach(function (s) { if (s.date < from) return; (s.entries || []).forEach(function (en) { var e = exi(en.ex); if (e.log === 'cardio') return; Object.keys(e.muscles).forEach(function (mu) { got[mu] = (got[mu] || 0) + en.sets.length * e.muscles[mu] / (four ? 4 : 1); }); }); });
    return { got: got, plan: planTargets(), four: four };
  }
  function muscleFigure(list) {
    var md = musData(list), got = md.got, plan = md.plan;
    function col(spec, optional) {
      var alt = spec.split('|'), ids = alt.length > 1 ? [alt.filter(function (id) { return plan[id] || got[id]; })[0] || alt[1]] : spec.split(','), s = 0, n = 0, any = false;
      ids.forEach(function (id) { if (plan[id]) { s += Math.min(1, (got[id] || 0) / plan[id]); n++; } if (got[id]) any = true; });
      if (n) return s > 0 ? ramp('--ramp', s / n) : (optional ? null : 'var(--mm-off)');
      return any ? 'var(--accent)' : (optional ? null : 'var(--mm-off)');
    }
    function half(shapes, dx) {
      var b1 = '', b2 = '', z1 = '', z2 = '', M = '<g transform="matrix(-1 0 0 1 120 0)">';
      shapes.forEach(function (q) {
        var p = '<path d="' + q[1] + '"/>'; b1 += p; if (!q[2]) b2 += p;
        var c = q[0] ? col(q[0], q[3]) : null; if (!c) return;
        p = '<path d="' + q[1] + '" style="fill:' + c + '"/>'; z1 += p; if (!q[2]) z2 += p;
      });
      return '<g transform="translate(' + dx + ' 0)"><g class="mm-body">' + b1 + M + b2 + '</g><ellipse cx="60" cy="17" rx="11" ry="13"/><rect x="44" y="60" width="32" height="60" rx="6"/></g><g class="mm-zones">' + z1 + M + z2 + '</g></g></g>';
    }
    var rows = LIBRARY.MUSCLES.filter(function (m) { return plan[m.id]; }).map(function (m) { return { m: m, g: got[m.id] || 0, p: plan[m.id], r: Math.min(1, (got[m.id] || 0) / plan[m.id]) }; });
    var behind = rows.filter(function (x) { return x.r < 1; }).sort(function (a, b) { return a.r - b.r; }).slice(0, 4), done = rows.filter(function (x) { return x.r >= 1; }).length;
    var side = '<div class="mm-side"><span class="label">' + (behind.length ? 'Furthest behind' : 'All on target') + '</span>';
    if (behind.length) {
      side += '<ul class="mm-list">' + behind.map(function (x) { return '<li><i style="background:' + (x.g > 0 ? ramp('--ramp', x.r) : 'var(--mm-off)') + '"></i><span>' + esc(x.m.name) + '</span><b>' + fmt(Math.round(x.g * 10) / 10) + '<small> / ' + fmt(Math.round(x.p * 10) / 10) + '</small></b></li>'; }).join('') + '</ul>';
      if (done) side += '<p class="foot">' + done + ' of ' + rows.length + ' muscles have their sets.</p>';
    } else side += '<p class="sub">Every muscle in your plan has its sets.</p>';
    side += '</div>';
    return '<div class="mm"><svg viewBox="0 0 250 262" role="img" aria-label="Front and back of a body with each muscle coloured by how many of its planned sets are done' + (behind.length ? '. Furthest behind: ' + behind.map(function (x) { return x.m.name; }).join(', ') : '') + '">' +
      half(FIG_FRONT, 0) + half(FIG_BACK, 130) + '<text x="60" y="259">Front</text><text x="190" y="259">Back</text></svg>' + side + '</div>';
  }

  /* ================= third tab: history and exercises ================= */
  var histMonth = null, histDay = null, histQ = '', histSearch = false, histN = 10, histOpen = {};
  function sessTint() { var m = {}; routineList().forEach(function (r, i) { m[r.id] = i % 5; }); Object.keys(OUT).forEach(function (k) { m[k] = 'o'; }); Object.keys(state.sessions).forEach(function (id) { var k = state.sessions[id].key; if (k && k.indexOf('out-') === 0) m[k] = 'o'; }); return m; }
  function histBody() {
    var f = finished(), h = '', i, t = today();
    if (!f.length) return '<section class="card"><h3>No workouts yet</h3><p class="sub">Every workout you finish lands here, on a calendar you can page through and search.</p></section>';
    if (histQ.trim()) {
      var terms = histQ.toLowerCase().trim().split(/\s+/), hits = [], total = 0;
      for (i = f.length - 1; i >= 0; i--) {
        var s = f[i], names = (s.entries || []).map(function (en) { var e = exi(en.ex, en.name); return e.gone ? en.name : e.name; });
        if (!terms.every(function (q) { return ((s.name || '') + ' ' + names.join(' ')).toLowerCase().indexOf(q) >= 0; })) continue;
        total++; if (hits.length >= 40) continue;
        var mi = -1; names.forEach(function (nm, j) { if (mi < 0 && terms.some(function (q) { return nm.toLowerCase().indexOf(q) >= 0; })) mi = j; });
        hits.push({ s: s, mi: mi, names: names });
      }
      if (!hits.length) return '<section class="card"><h3>Nothing found</h3><p class="sub">No saved workout has an exercise or session name matching “' + esc(histQ.trim()) + '”.</p></section>';
      h += '<section class="card"><h3>' + plural(total, 'workout') + '</h3><ul class="list">';
      hits.forEach(function (x) {
        var dd = toDate(x.s.date), en = x.mi >= 0 ? x.s.entries[x.mi] : null, yr = dd.getFullYear() !== new Date().getFullYear() ? ' ' + dd.getFullYear() : '';
        h += '<li><button class="item" type="button" data-act="open-session" data-id="' + esc(x.s.id) + '"><span class="date-tile" aria-hidden="true"><b>' + dd.getDate() + '</b><span>' + MONTHS[dd.getMonth()] + '</span></span><span class="txt"><b>' + esc(x.s.name || 'Workout') + '</b><small>' +
          (en ? esc(x.names[x.mi]) + ': ' + esc(setsText(exi(en.ex, en.name), en.sets)) : DAYS[dd.getDay()] + yr + ' · ' + countSets(x.s) + ' sets') + '</small></span></button><span class="chev" aria-hidden="true">›</span></li>';
      });
      h += '</ul>' + (total > hits.length ? '<p class="foot">Showing the latest ' + hits.length + '.</p>' : '') + '</section>';
      return h;
    }
    var mk = histMonth || t.slice(0, 7), y = +mk.slice(0, 4), mo = +mk.slice(5, 7) - 1, nDays = new Date(y, mo + 1, 0).getDate(), lead = (new Date(y, mo, 1).getDay() + 6) % 7;
    var by = {}, tint = sessTint(), ini = sessInitials(), seen = {}, legend = [], count = 0, cells = '', d;
    f.forEach(function (s) { if (s.date.slice(0, 7) !== mk) return; (by[s.date] = by[s.date] || []).push(s); count++; var k = s.key + '|' + (s.name || 'Workout'); if (!seen[k]) { seen[k] = 1; legend.push(s); } });
    var sel = histDay && by[histDay] ? histDay : null;
    for (i = 0; i < lead; i++) cells += '<span></span>';
    for (d = 1; d <= nDays; d++) {
      var dt = mk + '-' + pad(d), ss = by[dt];
      if (ss) cells += '<button type="button" class="hd on' + (tint[ss[0].key] != null ? ' av' + tint[ss[0].key] : '') + (dt === sel ? ' sel' : '') + (dt === t ? ' now' : '') + '" data-act="hist-day" data-d="' + dt + '" aria-pressed="' + (dt === sel) + '" aria-label="' + fmtDate(dt) + ': ' + esc(ss.map(function (s) { return s.name || 'Workout'; }).join(' and ')) + '"><b>' + d + '</b><small>' + esc(ini[ss[0].key] || initials(ss[0].name || 'Workout')) + (ss.length > 1 ? '+' : '') + '</small></button>';
      else cells += '<span class="hd' + (dt === t ? ' now' : '') + (dt > t ? ' future' : '') + '"><b>' + d + '</b></span>';
    }
    h += '<section class="card"><div class="hist-nav"><button class="icon-btn" type="button" data-act="hist-prev" aria-label="Previous month"' + (mk <= f[0].date.slice(0, 7) ? ' disabled' : '') + '>' + IC.left + '</button><h3>' + MONTHS_FULL[mo] + ' ' + y + '<small>' + plural(count, 'workout') + '</small></h3>' +
      '<button class="icon-btn" type="button" data-act="hist-next" aria-label="Next month"' + (mk >= t.slice(0, 7) ? ' disabled' : '') + '>' + IC.right + '</button></div>' +
      '<div class="hist-grid"><span class="hw">M</span><span class="hw">T</span><span class="hw">W</span><span class="hw">T</span><span class="hw">F</span><span class="hw">S</span><span class="hw">S</span>' + cells + '</div>';
    if (legend.length) h += '<div class="hist-key">' + legend.map(function (s) { return '<span><i class="hk' + (tint[s.key] != null ? ' av' + tint[s.key] : '') + '">' + esc(ini[s.key] || initials(s.name || 'Workout')) + '</i>' + esc(s.name || 'Workout') + '</span>'; }).join('') + '</div>';
    h += '</section>';
    var rec = recordsBy(f), shown = sel ? by[sel] : f.slice(-histN).reverse();
    h += '<div class="hist-list" id="hist-list"><h3 class="hist-h">' + (sel ? fmtDate(sel) : 'Latest workouts') + '</h3>';
    shown.forEach(function (s) {
      var open = sel ? histOpen[s.id] !== false : !!histOpen[s.id], du = durOf(s), vol = volOf(s), yr = toDate(s.date).getFullYear() !== new Date().getFullYear() ? ' ' + toDate(s.date).getFullYear() : '';
      var bits = [du ? fmtDur(du) : '', countSets(s) ? plural(countSets(s), 'set') : '', sessSports(s).filter(function (b) { return b.dist; }).map(function (b) { return distText({ sport: b.sport }, b.dist) + ' ' + sportWord(b.sport); }).join(', '), vol ? massText(vol) + ' lifted' : '', rec[s.id] ? plural(rec[s.id], 'new best') : ''].filter(Boolean);
      h += '<section class="card hcard' + (open ? ' open' : '') + '" data-id="' + esc(s.id) + '"><button class="hc-head" type="button" data-act="hist-open" data-id="' + esc(s.id) + '" aria-expanded="' + open + '">' +
        '<span class="txt"><b' + (tint[s.key] != null ? ' class="nm' + tint[s.key] + '"' : '') + '>' + esc(s.name || 'Workout') + '</b><small>' + fmtDate(s.date) + yr + (bits.length ? ' · ' + esc(bits.join(' · ')) : '') + '</small></span><span class="hc-chev" aria-hidden="true">' + IC.down + '</span></button>';
      if (open) {
        h += '<div>';
        (s.entries || []).forEach(function (en) { var e = exi(en.ex, en.name); h += '<div class="sess-entry"><b>' + esc(e.gone ? en.name : e.name) + '</b>' + (en.warm && en.warm.length ? '<span class="warm-l">Warm-up: ' + esc(setsText(e, en.warm)) + '</span>' : '') + '<span>' + esc(setsText(e, en.sets)) + '</span>' + rirLine(en.sets) + (en.note ? '<span>Note: ' + esc(en.note) + '</span>' : '') + '</div>'; });
        h += '</div>' + (s.notes ? '<p class="sub">Notes: ' + esc(s.notes) + '</p>' : '') +
          '<div class="row"><button class="btn sm primary-sm" type="button" data-act="again" data-id="' + esc(s.id) + '">Do this again</button><button class="btn sm" type="button" data-act="open-session" data-id="' + esc(s.id) + '">Edit or delete</button></div>';
      }
      h += '</section>';
    });
    if (!sel && f.length > histN) h += '<button class="btn block" type="button" data-act="hist-more">Show ' + Math.min(10, f.length - histN) + ' more</button><p class="foot hist-count">Showing the latest ' + histN + ' of ' + f.length + '.</p>';
    h += '</div>';
    return h;
  }
  function thirdView() {
    var ex = state.ui.lib3 === 'exercises';
    var h = '<div class="seg" role="group" aria-label="History or exercises"><button type="button" data-act="lib3" data-v="history" aria-pressed="' + !ex + '">History</button><button type="button" data-act="lib3" data-v="exercises" aria-pressed="' + ex + '">Exercises</button></div>';
    if (ex) return h + libraryView();
    h = '<div class="hist-top">' + h + '<button class="hist-sb' + (histSearch ? ' on' : '') + '" type="button" data-act="hist-search" aria-label="' + (histSearch ? 'Close search' : 'Search workouts') + '" aria-expanded="' + histSearch + '">' + (histSearch ? IC.x : IC.search) + '</button></div>';
    if (histSearch) h += '<div class="search">' + IC.search + '<input id="hist-q" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search workouts by exercise" value="' + esc(histQ) + '" aria-label="Search workouts by exercise or session name"></div>';
    return h + '<div class="contents" id="hist-body">' + histBody() + '</div>';
  }
  function histShift(n) {
    var mk = histMonth || today().slice(0, 7), dt = new Date(+mk.slice(0, 4), +mk.slice(5, 7) - 1 + n, 1);
    histMonth = dt.getFullYear() + '-' + pad(dt.getMonth() + 1); histDay = null;
  }

  /* ================= after a workout: compared with last time ================= */
  var DELTA_IC = {
    rec: IC.star,
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17L17 6M9 6h8v8"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7l11 11M9 18h8v-8"/></svg>',
    same: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    'new': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>'
  };
  function cmpHtml(s) {
    var c = s.cmp; if (!c) return '';
    var doc = state.sessions[s.id], sporty = !!(doc && allSport(doc));
    var h = '<div><h3>Compared with last time</h3><p class="sub">Your last ' + esc(s.name) + ' was on ' + fmtDate(c.date) + '.' + (c.n && !sporty ? ' ' + c.up + ' of ' + plural(c.n, 'exercise') + ' improved.' : '') + '</p></div><ul class="cmp">';
    c.rows.forEach(function (r) { h += '<li><span class="txt"><b>' + esc(r.name) + '</b><small>' + esc(r.sets) + '</small></span><span class="delta ' + r.st + '">' + DELTA_IC[r.st] + esc(r.label) + '</span></li>'; });
    h += '</ul>';
    if (s.volRec) h += '<div class="pills"><span class="pill hot">' + IC.star + 'Most weight lifted in ' + esc(/^[aeiou]/i.test(s.name) ? 'an ' : 'a ') + esc(s.name) + ' workout</span></div>';
    if (sporty) return h + '<p class="note"><b>Next time.</b> Match today, or go a little further.</p>';
    h += '<p class="note"><b>Next time.</b> ' + (c.next.length ? esc(c.next.slice(0, 3).join('. ')) + (c.next.length > 3 ? ', and ' + (c.next.length - 3) + ' more.' : '.') : 'The weights stay as they are. Aim for one more rep where you can.') + '</p>';
    return h;
  }

  /* ================= progress: things to look at ================= */
  var ATT_IC = {
    stall: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16l5-6 4 3h9"/></svg>',
    mus: IC.target,
    easy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>'
  };
  /* each item is a title and the one thing to do; the reasoning opens on tap */
  function attentionCard(list) {
    var a = attention(list); if (!a.length) return '';
    var h = '<section class="card"><h3>Needs attention</h3><ul class="att">';
    a.forEach(function (x) {
      var id = x.k + (x.ex || ''), open = !!attOpen[id];
      h += '<li><button class="att-row" type="button" data-act="att-open" data-id="' + esc(id) + '" aria-expanded="' + open + '"><span class="att-i" aria-hidden="true">' + ATT_IC[x.k] + '</span><span class="txt"><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></span><span class="att-go" aria-hidden="true">' + IC.right + '</span></button>' +
        (open ? '<div class="att-more"><p>' + esc(x.d) + '</p>' + (x.ex ? '<button class="act" type="button" data-act="lift" data-ex="' + esc(x.ex) + '">See its chart</button>' : '') + '</div>' : '') + '</li>';
    });
    return h + '</ul></section>';
  }
  /* last week in one card, shown from Monday to Wednesday until it is closed */
  function recapCard(f) {
    var t = today(), ws = weekStart(t);
    if ((toDate(t).getDay() + 6) % 7 > 2 || state.ui.recapSeen === ws) return '';
    var o = weekRecap(f); if (!o) return '';
    var goal = state.settings.weeklyGoal || 4, line = o.core >= goal ? 'Weekly goal of ' + goal + ' reached.' : (goal - o.core) + ' short of your goal of ' + goal + '.';
    if (o.vol) { var p = o.pvol ? Math.round((o.vol - o.pvol) / o.pvol * 100) : null; line += ' ' + massText(o.vol) + ' lifted' + (p == null ? '' : p === 0 ? ', the same as the week before' : ', ' + Math.abs(p) + '% ' + (p > 0 ? 'more' : 'less') + ' than the week before') + '.'; }
    return '<section class="card recap"><div class="spread"><span class="label">Last week, ' + fmtDate(o.start, true) + ' to ' + fmtDate(addDays(o.start, 6), true) + '</span><button class="icon-btn" type="button" data-act="recap-x" aria-label="Close last week’s recap">' + IC.x + '</button></div>' +
      '<div class="recap-t">' + plural(o.n, 'workout') + (o.prs ? ', ' + plural(o.prs, 'new best') : '') + '</div><p class="sub">' + esc(line) + '</p></section>';
  }

  /* ================= progress: body weight goal ================= */
  function aboutWhen(dt) { var d = toDate(dt), day = d.getDate(); return (day <= 10 ? 'early ' : day <= 20 ? 'mid-' : 'late ') + MONTHS_FULL[d.getMonth()] + ' ' + d.getFullYear(); }
  function goalChart(id, pts, trend, g) {
    var W = chartW(), H = 184, m = { l: 36, r: 14, t: 24, b: 24 }, from = addDays(g.lastX, -84), k0 = 0, day = 864e5;
    while (k0 < pts.length - 1 && pts[k0].x < from) k0++;
    var P0 = pts.slice(k0), T0 = trend.slice(k0), x0 = toDate(P0[0].x).getTime(), xn = toDate(g.lastX).getTime();
    var ends = [g.etaRate, g.etaPace].filter(Boolean).map(function (d) { return toDate(d).getTime(); });
    var x1 = Math.min(xn + 182 * day, Math.max.apply(null, ends.concat([xn + 28 * day])));
    var ys = T0.concat([g.goal]), ticks = niceTicks(Math.min.apply(null, ys), Math.max.apply(null, ys), 3), y0 = ticks[0], y1 = ticks[ticks.length - 1];
    function X(v) { return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); }
    function Y(v) { return H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Your weight, where your pace leads and where the target pace leads, against a goal of ' + fmt(g.goal) + ' kilograms">';
    ticks.forEach(function (t) { s += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + fmt(t) + '</text>'; });
    var gy = Y(g.goal), above = gy > 18;
    s += '<line class="goal-ln" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '"/><text class="val" x="' + (m.l + 2) + '" y="' + (above ? gy - 6 : gy + 14).toFixed(1) + '">goal ' + fmt(g.goal) + '</text>';
    s += '<line class="now-ln" x1="' + X(xn).toFixed(1) + '" x2="' + X(xn).toFixed(1) + '" y1="' + m.t + '" y2="' + (H - m.b) + '"/>';
    function proj(eta, cls) {
      if (!eta) return; var te = toDate(eta).getTime(), xe = Math.min(te, x1), ye = g.now + (g.goal - g.now) * (xe - xn) / (te - xn);
      s += '<line class="proj ' + cls + '" x1="' + X(xn).toFixed(1) + '" y1="' + Y(g.now).toFixed(1) + '" x2="' + X(xe).toFixed(1) + '" y2="' + Y(ye).toFixed(1) + '"/>';
      if (te <= x1) s += '<circle class="proj-end ' + cls + '" r="3.5" cx="' + X(xe).toFixed(1) + '" cy="' + Y(ye).toFixed(1) + '"/>';
    }
    proj(g.etaRate, 'rate'); proj(g.etaPace, 'pace');
    var P = P0.map(function (p, i) { return [X(toDate(p.x).getTime()), Y(T0[i])]; });
    if (P.length > 1) s += '<path class="ln draw" pathLength="1" d="' + smoothPath(P) + '"/>';
    var e = P[P.length - 1];
    s += '<line class="cross" id="' + id + '-x" y1="' + m.t + '" y2="' + (H - m.b) + '" x1="0" x2="0" visibility="hidden"/><circle class="dot" id="' + id + '-d" r="4" cx="0" cy="0" visibility="hidden"/>';
    s += '<circle class="dot now-dot" r="4.5" cx="' + e[0].toFixed(1) + '" cy="' + e[1].toFixed(1) + '"/>';
    var tx = Math.max(m.l + 16, Math.min(W - m.r - 16, e[0]));
    if (e[0] - m.l > 96) s += '<text x="' + m.l + '" y="' + (H - 6) + '">' + fmtDate(P0[0].x, true) + '</text>';
    s += '<text x="' + tx.toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">today</text>';
    if (W - m.r - e[0] > 96) s += '<text x="' + (W - m.r) + '" y="' + (H - 6) + '" text-anchor="end">' + fmtDate(iso(new Date(x1)), true) + '</text>';
    s += '</svg><div class="tip" id="' + id + '-t" hidden></div>';
    charts[id] = { type: 'line', P: P, pts: P0.map(function (p, i) { return { tip: '<b>' + fmtDate(p.x) + '</b><br>7-day average ' + fmt(Math.round(T0[i] * 10) / 10) + ' ' + UW() + '' }; }), W: W, XP: [], extra: [] };
    return s;
  }
  function goalCard(pts, trend) {
    var g = goalInfo(pts, trend); if (!g) return '';
    var ST = { done: ['good', 'goal reached'], on: ['good', 'on pace'], slow: ['hot', 'slower than target'], fast: ['hot', 'faster than target'], flat: ['hot', 'holding steady'], away: ['hot', 'moving away'], none: ['', 'pace needs two weeks'] }[g.st];
    var goalT = fmt(g.goal) + ' ' + UW() + '', target = 'At the target pace of ' + fmt(g.rate) + ' ' + UW() + ' a week you would get there around ' + (g.etaRate ? aboutWhen(g.etaRate) : 'two years from now or later') + '.', txt;
    if (g.st === 'done') txt = 'You are within a quarter of a kilo of ' + goalT + '.';
    else if (g.st === 'none') txt = 'Two weeks of weigh-ins are needed to work out your pace. ' + target;
    else if (g.st === 'flat') txt = 'Your weight has held steady over the last ' + Math.round(g.days / 7) + ' weeks. ' + target;
    else if (g.st === 'away') txt = 'Your weight is moving away from ' + goalT + '. ' + target;
    else txt = (g.far ? 'At your pace ' + goalT + ' is more than two years away. ' : 'At your pace you reach ' + goalT + ' around ' + aboutWhen(g.etaPace) + '. ') + (g.st === 'on' ? '' : target) +
      (g.st === 'fast' ? (g.dir > 0 ? ' Gaining faster than the target tends to add more fat than muscle.' : ' Losing faster than the target makes it harder to keep muscle.') : '');
    var pace = g.pace == null ? '–' : (g.pace >= 0 ? '+' : '−') + fmt(Math.abs(Math.round(g.pace * 100) / 100));
    var h = '<section class="card"><div class="spread"><h3>Body weight goal</h3>' + (ST[1] ? '<span class="pill ' + ST[0] + '">' + ST[1] + '</span>' : '') + '</div>' +
      '<div class="goal-head"><b>' + (g.st === 'done' ? fmt(Math.round(g.now * 10) / 10) + ' ' + UW() + '' : fmt(Math.round(g.left * 10) / 10) + ' ' + UW() + ' to ' + (g.dir > 0 ? 'gain' : 'lose')) + '</b><span>' + fmt(Math.round(g.now * 10) / 10) + ' ' + UW() + ' now, goal ' + goalT + (g.pace == null ? '' : ', ' + pace + ' ' + UW() + ' a week over the last ' + Math.round(g.days / 7) + ' weeks') + '</span></div>';
    if (g.st !== 'done') h += '<div class="chart" data-chart="goal">' + goalChart('goal', pts, trend, g) + '</div><div class="legend"><span><i class="ln-k"></i>7-day average</span>' + (g.etaPace ? '<span><i class="ln-k dash"></i>At your pace</span>' : '') + (g.etaRate ? '<span><i class="ln-k dash grey"></i>At the target pace</span>' : '') + '</div>';
    h += '<p class="sub">' + esc(txt) + '</p>';
    var wn = waistNote(state.body); if (wn) h += '<p class="note">' + esc(wn) + '</p>';
    return h + '<p class="foot">“Now” is the average of your last seven days. The goal and the target pace are in settings.</p></section>';
  }
