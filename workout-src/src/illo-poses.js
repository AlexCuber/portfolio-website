/* Poses. Coordinates are in a 120 x 120 box, ground at y = 109. Side views face right unless the
   equipment says otherwise. hands/feet: [x, y, bend] = reach for a point; ['fk', a1, a2] = joint angles. */
(function () {
  'use strict';
  var EX = ILLO.EX, U = ILLO._, add = U.add, sub = U.sub, unit = U.unit, n1 = U.n1, dir = U.dir, G = U.G, AN = 105.8;

  /* ---- equipment ---- */
  function L(x1, y1, x2, y2, w, cls) { return '<line x1="' + n1(x1) + '" y1="' + n1(y1) + '" x2="' + n1(x2) + '" y2="' + n1(y2) + '" stroke-width="' + w + '" class="' + (cls || 'e') + '"/>'; }
  function C(p, r, cls) { return '<circle cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + r + '" class="' + (cls || 'wf') + '"/>'; }
  function ring(p, r, w, cls) { return '<circle cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + r + '" stroke-width="' + (w || 3) + '" class="' + (cls || 'w') + '"/>'; }
  function plate(p, r) { return ring(p, r, 3.2) + C(p, 2.3); }                       /* barbell, seen end-on */
  function dbEnd(p) { return C(p, 4.5) + C(p, 1.5, 'wh'); }                          /* dumbbell, seen end-on */
  function dbSide(p, deg) { var d = dir(deg || 0), a = add(p, d, -5.2), b = add(p, d, 5.2); return L(a[0], a[1], b[0], b[1], 2.2, 'w') + L(add(p, d, -5.6)[0], add(p, d, -5.6)[1], add(p, d, -3.6)[0], add(p, d, -3.6)[1], 7, 'wb') + L(add(p, d, 3.6)[0], add(p, d, 3.6)[1], add(p, d, 5.6)[0], add(p, d, 5.6)[1], 7, 'wb'); }
  function barFront(a, b, over, pl) { var y1 = a[1], y2 = b[1], x1 = a[0] - over, x2 = b[0] + over, s = L(x1, y1, x2, y2, 2.4, 'w'); if (pl !== false) s += L(x1 + 2, y1 - (pl || 8), x1 + 2, y1 + (pl || 8), 4.2, 'wb') + L(x2 - 2, y2 - (pl || 8), x2 - 2, y2 + (pl || 8), 4.2, 'wb'); return s; }
  function pad(x1, y1, x2, y2) { return L(x1, y1, x2, y2, 5.5, 'ep'); }
  function post(x1, y1, x2, y2) { return L(x1, y1, x2, y2, 3, 'e'); }
  function base(x1, x2) { return L(x1, G - 1, x2, G - 1, 3, 'e'); }
  function bench(x1, x2, y) { return [post(x1 + 9, y + 2, x1 + 9, G - 1), post(x2 - 9, y + 2, x2 - 9, G - 1), pad(x1, y, x2, y)]; }
  function stack(x) { return [L(x, 5, x, G - 1, 4.5, 'e'), base(x - 8, x + 8)]; }
  function cable(a, b) { return L(a[0], a[1], b[0], b[1], 1.3, 'c'); }
  function pulley(p) { return ring(p, 2.8, 1.6, 'e'); }
  function grip(p) { return C(p, 2.9); }
  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  /* a pad running along the back of a reclined or seated torso */
  function backPad(J, ext) { var bk = [-J.f2[0], -J.f2[1]], a = add(add(J.hip, [-J.f1[0], -J.f1[1]], 9.6), J.d1, -1), b = add(add(J.sh, bk, 9.6), J.d2, ext == null ? 4 : ext); return pad(a[0], a[1], b[0], b[1]); }
  function shinFront(J, i) { var s = unit(sub(J.ankle[i], J.knee[i])); return [s[1] * J.face, -s[0] * J.face]; }

  var STAND = [[55, AN, -1]], HANG = [['fk', 90, 86]];

  /* ================= CHEST ================= */
  EX['bench-press'] = { v: 'side', hot: ['chest', 'triceps'],
    a: { hip: [74, 85], t: 180, hands: [[47.5, 70, 1, 0.6, 1]], feet: [[98, AN, -1]] },
    b: { hip: [74, 85], t: 180, hands: [[45.5, 53.6, 1, 1, 1]] },
    props: function (J) { return { b: bench(24, 88, 94.6), f: [plate(J.hand[0], 10.5)] }; } };
  EX['bench-press-db'] = { use: 'bench-press', props: function (J) { return { b: bench(24, 88, 94.6), f: [dbEnd(J.hand[0])] }; } };
  EX['incline-db-press'] = { v: 'side', hot: ['chest', 'triceps'],
    a: { hip: [78, 85], t: 210, hands: [[57, 60, 1, 0.6, 1]], feet: [[102, AN, -1]] },
    b: { hip: [78, 85], t: 210, hands: [[52, 38.6, 1, 1, 1]] },
    props: function (J, t, ex) { return { b: [post(46, 80, 46, G - 1), post(88, 96, 88, G - 1), backPad(J, 12), pad(76, 94.6, 94, 94)], f: [ex.bar ? plate(J.hand[0], 10.5) : dbEnd(J.hand[0])] }; } };
  EX['incline-press'] = { use: 'incline-db-press', bar: 1 };
  EX['machine-chest-press'] = { v: 'side', hot: ['chest', 'triceps'],
    a: { hip: [42, 85], t: -97, hands: [[53, 59.5, 1, 0.7, 1]], feet: [[66, AN, -1]] },
    b: { hip: [42, 85], t: -97, hands: [[69, 57, 1, 1, 1]] },
    props: function (J) { var h = J.hand[0]; return { b: [post(44, 96, 44, G - 1), base(28, 62), pad(32, 93.6, 56, 93.6), backPad(J, 0), L(62, 14, h[0] + 1.5, h[1] - 9, 2.4, 'e')], f: [L(h[0] + 1.5, h[1] - 9, h[0] + 1.5, h[1] + 7, 3.6, 'w')] }; } };
  EX['push-up'] = { v: 'side', hot: ['chest', 'triceps'],
    a: { hip: [51.5, 83.4], t: -21, head: -8, hands: [[79, 105.2, 1, 0.94, 1]], feet: [[7, 100.5, 1, 95]] },
    b: { hip: [54.2, 95.4], t: -6, head: -20, hands: [[78, 105.2, 1, 0.6, 0.8]] } };
  EX['dip'] = { v: 'side', hot: ['chest', 'triceps'],
    a: { hip: [55, 56], t: -83, hands: [[60, 57, 1]], feet: [['fk', 96, 150, 95]] },
    b: { hip: [50, 73], t: -66, hands: [[60, 57, 1]], feet: [['fk', 72, 158, 100]] },
    props: function () { return { b: [post(60, 63, 60, G - 1), base(46, 74)], f: [C([60, 60.6], 2.7)] }; } };
  EX['pec-deck'] = { v: 'front', mirror: true, hot: ['chest'],
    a: { hip: [60, 80], hands: [['st', 19.5, 46.5, -0.1]], feet: [[53.5, AN, 1, 0, 0.3, 1]] },
    m: { hands: [['st', 36, 53]] },
    b: { hip: [60, 80], hands: [['st', 56.2, 55.5, 0.16]] },
    props: function (J) { var a = J.hand[0], b = J.hand[1]; return { b: [post(60, 90, 60, G - 1), base(46, 74), pad(46, 87.4, 74, 87.4), L(60, 20, 60, 46, 12, 'ep')], f: [L(a[0], a[1] - 9, a[0], a[1] + 7, 4, 'w'), L(b[0], b[1] - 9, b[0], b[1] + 7, 4, 'w')] }; } };
  EX['cable-fly'] = { v: 'front', mirror: true, hot: ['chest'],
    a: { hip: [60, 58.3], hands: [['st', 22, 22.5, -0.12]], feet: [[52.5, AN, 1]] },
    m: { hands: [['st', 31, 44]] },
    b: { hip: [60, 58.3], hands: [['st', 56.4, 57.5, 0.13]] },
    props: function (J) { return { b: [L(6, 4, 6, G - 1, 4.5, 'e'), L(114, 4, 114, G - 1, 4.5, 'e'), pulley([8, 9]), pulley([112, 9]), cable([8, 9], J.hand[0]), cable([112, 9], J.hand[1])], f: [grip(J.hand[0]), grip(J.hand[1])] }; } };
  EX['low-to-high-cable-fly'] = { v: 'front', mirror: true, hot: ['chest'],
    a: { hip: [60, 58.3], hands: [['st', 30.5, 55, 0.09]], feet: [[52.5, AN, 1]] },
    m: { hands: [['st', 36.5, 39]] },
    b: { hip: [60, 58.3], hands: [['st', 55.8, 30, 0.3]] },
    props: function (J) { return { b: [L(6, 46, 6, G - 1, 4.5, 'e'), L(114, 46, 114, G - 1, 4.5, 'e'), pulley([8, 101]), pulley([112, 101]), cable([8, 101], J.hand[0]), cable([112, 101], J.hand[1])], f: [grip(J.hand[0]), grip(J.hand[1])] }; } };
  EX['db-fly'] = { v: 'front', mirror: true, hot: ['chest'], ground: false,
    a: { hip: [60, 66], hands: [['st', 20.5, 34, -0.1]], feet: [[51, 103, 1, 0, 0.85, 0.75]] },
    m: { hands: [['st', 34, 27]] },
    b: { hip: [60, 66], hands: [['st', 55.4, 35.5, -0.22]] },
    props: function (J) { return { b: ['<rect x="47" y="6" width="26" height="76" rx="6" class="epf"/>'], f: [C(J.hand[0], 4.2), C(J.hand[1], 4.2)] }; } };
  EX['pullover'] = { v: 'side', hot: ['chest', 'back'],
    a: { hip: [78, 85], t: 180, hands: [['fk', 166, 176]], feet: [[102, AN, -1]] },
    b: { hip: [78, 85], t: 180, hands: [['fk', 258, 268]] },
    props: function (J) { return { b: bench(30, 92, 94.6), f: [dbEnd(J.hand[0])] }; } };

  /* ================= BACK ================= */
  EX['lat-pulldown'] = { v: 'back', mirror: true, hot: ['back', 'biceps'],
    a: { hip: [60, 82], hands: [[38, 24, -1]], feet: [[53.5, AN, 1, 0, 0.3, 1]] },
    b: { hip: [60, 82], hands: [[40.5, 46.5, -1]] },
    props: function (J) { var y = J.hand[0][1] - 0.5; return { b: [L(42, 3, 78, 3, 3, 'e'), cable([60, 3], [60, y]), post(60, 92, 60, G - 1), base(46, 74), pad(46, 89.4, 74, 89.4)], f: [L(J.hand[0][0] - 8, y, J.hand[1][0] + 8, y, 3.2, 'w')] }; } };
  EX['pull-up'] = { v: 'back', mirror: true, ground: false, hot: ['back', 'biceps'],
    a: { hip: [60, 75], hands: [[45, 12.5, -1]], feet: [[56, 108.2, 1, 0, 1, 0.42]] },
    b: { hip: [60, 52], hands: [[45, 12.5, -1]], feet: [[56, 85.2, 1, 0, 1, 0.42]] },
    props: function () { return { b: [post(30, 11, 30, 2), post(90, 11, 90, 2)], f: [L(24, 11, 96, 11, 3.6, 'w')] }; } };
  EX['chin-up'] = { v: 'back', mirror: true, ground: false, hot: ['biceps', 'back'],
    a: { hip: [60, 75.5], hands: [[52, 12.5, -1]], feet: [[56, 108.7, 1, 0, 1, 0.42]] },
    b: { hip: [60, 52], hands: [[52, 12.5, -1, 0.7, 0.8]], feet: [[56, 85.2, 1, 0, 1, 0.42]] },
    props: function () { return { b: [post(30, 11, 30, 2), post(90, 11, 90, 2)], f: [L(24, 11, 96, 11, 3.6, 'w')] }; } };
  EX['dead-hang'] = { v: 'back', mirror: true, ground: false, hot: ['forearms'],
    a: { hip: [60, 75], hands: [[45, 12.5, -1]], feet: [[56, 108.2, 1, 0, 1, 0.42]] },
    b: { hip: [60, 75.6], hands: [[45, 12.5, -1]], feet: [[56, 108.8, 1, 0, 1, 0.42]] },
    props: function () { return { b: [post(30, 11, 30, 2), post(90, 11, 90, 2)], f: [L(24, 11, 96, 11, 3.6, 'w')] }; } };
  EX['straight-arm-pulldown'] = { v: 'side', hot: ['back'],
    a: { hip: [48, 58], t: -76, hands: [['fk', -28, -24]], feet: [[49, AN, -1]] },
    b: { hip: [48, 58], t: -76, hands: [['fk', 78, 74]] },
    props: function (J) { return { b: stack(108).concat([pulley([104, 7]), cable([104, 7], J.hand[0])]), f: [L(J.hand[0][0] - 1, J.hand[0][1] - 4, J.hand[0][0] + 1, J.hand[0][1] + 4, 3.2, 'w')] }; } };
  EX['bent-row'] = { v: 'side', hot: ['back', 'biceps'],
    a: { hip: [40, 61], t: -28, head: -24, hands: [[67.5, 79.6, 1]], feet: [[50, AN, -1]] },
    b: { hip: [40, 61], t: -28, head: -24, hands: [[55, 63.5, 1]] },
    props: function (J) { return { f: [plate(J.hand[0], 9)] }; } };
  EX['db-row'] = { v: 'side', hot: ['back', 'biceps'],
    a: { hip: [44, 64], t: -8, head: -20, hands: [[74.5, 92, 1], [86, 85.6, -1]], feet: [[33, AN, -1], ['fk', 52, 176, 100]] },
    b: { hip: [44, 64], t: -8, head: -20, hands: [[62, 71, 1], [86, 85.6, -1]] },
    props: function (J) { return { b: bench(54, 106, 91.4), f: [dbEnd(J.hand[0])] }; } };
  EX['chest-supported-row'] = { v: 'side', hot: ['back', 'biceps'],
    a: { hip: [44, 70], t: -40, head: -22, hands: [[68, 83.4, 1]], feet: [[13, 102, -1, 70]] },
    b: { hip: [44, 70], t: -40, head: -22, hands: [[56, 64, 1]] },
    props: function (J) { return { b: [post(75, 60, 85, G - 1), post(53, 80, 53, G - 1), base(44, 94), pad(48.5, 79, 77, 55)], f: [dbEnd(J.hand[0])] }; } };
  EX['seated-cable-row'] = { v: 'side', hot: ['back', 'biceps'],
    a: { hip: [38, 87], t: -78, hands: [[72, 66, 1]], feet: [[76, 93, -1, -72]] },
    b: { hip: [38, 87], t: -97, hands: [[50, 71, 1]] },
    props: function (J) { return { b: bench(24, 54, 96.5).concat(stack(110), [L(83, 85, 81, 101, 4.5, 'e'), pulley([104, 73]), cable(J.hand[0], [104, 73])]), f: [grip(J.hand[0])] }; } };
  EX['deadlift'] = { v: 'side', hot: ['hams', 'glutes', 'lowback'],
    a: { hip: [40, 72.5], t: -19, head: -30, hands: [[66.5, 96.4, 1]], feet: [[57, AN, -1]] },
    b: { hip: [54, 58], t: -90, head: 0, hands: [[58, 60.6, 1]], feet: [[57, AN, -1]] },
    props: function (J) { return { f: [plate(J.hand[0], 11)] }; } };
  EX['romanian-deadlift'] = { v: 'side', hot: ['hams', 'glutes'],
    a: { hip: [54, 58], t: -88, head: 0, hands: [[58.5, 60.6, 1]], feet: [[55, AN, -1]] },
    b: { hip: [45, 61], t: -18, head: -26, hands: [[73.5, 84.6, 1]] },
    props: function (J) { return { f: [plate(J.hand[0], 9)] }; } };
  EX['good-morning'] = { v: 'side', hot: ['hams', 'glutes', 'lowback'],
    a: { hip: [54, 58], t: -88, head: 0, hands: [['fkr', 150, -30, 0.7, 0.5]], feet: [[55, AN, -1]] },
    b: { hip: [45, 61], t: -18, head: -26, hands: [['fkr', 150, -30, 0.7, 0.5]] },
    props: function (J) { return { f: [plate(add(add(J.sh, J.f2, -6), J.d2, -1.5), 8.6)] }; } };
  EX['back-extension'] = { v: 'side', hot: ['lowback', 'glutes', 'hams'],
    a: { hip: [60, 68], t: 52, head: -30, hands: [['fkr', 165, 40, 0.8, 0.7]], feet: [[26.5, 100, 1, 50]] },
    b: { hip: [60, 68], t: -43, head: 0, hands: [['fkr', 165, 40, 0.8, 0.7]] },
    props: function (J) { return { b: [post(62, 80, 74, G - 1), base(16, 92), post(24, 106, 20, G - 1), pad(50, 82, 68, 67), C([21, 97.5], 3.6, 'epf')] }; } };
  EX['shrug'] = { v: 'front', mirror: true, hot: ['traps'],
    a: { hip: [60, 58.3], sy: 1, hands: [['fk', 97, 93]], feet: [[52.5, AN, 1]] },
    b: { hip: [60, 58.3], sy: -4, hands: [['fk', 97, 93]] },
    props: function (J) { return { f: [C(J.hand[0], 4.4), C(J.hand[1], 4.4)] }; } };
  EX['face-pull'] = { v: 'side', hot: ['delts', 'traps'],
    a: { hip: [46, 58], t: -86, hands: [[78, 28, -1]], feet: [[40, AN, -1], [57, AN, -1]] },
    b: { hip: [46, 58], t: -93, hands: [[58.5, 22, -1, 0.5, 1]] },
    props: function (J) { return { b: stack(108).concat([pulley([104, 24]), cable([104, 24], J.hand[0])]), f: [grip(J.hand[0])] }; } };

  /* ================= SHOULDERS ================= */
  EX['ohp'] = { v: 'front', mirror: true, z: 0.84, hot: ['delts', 'triceps'],
    a: { hip: [60, 58.3], hands: [[40, 25, -1]], feet: [[52, AN, 1]] },
    b: { hip: [60, 58.3], hands: [[48, -2, -1]] },
    props: function (J) { return { f: [barFront(J.hand[0], J.hand[1], 15)] }; } };
  EX['ohp-db'] = { v: 'front', mirror: true, z: 0.84, hot: ['delts', 'triceps'],
    a: { hip: [60, 76], hands: [[38, 43, -1]], feet: [[53.5, AN, 1, 0, 0.3, 1]] },
    b: { hip: [60, 76], hands: [[47, 16, -1]] },
    props: function (J) { return { b: [post(60, 86, 60, G - 1), base(46, 74), pad(46, 83.4, 74, 83.4), L(60, 30, 60, 60, 13, 'ep')], f: [dbSide(J.hand[0], 0), dbSide(J.hand[1], 0)] }; } };
  EX['lateral-raise'] = { v: 'front', mirror: true, hot: ['delts'],
    a: { hip: [60, 58.3], hands: [['fk', 98, 94]], feet: [[52.5, AN, 1]] },
    b: { hip: [60, 58.3], hands: [['fk', 186, 180]] },
    props: function (J) { return { f: [C(J.hand[0], 4.2), C(J.hand[1], 4.2)] }; } };
  EX['cable-lateral-raise'] = { v: 'front', hot: ['delts'],
    a: { hip: [58, 58.3], hands: [[43.5, 58, 1], ['fk', 110, 106]], feet: [[51, AN, 1], [65, AN, -1]] },
    b: { hip: [58, 58.3], hands: [[43.5, 58, 1], ['fk', -6, 0]] },
    props: function (J) { return { b: [L(12, 30, 12, G - 1, 4.5, 'e'), base(4, 20), pulley([14, 100]), cable([14, 100], J.hand[1])], f: [grip(J.hand[1])] }; } };
  EX['front-raise'] = { v: 'side', hot: ['delts'],
    a: { hip: [52, 58], t: -90, hands: [['fk', 86, 82]], feet: [[53, AN, -1]] },
    b: { hip: [52, 58], t: -92, hands: [['fk', -6, -10]] },
    props: function (J) { return { f: [dbEnd(J.hand[0])] }; } };
  EX['upright-row'] = { v: 'front', mirror: true, hot: ['delts', 'traps'],
    a: { hip: [60, 58.3], hands: [['fk', 97, 80]], feet: [[52.5, AN, 1]] },
    b: { hip: [60, 58.3], hands: [['fk', 192, 30]] },
    props: function (J) { return { f: [barFront(J.hand[0], J.hand[1], 12, 6)] }; } };
  EX['reverse-pec-deck'] = { v: 'back', mirror: true, hot: ['delts', 'back'],
    a: { hip: [60, 80], hands: [['st', 56.2, 55.5, 0.16]], feet: [[53.5, AN, 1, 0, 0.3, 1]] },
    m: { hands: [['st', 36, 51]] },
    b: { hip: [60, 80], hands: [['st', 19.5, 47, -0.1]] },
    props: function (J) { var a = J.hand[0], b = J.hand[1]; return { b: [post(60, 90, 60, G - 1), base(46, 74), pad(46, 87.4, 74, 87.4)], f: [L(a[0], a[1] - 9, a[0], a[1] + 7, 4, 'w'), L(b[0], b[1] - 9, b[0], b[1] + 7, 4, 'w')] }; } };
  EX['reverse-fly'] = { v: 'back', mirror: true, hot: ['delts', 'back'],
    a: { hip: [60, 58.3], hands: [['fk', 102, 96, 0.8, 0.8]], feet: [[52.5, AN, 1]] },
    b: { hip: [60, 58.3], hands: [['fk', 186, 180]] },
    props: function (J) { return { f: [C(J.hand[0], 4.2), C(J.hand[1], 4.2)] }; } };
})();
