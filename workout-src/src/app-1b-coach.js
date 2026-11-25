
  /* ================= coaching: today's targets, comparisons, things to watch ================= */
  function r2(x) { return Math.round(x * 100) / 100; }
  function massText(v) { return isLb() ? compact(v) + ' lb' : v >= 1000 ? fmt(Math.round(v / 100) / 10) + ' t' : Math.round(v) + ' ' + UW() + ''; }
  /* is a lift moving? estimated 1-rep max for weights; for bodyweight moves added weight counts first, then reps */
  function progressScore(e, sets) { return e.log === 'bw' ? Math.max.apply(null, sets.map(function (x) { return (x.w || 0) * 1000 + x.r; })) : metric(e, sets); }
  /* the next step up in weight: small for light loads, the usual dumbbell or plate jump after that */
  function wStep(e, w) { if (isLb()) return w < 20 ? 2.5 : 5; if (w < 10) return 1; return /dumbbell/i.test(e.equip || '') ? 2 : 2.5; }
  /* Today's target from last time's sets, by double progression: add a rep until every planned set is at the top
     of the range, then add weight and start again from the bottom. Returns { sets, text, up, step }; sets is null the first time. */
  function targetFor(it, e, last) {
    var h = hint(it, e, last);
    if (!last || !last.sets || !last.sets.length) return { sets: null, text: h.t, short: h.s, up: false };
    var prev = last.sets, n = e.log === 'cardio' ? 1 : Math.max(it.sets || 1, prev.length), sets = [], i, k = -1;
    for (i = 0; i < n; i++) { var p = prev[i] || prev[prev.length - 1]; sets.push({ w: p.w || 0, r: p.r, dist: p.dist }); }
    if (e.log === 'cardio' || !it.hi) return { sets: sets, text: h.t, short: h.s, up: false };
    var planned = prev.slice(0, it.sets), top = planned.length >= it.sets && planned.every(function (s) { return s.r >= it.hi; });
    var loaded = e.log === 'wr' || (e.log === 'bw' && prev.some(function (s) { return s.w > 0; }));
    var easy = !top && loaded && planned.length >= it.sets && planned.every(function (s) { return s.rir != null && s.rir >= 3; });
    if (easy) {
      var st2 = wStep(e, sets[0].w);
      sets.forEach(function (s) { s.w = r2(s.w + wStep(e, s.w)); });
      return { sets: sets, text: 'You had 3 or more reps left on every set last time, so the weight goes up by ' + fmt(st2) + ' ' + UW() + '. Same reps.', short: '+' + fmt(st2) + ' ' + UW() + ' today · same reps', up: true, step: st2, easy: true };
    }
    if (top && !loaded) return { sets: sets, text: h.t, short: h.s, up: true };
    if (top) {
      var step = wStep(e, sets[0].w);
      sets.forEach(function (s) { s.w = r2(s.w + wStep(e, s.w)); s.r = it.lo; });
      return { sets: sets, text: 'Every set reached ' + it.hi + ' last time, so the weight goes up by ' + fmt(step) + ' ' + UW() + ' and the reps start again at ' + it.lo + '.', short: '+' + fmt(step) + ' ' + UW() + ' today · reps restart at ' + it.lo, up: true, step: step };
    }
    for (i = 0; i < Math.min(sets.length, it.sets || sets.length); i++) if (sets[i].r < it.hi) { k = i; break; }
    if (k < 0) return { sets: sets, text: 'Same ' + (e.log === 'time' ? 'holds' : 'weight') + '. Get all ' + it.sets + ' sets to ' + it.hi + (e.log === 'time' ? ' s.' : ' reps.'), short: 'Same ' + (e.log === 'time' ? 'holds' : 'weight') + ' · all ' + it.sets + ' sets to ' + it.hi, up: false };
    if (e.log === 'time') { sets[k].r = Math.min(it.hi, sets[k].r + 5); return { sets: sets, text: 'Hold set ' + (k + 1) + ' a little longer than last time.', short: 'Hold set ' + (k + 1) + ' a little longer', up: false }; }
    sets[k].r = sets[k].r + 1;
    return { sets: sets, text: (loaded ? 'Same weight. ' : '') + 'One more rep on set ' + (k + 1) + ' than last time.', short: (loaded ? 'Same weight · one' : 'One') + ' more rep on set ' + (k + 1), up: false };
  }

  /* how one exercise went against the last time: { st: up | same | down, label } */
  function entryDelta(e, a, b) {
    function sum(x) { return x.reduce(function (t, s) { return t + s.r; }, 0); }
    function topW(x) { return Math.max.apply(null, x.map(function (s) { return s.w || 0; })); }
    if (e.sport) {
      var A = sumSets(a), B = sumSets(b);
      if (A.dist > 0 && B.dist > 0) {
        var dd = A.dist - B.dist;
        if (Math.abs(dd) > Math.max(B.dist * 0.01, 0.005)) return { st: dd > 0 ? 'up' : 'down', label: (dd > 0 ? '+' : '−') + distText(e, Math.abs(dd)) };
        var pa = A.dmin / A.dist, pb = B.dmin / B.dist;
        return Math.abs(pa - pb) / pb < 0.005 ? { st: 'same', label: 'same' } : { st: pa < pb ? 'up' : 'down', label: pa < pb ? 'faster' : 'slower' };
      }
    }
    var timed = e.log === 'cardio' || e.log === 'time', dw = timed ? 0 : r2(topW(a) - topW(b)), dr = r2(sum(a) - sum(b));
    if (dw) return { st: dw > 0 ? 'up' : 'down', label: (dw > 0 ? '+' : '−') + fmt(Math.abs(dw)) + ' ' + UW() + '' };
    if (!dr) return { st: 'same', label: 'same' };
    if (timed) return { st: dr > 0 ? 'up' : 'down', label: (dr > 0 ? '+' : '−') + fmt(Math.abs(dr)) + (e.log === 'cardio' ? ' min' : ' s') };
    return { st: dr > 0 ? 'up' : 'down', label: dr > 0 ? '+' + plural(dr, 'rep') : plural(-dr, 'rep') + ' fewer' };
  }
  /* the finished workout against the last time the same session was done */
  function compareSession(doc, before, recEx, items) {
    if (doc.key === 'free') return null;
    var prev = null; before.forEach(function (s) { if (s.key === doc.key && s.date <= doc.date) prev = s; });
    if (!prev) return null;
    var rows = [], up = 0, n = 0, used = {};
    doc.entries.forEach(function (en) {
      var e = exi(en.ex, en.name), pe = null;
      (prev.entries || []).forEach(function (x, j) { if (!pe && !used[j] && x.ex === en.ex && x.sets && x.sets.length) { pe = x; used[j] = 1; } });
      var o = pe ? entryDelta(e, en.sets, pe.sets) : { st: 'new', label: 'new today' };
      if (recEx[en.ex]) o = { st: 'rec', label: recEx[en.ex] };
      if (pe || o.st === 'rec') { n++; if (o.st === 'up' || o.st === 'rec') up++; }
      rows.push({ name: e.gone ? en.name : e.name, sets: setsText(e, en.sets), st: o.st, label: o.label });
    });
    var da = durOf(doc), db2 = durOf(prev), va = volOf(doc), vb = volOf(prev), next = [];
    (items || []).forEach(function (it) {
      var e = exi(it.ex), sets = rowSets(it); if (!sets.length || (e.log !== 'wr' && e.log !== 'bw')) return;
      var t = targetFor(it, e, { sets: sets });
      if (t.up && t.step) next.push(e.name + ' goes up to ' + fmt(t.sets[0].w) + ' ' + UW() + '' + (t.easy ? '' : ' for ' + it.lo + ' reps'));
    });
    return { date: prev.date, rows: rows, up: up, n: n, durDiff: da && db2 ? Math.round((da - db2) / 60) : null, volPct: vb > 0 ? Math.round((va - vb) / vb * 100) : null, next: next };
  }

  /* how many exercises set a new best in each workout, replaying the log in order */
  function recordsBy(list) {
    var best = {}, out = {};
    list.forEach(function (s) {
      (s.entries || []).forEach(function (en) {
        var e = exi(en.ex, en.name), m = metric(e, en.sets); if (m == null) return;
        if (best[en.ex] != null && m > best[en.ex] + 1e-9) out[s.id] = (out[s.id] || 0) + 1;
        if (best[en.ex] == null || m > best[en.ex]) best[en.ex] = m;
      });
    });
    return out;
  }
  /* last week in numbers, with the week before for comparison; null when nothing was logged */
  function weekRecap(list) {
    var ws = weekStart(today()), a = addDays(ws, -7), b = addDays(ws, -14), rec = recordsBy(list), o = { start: a, n: 0, core: 0, sets: 0, vol: 0, prs: 0, pvol: 0, pn: 0 };
    list.forEach(function (s) {
      if (s.date >= a && s.date < ws) { o.n++; if (isCore(s)) o.core++; o.sets += countSets(s); o.vol += volOf(s); o.prs += rec[s.id] || 0; }
      else if (s.date >= b && s.date < a) { o.pvol += volOf(s); o.pn++; }
    });
    return o.n ? o : null;
  }

  var NUM_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
  /* things worth a look: lifts that stopped moving, muscles that stay under their weekly sets, no easier week for a long time */
  function attention(list) {
    var out = [], t = today(), ws = weekStart(t), seen = {}, stalled = [], i;
    routineList().forEach(function (r) {
      r.items.forEach(function (it) {
        if (seen[it.ex]) return; seen[it.ex] = 1;
        var e = exi(it.ex); if (e.gone || (e.log !== 'wr' && e.log !== 'bw')) return;
        var h = historyOf(it.ex, list); if (h.length < 4) return;
        var l4 = h.slice(-4); if (l4[3].date < addDays(t, -28)) return;
        var base = progressScore(e, l4[0].sets);
        if (!l4.slice(1).every(function (x) { return progressScore(e, x.sets) <= base + 1e-9; })) return;
        /* how long it has gone on: sessions, counted back from the latest, that did not beat the eight before them */
        var mets = h.map(function (x) { return progressScore(e, x.sets); }), n = 0;
        for (i = h.length - 1; i > 0; i--) { if (mets[i] <= Math.max.apply(null, mets.slice(Math.max(0, i - 8), i)) + 1e-9) n++; else break; }
        n = Math.max(3, n);
        stalled.push({ it: it, e: e, n: n, last: l4[3] });
      });
    });
    stalled.sort(function (a, b) { return b.n - a.n; }).slice(0, 2).forEach(function (s) {
      var e = s.e, it = s.it, top = bestSet(e, s.last.sets, 'top'), swap = it.swap || e.swap, tip;
      if (top.w > 0) tip = 'Try ' + (e.log === 'bw' ? '+' : '') + fmt(r2(top.w + wStep(e, top.w))) + ' ' + UW() + ' for sets of ' + it.lo + (swap ? ', or swap it for a few weeks: ' + swap.charAt(0).toLowerCase() + swap.slice(1) + '.' : ', or swap it for a similar exercise for a few weeks.');
      else tip = 'Add a little weight or slow the lowering' + (swap ? ', or swap it for a few weeks: ' + swap.charAt(0).toLowerCase() + swap.slice(1) + '.' : '.');
      out.push({ k: 'stall', ex: it.ex, t: e.name + ' has stalled', d: setsText(e, s.last.sets) + ' last time, and no better set in the last ' + NUM_WORDS[Math.min(s.n, 12)].toLowerCase() + ' sessions. ' + tip });
    });
    var from = addDays(ws, -28), plan = planTargets(), got = {}, weeks = {};
    list.forEach(function (s) {
      if (s.date < from || s.date >= ws) return; weeks[weekStart(s.date)] = 1;
      (s.entries || []).forEach(function (en) { var e = exi(en.ex); if (e.log === 'cardio') return; Object.keys(e.muscles).forEach(function (mu) { got[mu] = (got[mu] || 0) + en.sets.length * e.muscles[mu] / 4; }); });
    });
    if (Object.keys(weeks).length >= 3) {
      var behind = LIBRARY.MUSCLES.filter(function (m) { return plan[m.id] >= 4 && (got[m.id] || 0) < 0.7 * plan[m.id]; }).sort(function (a, b) { return (got[a.id] || 0) / plan[a.id] - (got[b.id] || 0) / plan[b.id]; }).slice(0, 3);
      if (behind.length) {
        var names = behind.map(function (m) { return m.name; }), title = names.length === 1 ? names[0] + (/s$/.test(names[0]) ? ' are' : ' is') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1].toLowerCase() + ' are';
        out.push({ k: 'mus', t: title + ' behind your plan', d: behind.map(function (m) { return m.name + ' ' + fmt(Math.round((got[m.id] || 0) * 10) / 10) + ' of ' + fmt(Math.round(plan[m.id] * 10) / 10); }).join(', ') + ' sets a week, averaged over the last four weeks.' });
      }
    }
    var wk = {}, vals = [], run = 0;
    list.forEach(function (s) { var k = weekStart(s.date); wk[k] = (wk[k] || 0) + countSets(s); });
    for (i = 1; i <= 12; i++) vals.push(wk[addDays(ws, -7 * i)] || 0);
    var nz = vals.filter(Boolean).sort(function (a, b) { return a - b; }), med = nz.length ? nz[Math.floor(nz.length / 2)] : 0;
    for (i = 0; i < vals.length; i++) { if (vals[i] > 0 && vals[i] >= 0.7 * med) run++; else break; }
    if (run >= 7) out.push({ k: 'easy', t: NUM_WORDS[Math.min(run, 12)] + (run >= 12 ? ' or more' : '') + ' weeks without an easy week', d: 'Consider one lighter week: the same exercises with about half the sets. It gives joints and tendons time to catch up.' });
    return out;
  }

  /* body weight against the goal: pace over the last four weeks, the target pace, and when each would get there */
  function goalInfo(pts, trend) {
    var goal = state.settings.goalWeight, rate = state.settings.goalRate || (isLb() ? 0.5 : 0.25); if (!goal || !pts.length) return null;
    var now = trend[trend.length - 1], lastX = pts[pts.length - 1].x, ref = 0, from = addDays(lastX, -28), i;
    for (i = 0; i < pts.length; i++) if (pts[i].x >= from) { ref = i; break; }
    var days = Math.round((toDate(lastX) - toDate(pts[ref].x)) / 864e5), pace = days >= 14 ? (now - trend[ref]) / days * 7 : null;
    var dir = goal >= now ? 1 : -1, left = Math.abs(goal - now), toward = pace == null ? 0 : pace * dir;
    var k = isLb() ? 2.2 : 1, st = left < 0.25 * k ? 'done' : pace == null ? 'none' : toward < -0.03 * k ? 'away' : toward <= 0.03 * k ? 'flat' : toward < rate * 0.7 ? 'slow' : toward > rate * 1.4 ? 'fast' : 'on';
    function eta(perWeek) { var d = Math.round(left / perWeek * 7); return d > 730 ? null : addDays(lastX, d); }
    return { goal: goal, rate: rate, now: now, first: pts[0].y, dir: dir, left: left, pace: pace, days: days, st: st, lastX: lastX,
      etaPace: toward > 0.03 * k ? eta(toward) : null, far: toward > 0.03 * k && !eta(toward), etaRate: eta(rate) };
  }
  /* what waist and weight say together, in one sentence; empty when there is too little to go on */
  function waistNote(body) {
    var ks = Object.keys(body).sort(), w = ks.filter(function (k) { return body[k].waist != null; }), g = ks.filter(function (k) { return body[k].weight != null; });
    if (w.length < 2) return g.length >= 3 ? 'Add a waist measurement every week or two. Next to your weight it shows whether a change is muscle or fat.' : '';
    var b = w[w.length - 1], from = addDays(b, -56), a = w.filter(function (k) { return k >= from; })[0];
    var days = Math.round((toDate(b) - toDate(a)) / 864e5); if (days < 14 || !g.length) return '';
    function near(k) { var best = g[0]; g.forEach(function (x) { if (Math.abs(toDate(x) - toDate(k)) < Math.abs(toDate(best) - toDate(k))) best = x; }); return Math.abs(toDate(best) - toDate(k)) <= 5 * 864e5 ? body[best].weight : null; }
    var wa = near(a), wb = near(b); if (wa == null || wb == null) return '';
    var lb = isLb(), one = lb ? 0.4 : 1, kq = lb ? 0.66 : 0.3, dW = r2(body[b].waist - body[a].waist), dKg = wb - wa, wk = Math.round(days / 7), by = fmt(Math.abs(Math.round(dW * 10) / 10)) + ' ' + UL() + '', at = fmt(body[b].waist) + ' ' + UL() + '';
    if (dKg > kq) return dW <= -one ? 'Waist is down ' + by + ' in ' + wk + ' weeks while weight rises, a good sign that the gain is muscle.' : dW < one ? 'Waist is steady at ' + at + ' while weight rises, which points to muscle more than fat.' : 'Waist is up ' + by + ' in ' + wk + ' weeks along with your weight, so part of the gain is likely fat. A slower pace keeps it leaner.';
    if (dKg < -kq) return dW <= -one ? 'Waist is down ' + by + ' in ' + wk + ' weeks along with your weight, so the loss is coming off the middle.' : 'Weight is down but waist is unchanged at ' + at + '. Keep protein and training up so the loss is not muscle.';
    return dW <= -one ? 'Weight is steady and waist is down ' + by + ' in ' + wk + ' weeks, which points to fat going and muscle coming.' : dW >= one ? 'Weight is steady but waist is up ' + by + ' in ' + wk + ' weeks.' : '';
  }

  /* start a workout with the same exercises as an earlier one */
  function repeatDraft(s) {
    var r = s.key !== 'free' ? getRoutine(s.key) : null, byEx = {}, ents = (s.entries || []).filter(function (en) { return !exi(en.ex, en.name).gone; });
    if (r && r.items.length === ents.length && r.items.every(function (it, i) { return it.ex === ents[i].ex; })) { startDraft(s.key); return; }
    if (r) r.items.forEach(function (it) { byEx[it.ex] = it; });
    startDraft(r ? s.key : 'free');
    var d = state.draft; d.name = s.name || d.name;
    d.items = ents.map(function (en) {
      var e = exi(en.ex), p = byEx[en.ex];
      var src = p ? Object.assign({}, p, { n: en.n || p.n || 'x', link: false, group: '', restSec: p.restSec < 30 ? e.restSec : p.restSec }) : { ex: en.ex, n: en.n || 'x', sets: Math.max(1, en.sets.length), lo: e.lo, hi: e.hi, restSec: e.restSec };
      return itemFrom(src, blankRows(e.log === 'cardio' ? 1 : Math.max(1, p ? p.sets : en.sets.length)), '');
    });
    touchDraft(true); render(); window.scrollTo(0, 0);
  }

  /* ================= units ================= */
  /* Numbers in the log are in the person's own units; nothing is converted on the fly. */
  function isLb() { return state.settings.unit === 'lb'; }
  function UW() { return isLb() ? 'lb' : 'kg'; }
  function UL() { return isLb() ? 'in' : 'cm'; }
  function KGF() { return isLb() ? 0.45359237 : 1; }
  function roundTo(x, s) { return r2(Math.round(x / s) * s); }
  /* switch units and convert what is already logged */
  function convertUnits(to) {
    if (to === (isLb() ? 'lb' : 'kg')) return;
    var f = to === 'lb' ? 1 / 0.45359237 : 0.45359237, fl = to === 'lb' ? 1 / 2.54 : 2.54, now = Date.now(), s = state.settings;
    Object.keys(state.sessions).forEach(function (id) {
      var doc = state.sessions[id], any = false;
      (doc.entries || []).forEach(function (en) { var swim = exi(en.ex, en.name).sport === 'swim'; (en.sets || []).forEach(function (x) { if (x.w) { x.w = roundTo(x.w * f, 0.25); any = true; } if (x.dist) { x.dist = swim ? Math.round(x.dist * (to === 'lb' ? 1.0936133 : 0.9144)) : Math.round(x.dist * (to === 'lb' ? 0.6213712 : 1.609344) * 100) / 100; any = true; } }); });
      if (any) { doc.updatedAt = now; mark('sessions/' + id); }
    });
    Object.keys(state.body).forEach(function (k) {
      var b = state.body[k];
      if (b.weight != null) b.weight = Math.round(b.weight * f * 10) / 10;
      ['waist', 'chest', 'arm', 'thigh'].forEach(function (m) { if (b[m] != null) b[m] = Math.round(b[m] * fl * 10) / 10; });
      b.updatedAt = now; mark('body/' + k);
    });
    if (s.goalWeight != null) s.goalWeight = Math.round(s.goalWeight * f * 2) / 2;
    s.goalRate = to === 'lb' ? Math.round((s.goalRate || 0.25) * f * 10) / 10 : Math.round((s.goalRate || 0.5) * f * 20) / 20;
    delete s.bars; s.unit = to; saveSettings();
  }

  /* ================= plates and warm-up sets ================= */
  var BAR_RX = /barbell|smith|ez bar|trap bar/i;
  function isBar(e) { return BAR_RX.test(e.equip || ''); }
  function barFor(e) { var b = (state.settings.bars || {})[e.id]; if (b != null) return b; if (!isBar(e)) return 0; return /ez/i.test(e.equip) ? (isLb() ? 25 : 10) : (isLb() ? 45 : 20); }
  function barChoices() { return isLb() ? [45, 35, 25, 15, 0] : [20, 15, 10, 7.5, 0]; }
  function plateSizes() { return isLb() ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25]; }
  /* plates for one side, largest first; rem is what the standard plates cannot make up */
  function platesFor(total, bar) {
    var left = r2((total - bar) / 2), out = []; if (left < -1e-9) return null;
    plateSizes().forEach(function (p) { while (left >= p - 1e-9) { out.push(p); left = r2(left - p); } });
    return { side: out, rem: left, loaded: r2(total - 2 * left) };
  }
  /* ramp-up sets below the working weight: about 50, 70 and 85 percent for 8, 5 and 2 reps, or one feeler set at 60 percent */
  function warmups(W, e, full) {
    var lb = isLb(), bar = isBar(e) ? barFor(e) : 0, step = W < (lb ? 45 : 20) ? (lb ? 2.5 : 1) : /dumbbell/i.test(e.equip || '') ? (lb ? 5 : 2) : (lb ? 5 : 2.5), out = [], seen = {};
    function add(p, reps) { var w = Math.max(bar, roundTo(W * p, step)); if (w <= 0 || w >= W - 1e-9 || seen[w]) return; seen[w] = 1; out.push({ w: w, r: reps }); }
    if (!full) { add(0.6, 5); return out; }
    if (bar > 0 && W * 0.5 > bar * 1.3) { seen[bar] = 1; out.push({ w: bar, r: 10, bar: true }); }
    add(0.5, 8); add(0.7, 5); add(0.85, 2);
    return out;
  }
  /* the weight the next set will use: what is typed, else today's target, else the last set done */
  function workingWeight(it) {
    var d = state.draft, e = exi(it.ex), tg = d.editing ? null : targetFor(it, e, lastEntry(d.key, it.ex, d.id)), i, w;
    for (i = 0; i < it.rows.length; i++) { if (it.rows[i].d) continue; w = num(it.rows[i].w); if (w != null) return w; if (tg && tg.sets) return (tg.sets[i] || tg.sets[tg.sets.length - 1]).w || null; break; }
    for (i = it.rows.length - 1; i >= 0; i--) { w = num(it.rows[i].w); if (w != null) return w; }
    return null;
  }
  /* the first lift of a workout gets the full ramp; after that the body is warm and one feeler set is enough */
  function warmedUp(it) {
    var d = state.draft, ix = d.items.indexOf(it);
    return d.items.slice(0, ix).some(function (x) { var o = exi(x.ex); return o.log === 'wr' || o.log === 'bw'; });
  }

  /* ================= swaps ================= */
  /* other exercises for the same main muscle, the plan's own suggestion first, different equipment preferred */
  function swapsFor(it, d) {
    var e = exi(it.ex), mine = Object.keys(e.muscles), tot = 0, main = {}, used = {}, done = {}, hint = ((it.swap || '') + ' ' + (e.swap || '')).toLowerCase(), lifting = e.log === 'wr' || e.log === 'bw';
    mine.forEach(function (m) { tot += e.muscles[m]; if (e.muscles[m] >= 1) main[m] = 1; });
    d.items.forEach(function (x) { used[x.ex] = 1; });
    finished().forEach(function (s) { (s.entries || []).forEach(function (en) { done[en.ex] = 1; }); });
    return allEx().filter(function (c) { return c.id !== e.id && !used[c.id] && (lifting ? (c.log === 'wr' || c.log === 'bw') : c.log === e.log); }).map(function (c) {
      var ov = 0, hit = false, named = c.name.length > 5 && hint.indexOf(c.name.toLowerCase()) >= 0;
      mine.forEach(function (m) { var v = c.muscles[m] || 0; ov += Math.min(e.muscles[m], v); if (main[m] && v >= 1) hit = true; });
      var s = tot ? ov / tot : (c.group === e.group ? 1 : 0);
      return { c: c, named: named, ok: named || (tot ? hit && s >= 0.6 : s > 0), s: s + (named ? 2 : 0) + (c.equip !== e.equip ? 0.15 : 0) + (done[c.id] ? 0.1 : 0) + (c.log === e.log ? 0.05 : 0) };
    }).filter(function (x) { return x.ok; }).sort(function (a, b) { return b.s - a.s || (a.c.name < b.c.name ? -1 : 1); }).slice(0, 6);
  }
  /* put another exercise in this slot, keeping the slot's sets, rep range and rest when both are logged the same way */
  function swapItem(u, exId) {
    var d = state.draft, old = findItem(u); if (!d || !old) return null;
    var ix = d.items.indexOf(old), e = exi(exId), oe = exi(old.ex), keep = oe.log === e.log;
    var ni = itemFrom({ ex: exId, n: old.n, group: old.group, link: old.link, sets: keep ? old.sets : e.sets, lo: keep ? old.lo : e.lo, hi: keep ? old.hi : e.hi, rir: keep ? old.rir : e.rir,
      restSec: old.link || old.restSec >= 30 ? old.restSec : e.restSec }, blankRows(e.log === 'cardio' ? 1 : (keep ? Math.max(1, old.rows.length) : e.sets)), '');
    if (old.link) ni.restSec = old.restSec;
    d.items[ix] = ni; if (d.timer && d.timer.u === u) delete d.timer;
    touchDraft(); return ni;
  }

  /* ================= countdown for holds and cardio ================= */
  function timerStart(u, i) {
    var d = state.draft, it = findItem(u); if (!d || !it || !it.rows[i]) return;
    var e = exi(it.ex), el = document.getElementById('r-' + u + '-' + i), v = num(it.rows[i].r);
    if (v == null && el && el.placeholder) v = num(el.placeholder);
    if (v == null && it.lo) v = it.lo; /* nothing typed and no target yet: the bottom of the planned range */
    if (e.sport) { d.timer = { u: u, i: i, start: Date.now(), total: 0, mul: 60, go: true, sw: true }; stopRest(); touchDraft(true); render(); drawRest(); return; }
    var mul = e.log === 'cardio' ? 60 : 1, lead = e.log === 'time' ? 5000 : 0;
    d.timer = { u: u, i: i, start: Date.now() + lead, total: v ? Math.round(v * mul) : 0, mul: mul, go: !lead };
    stopRest(); unlockAudio(); touchDraft(true); render(); drawRest();
  }
  /* done: the countdown ran out. Otherwise it was stopped by hand and the time so far is logged. */
  function timerStop(done) {
    var d = state.draft, t = d && d.timer; if (!t) return;
    var it = findItem(t.u), el = Math.floor((Date.now() - t.start) / 1000), secs = done && t.total ? t.total : el;
    delete d.timer;
    if (t.sw) {
      if (it && it.rows[t.i] && el >= 5) { it.rows[t.i].r = String(Math.floor(el / 60)); it.rows[t.i].sec = String(el % 60); }
      touchDraft(true); render(); drawRest();
      var df = document.getElementById('d-' + t.u + '-' + t.i); if (df && el >= 5 && !df.value) df.focus();
      return;
    }
    if (!it || !it.rows[t.i] || secs < (t.mul === 60 ? 30 : 1)) { touchDraft(true); render(); drawRest(); return; }
    var row = it.rows[t.i]; row.r = fmt(t.mul === 60 ? Math.max(1, Math.round(secs / 60)) : secs);
    touchDraft(true); render();
    var btn = document.querySelector('[data-act="tick"][data-u="' + t.u + '"][data-i="' + t.i + '"]');
    if (!row.d) { if (btn) btn.click(); else { row.d = true; touchDraft(true); } }
    drawRest();
  }
