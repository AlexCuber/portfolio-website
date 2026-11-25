
  /* ================= endurance: run, ride, swim ================= */
  /* These are cardio exercises with a sport. A set keeps minutes in r as before, plus an optional distance:
     { w: 0, r: minutes, dist }. Distance is in km or miles (metres or yards for swimming), as typed. */
  var OUT = {
    'out-run': { name: 'Run', ini: 'RU', ex: ['outdoor-run'] },
    'out-ride': { name: 'Ride', ini: 'RI', ex: ['bike-ride'] },
    'out-swim': { name: 'Swim', ini: 'SW', ex: ['pool-swim'] },
    'out-brick': { name: 'Brick', ini: 'BR', focus: 'Ride, then run straight off the bike.', ex: ['bike-ride', 'outdoor-run'] }
  };
  var SPORTS = [['run', 'Run', 'out-run'], ['ride', 'Ride', 'out-ride'], ['swim', 'Swim', 'out-swim']];
  /* the fixed one-tap sessions behind the Endurance card; they are not part of the plan and cannot be edited */
  var OUT_DEFAULT = ['outdoor-run', 'bike-ride', 'pool-swim'], OUT_KEY = { 'outdoor-run': 'out-run', 'bike-ride': 'out-ride', 'pool-swim': 'out-swim' }, OUT_SHORT = { 'bike-ride': 'Ride' };
  /* the shortcuts on the Endurance card: exercise ids in the order shown, up to six */
  function outList() { var t = state.settings.outTiles; return (Array.isArray(t) ? t : OUT_DEFAULT).filter(function (id, i, a) { return !exi(id).gone && a.indexOf(id) === i; }).slice(0, 6); }
  function setOutTiles(list) { state.settings.outTiles = list.slice(0, 6); saveSettings(); }
  function outKey(exId) { return OUT_KEY[exId] || 'out-' + exId; }
  function outRoutine(id) {
    var o = OUT[id];
    if (!o && id.indexOf('out-') === 0) { var x = exi(id.slice(4)); if (!x.gone) o = { name: x.name, ex: [x.id] }; }
    if (!o) return null;
    return { id: id, name: o.name, focus: o.focus || '', core: !!state.settings.outCore, warmup: '', fixed: true,
      items: o.ex.map(function (x, i) { var e = exi(x); return { ex: x, n: String(i + 1), sets: 1, lo: e.lo, hi: e.hi, restSec: 0, link: false }; }) };
  }
  function UD(e) { return e.sport === 'swim' ? (isLb() ? 'yd' : 'm') : (isLb() ? 'mi' : 'km'); }
  function mmss(min) { var s = Math.round(min * 60), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + pad(m) : m) + ':' + pad(x); }
  function minText(r) { return Math.abs(r - Math.round(r)) < 1e-6 ? fmt(Math.round(r)) + ' min' : mmss(r); }
  /* total distance and time of an entry; dmin is the time of the sets that have a distance, which is what pace uses */
  function sumSets(sets) { var o = { dist: 0, min: 0, dmin: 0 }; (sets || []).forEach(function (x) { o.min += x.r; if (x.dist > 0) { o.dist += x.dist; o.dmin += x.r; } }); o.dist = r2(o.dist); return o; }
  /* pace the way each sport says it: minutes per km for a run, km an hour for a ride, minutes per 100 m for a swim */
  function paceVal(e, dist, min) { return !(dist > 0) || !(min > 0) ? null : e.sport === 'ride' ? dist / (min / 60) : e.sport === 'swim' ? min / (dist / 100) : min / dist; }
  function paceUnit(e) { return e.sport === 'ride' ? (isLb() ? 'mph' : 'km/h') : e.sport === 'swim' ? '/100 ' + UD(e) : '/' + UD(e); }
  function paceFmt(e, v) { return e.sport === 'ride' ? fmt(Math.round(v * 10) / 10) : mmss(v); }
  function paceText(e, dist, min) { var v = paceVal(e, dist, min); return v == null ? '' : paceFmt(e, v) + ' ' + paceUnit(e); }
  function distText(e, d) { return fmt(e.sport === 'swim' ? Math.round(d) : Math.round(d * 100) / 100) + ' ' + UD(e); }
  function sportText(e, sets) { return sets.map(function (x) { return x.dist > 0 ? distText(e, x.dist) + ' in ' + mmss(x.r) : minText(x.r); }).join(', '); }
  function sportHint(e, last) { var o = sumSets(last.sets), p = paceText(e, o.dist, o.dmin); return (p ? 'Last time ' + p + '. ' : '') + 'Match it, or go a little further.'; }
  /* today's average pace beats every earlier outing of at least four fifths the distance */
  function paceRecord(e, sets, excludeId) {
    var me = sumSets(sets), least = e.sport === 'swim' ? 200 : e.sport === 'ride' ? 5 : 1; if (!e.sport || me.dist < least || !(me.dmin > 0)) return false;
    var p = me.dmin / me.dist, n = 0, beat = true;
    historyOf(e.id).forEach(function (h) { if (h.id === excludeId) return; var o = sumSets(h.sets); if (o.dist >= 0.8 * me.dist && o.dmin > 0) { n++; if (o.dmin / o.dist <= p + 1e-9) beat = false; } });
    return n > 0 && beat;
  }
  /* a saved set as the fields of a row in the workout */
  function rowFrom(e, ps) {
    var row = { w: fmt(ps.w), r: fmt(ps.r), d: true };
    if (e.sport) { var t = Math.round(ps.r * 60); row.r = String(Math.floor(t / 60)); row.sec = t % 60 ? String(t % 60) : ''; row.dist = ps.dist != null ? fmt(ps.dist) : ''; }
    if (ps.rir != null) row.rir = ps.rir;
    return row;
  }
  /* every outing of one sport, oldest first */
  function sportLog(sport, list) {
    var out = [];
    (list || finished()).forEach(function (s) { (s.entries || []).forEach(function (en) { var e = exi(en.ex, en.name); if (e.sport !== sport) return; var o = sumSets(en.sets); out.push({ id: s.id, date: s.date, name: e.name, dist: o.dist, min: o.min, dmin: o.dmin }); }); });
    return out;
  }
  /* what a workout covered, per sport: [{ sport, dist, min, dmin }] */
  function sessSports(s) {
    var by = {}, out = [];
    (s.entries || []).forEach(function (en) { var e = exi(en.ex, en.name); if (!e.sport) return; var o = sumSets(en.sets), b = by[e.sport]; if (!b) { b = by[e.sport] = { sport: e.sport, dist: 0, min: 0, dmin: 0 }; out.push(b); } b.dist = r2(b.dist + o.dist); b.min += o.min; b.dmin += o.dmin; });
    return out;
  }
  function allSport(s) { return !!(s.entries || []).length && s.entries.every(function (en) { return exi(en.ex, en.name).sport; }); }
  function sportWord(sp) { return sp === 'ride' ? 'ride' : sp === 'swim' ? 'swim' : 'run'; }
