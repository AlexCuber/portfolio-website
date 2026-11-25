
  /* ================= starting plans ================= */
  /* each exercise: id, sets, lowest reps, highest reps; rest and the rest come from the exercise library */
  var TEMPLATES = [
    { id: 'fb', name: 'Full body', days: [2, 3], blurb: 'Every session trains the whole body. A good fit for two or three days a week.',
      sessions: [
        { id: 'tpl-fb-a', name: 'Full body A', focus: 'Squat, bench press, pulldown', items: [['back-squat', 3, 6, 10], ['barbell-bench-press', 3, 6, 10], ['lat-pulldown', 3, 8, 12], ['romanian-deadlift', 2, 8, 12], ['dumbbell-lateral-raise', 2, 12, 20], ['plank', 2, 30, 60]] },
        { id: 'tpl-fb-b', name: 'Full body B', focus: 'Leg press, shoulder press, row', items: [['leg-press', 3, 8, 12], ['seated-dumbbell-shoulder-press', 3, 8, 12], ['seated-cable-row', 3, 8, 12], ['seated-leg-curl', 2, 10, 15], ['dumbbell-curl', 2, 10, 15], ['triceps-pushdown', 2, 10, 15]] },
        { id: 'tpl-fb-c', name: 'Full body C', focus: 'Split squat, incline press, row', items: [['bulgarian-split-squat', 3, 8, 12], ['incline-dumbbell-press', 3, 6, 10], ['chest-supported-row', 3, 8, 12], ['hip-thrust', 2, 8, 12], ['face-pull', 2, 12, 20], ['cable-crunch', 2, 10, 15]] }
      ] },
    { id: 'ul', name: 'Upper / Lower', days: [4, 5], blurb: 'Two upper-body and two lower-body sessions, so each muscle is trained twice a week, plus an optional lighter fifth day.', builtin: ['upperA', 'lowerA', 'upperB', 'lowerB'], extra: 'day5' },
    { id: 'ppl', name: 'Push / Pull / Legs', days: [3, 6], blurb: 'One session for pushing muscles, one for pulling muscles, one for legs. Run it once a week on three days or twice on six.',
      sessions: [
        { id: 'tpl-push', name: 'Push', focus: 'Chest, shoulders, triceps', items: [['barbell-bench-press', 3, 6, 10], ['seated-dumbbell-shoulder-press', 3, 8, 12], ['incline-dumbbell-press', 3, 8, 12], ['dumbbell-lateral-raise', 3, 12, 20], ['triceps-pushdown', 3, 10, 15], ['overhead-cable-triceps-extension', 2, 10, 15]] },
        { id: 'tpl-pull', name: 'Pull', focus: 'Back, rear shoulders, biceps', items: [['lat-pulldown', 3, 8, 12], ['barbell-row', 3, 6, 10], ['seated-cable-row', 3, 8, 12], ['face-pull', 3, 12, 20], ['ez-bar-curl', 3, 8, 12], ['hammer-curl', 2, 10, 15]] },
        { id: 'tpl-legs', name: 'Legs', focus: 'Quads, hamstrings, calves, abs', items: [['back-squat', 3, 6, 10], ['romanian-deadlift', 3, 6, 10], ['leg-press', 3, 8, 12], ['seated-leg-curl', 3, 10, 15], ['standing-calf-raise', 3, 8, 15], ['hanging-leg-raise', 3, 8, 15]] }
      ] },
    { id: 'none', name: 'Start empty', days: [], blurb: 'No sessions yet. Build your own from the exercise library.' }
  ];
  function template(id) { return TEMPLATES.filter(function (t) { return t.id === id; })[0] || null; }
  function templateFor(days) { return days <= 3 ? 'fb' : days <= 5 ? 'ul' : 'ppl'; }
  /* the sessions a template gives for this many days a week, as { id, name, n } */
  function templateSessions(t, days) {
    if (t.builtin) return t.builtin.concat(t.extra ? [t.extra] : []).map(function (k) { var b = builtin(k); return { id: k, name: shortName(b.name), n: b.items.length, extra: b.core === false }; });
    if (!t.sessions) return [];
    return t.sessions.slice(0, t.id === 'fb' && days <= 2 ? 2 : t.sessions.length).map(function (s) { return { id: s.id, name: s.name, n: s.items.length }; });
  }
  /* Make a template the plan. Whatever was in the plan moves to "Not in the plan"; nothing is deleted. */
  function applyTemplate(id, days) {
    var t = template(id); if (!t) return;
    var want = templateSessions(t, days).map(function (s) { return s.id; });
    planIds().forEach(function (k) { if (want.indexOf(k) < 0) planRemove(k); });
    if (t.builtin) want.forEach(function (k) { var o = state.routines[k]; if (o && o.hidden) planRestore(k); });
    else (t.sessions || []).forEach(function (s) {
      if (want.indexOf(s.id) < 0) return;
      var old = state.routines[s.id];
      saveRoutine({ id: s.id, name: s.name, focus: s.focus, core: true, warmup: '', createdAt: (old && old.createdAt) || Date.now(),
        items: s.items.map(function (x) { var e = exi(x[0]); return { ex: x[0], sets: x[1], lo: x[2], hi: x[3], restSec: e.restSec, link: false }; }) });
    });
    state.settings.weeklyGoal = Math.max(1, Math.min(7, id === 'ul' ? Math.min(days, 4) : days));
    setPlanOrder(want);
  }
  /* a log with nothing in it and no choices made yet gets the setup screen */
  var syncSettled = STANDALONE, setup = null;
  function emptyLog() { return !Object.keys(state.sessions).length && !Object.keys(state.routines).length && !Object.keys(state.body).length && !state.draft; }
  function needSetup() { return !state.settings.setupDone && !state.settings.planOrder && emptyLog() && !editor; }
  function setupState() {
    if (!setup) { var lb = /^en-(US|LR|MM)$/i.test((navigator.language || '')); setup = { unit: lb ? 'lb' : 'kg', days: 4, tpl: 'ul', picked: false }; }
    return setup;
  }
  function finishSetup() {
    var su = setupState(), s = state.settings;
    s.unit = su.unit; s.goalRate = su.unit === 'lb' ? 0.5 : 0.25; s.setupDone = true;
    applyTemplate(su.tpl, su.days); s.weeklyGoal = su.tpl === 'ul' ? Math.min(su.days, 4) : su.days;
    saveSettings(); setup = null;
  }
