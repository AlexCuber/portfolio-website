(function () {
  'use strict';
  var EX = ILLO.EX, U = ILLO._, add = U.add, sub = U.sub, unit = U.unit, n1 = U.n1, dir = U.dir, G = U.G, AN = 105.8;
  function L(x1, y1, x2, y2, w, cls) { return '<line x1="' + n1(x1) + '" y1="' + n1(y1) + '" x2="' + n1(x2) + '" y2="' + n1(y2) + '" stroke-width="' + w + '" class="' + (cls || 'e') + '"/>'; }
  function C(p, r, cls) { return '<circle cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + r + '" class="' + (cls || 'wf') + '"/>'; }
  function ring(p, r, w, cls) { return '<circle cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + r + '" stroke-width="' + (w || 3) + '" class="' + (cls || 'w') + '"/>'; }
  function plate(p, r) { return ring(p, r, 3.2) + C(p, 2.3); }
  function dbEnd(p) { return C(p, 4.5) + C(p, 1.5, 'wh'); }
  function dbSide(p, deg) { var d = dir(deg || 0), a = add(p, d, -5.2), b = add(p, d, 5.2), c1 = add(p, d, -5.6), c2 = add(p, d, -3.6), c3 = add(p, d, 3.6), c4 = add(p, d, 5.6); return L(a[0], a[1], b[0], b[1], 2.2, 'w') + L(c1[0], c1[1], c2[0], c2[1], 7, 'wb') + L(c3[0], c3[1], c4[0], c4[1], 7, 'wb'); }
  function pad(x1, y1, x2, y2) { return L(x1, y1, x2, y2, 5.5, 'ep'); }
  function post(x1, y1, x2, y2) { return L(x1, y1, x2, y2, 3, 'e'); }
  function base(x1, x2) { return L(x1, G - 1, x2, G - 1, 3, 'e'); }
  function bench(x1, x2, y) { return [post(x1 + 9, y + 2, x1 + 9, G - 1), post(x2 - 9, y + 2, x2 - 9, G - 1), pad(x1, y, x2, y)]; }
  function stack(x) { return [L(x, 5, x, G - 1, 4.5, 'e'), base(x - 8, x + 8)]; }
  function cable(a, b) { return L(a[0], a[1], b[0], b[1], 1.3, 'c'); }
  function pulley(p) { return ring(p, 2.8, 1.6, 'e'); }
  function grip(p) { return C(p, 2.9); }
  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  function backPad(J, ext) { var bk = [-J.f2[0], -J.f2[1]], a = add(add(J.hip, [-J.f1[0], -J.f1[1]], 9.6), J.d1, -1), b = add(add(J.sh, bk, 9.6), J.d2, ext == null ? 4 : ext); return pad(a[0], a[1], b[0], b[1]); }
  function shinFront(J, i) { var s = unit(sub(J.ankle[i], J.knee[i])); return [s[1] * J.face, -s[0] * J.face]; }
  function roller(J, i, side) { var s = unit(sub(J.ankle[i], J.knee[i])), n = shinFront(J, i); return C(add(add(J.ankle[i], s, -2.5), n, 5.8 * side), 3.7); }

  /* ================= ARMS ================= */
  EX['curl'] = { v: 'side', hot: ['biceps'],
    a: { hip: [52, 58], t: -90, hands: [['fk', 91, 84]], feet: [[53, AN, -1]] },
    b: { hip: [52, 58], t: -90, hands: [['fk', 93, -62]] },
    props: function (J, t, ex) { var h = J.hand[0]; return { f: [ex.db ? dbEnd(h) : ex.ham ? dbSide(h, Math.atan2(J.hand[0][1] - J.el[0][1], J.hand[0][0] - J.el[0][0]) * 180 / Math.PI - 90) : plate(h, 6.2)] }; } };
  EX['curl-db'] = { use: 'curl', db: 1 };
  EX['hammer-curl'] = { use: 'curl', ham: 1, hot: ['biceps', 'forearms'] };
  EX['curl-cable'] = { v: 'side', hot: ['biceps'],
    a: { hip: [46, 58], t: -90, hands: [['fk', 91, 80]], feet: [[47, AN, -1]] },
    b: { hip: [46, 58], t: -90, hands: [['fk', 93, -60]] },
    props: function (J) { var h = J.hand[0]; return { b: stack(108).concat([pulley([103, 103]), cable([103, 103], h)]), f: [grip(h)] }; } };
  EX['incline-db-curl'] = { v: 'side', hot: ['biceps'],
    a: { hip: [66, 86], t: 242, hands: [['fk', 92, 86]], feet: [[92, AN, -1]] },
    b: { hip: [66, 86], t: 242, hands: [['fk', 95, -56]] },
    props: function (J) { return { b: [post(48, 76, 48, G - 1), post(76, 96, 76, G - 1), backPad(J, 12), pad(62, 95, 82, 94)], f: [dbEnd(J.hand[0])] }; } };
  EX['preacher-curl'] = { v: 'side', hot: ['biceps'],
    a: { hip: [36, 85], t: -70, hands: [['fk', 52, 44]], feet: [[60, AN, -1]] },
    b: { hip: [36, 85], t: -70, hands: [['fk', 52, -80]] },
    props: function (J) { var s = J.sh, e = J.el[0]; return { b: [post(60, 76, 62, G - 1), base(22, 74), post(36, 96, 36, G - 1), pad(26, 93.6, 46, 93.6), pad(s[0] + 1, s[1] + 7.5, e[0] + 5.5, e[1] + 7)], f: [plate(J.hand[0], 5.6)] }; } };
  EX['triceps-pushdown'] = { v: 'side', hot: ['triceps'],
    a: { hip: [46, 58], t: -83, hands: [['fk', 96, -28]], feet: [[47, AN, -1]] },
    b: { hip: [46, 58], t: -83, hands: [['fk', 96, 86]] },
    props: function (J) { var h = J.hand[0]; return { b: stack(108).concat([pulley([103, 8]), cable([103, 8], h)]), f: [L(h[0] - 4.5, h[1], h[0] + 5, h[1], 3.4, 'w')] }; } };
  EX['overhead-triceps'] = { v: 'side', z: 0.9, hot: ['triceps'],
    a: { hip: [56, 60], t: -74, hands: [['fk', -72, 150]], feet: [[45, AN, -1], [68, AN, -1]] },
    b: { hip: [56, 60], t: -74, hands: [['fk', -70, 296]] },
    props: function (J) { var h = J.hand[0]; return { b: stack(10).concat([pulley([14, 60]), cable([14, 60], h)]), f: [grip(h)] }; } };
  EX['overhead-db-ext'] = { v: 'side', z: 0.86, hot: ['triceps'],
    a: { hip: [56, 58], t: -90, hands: [['fk', -86, 152]], feet: [[57, AN, -1]] },
    b: { hip: [56, 58], t: -90, hands: [['fk', -88, 268]] },
    props: function (J) { return { f: [dbEnd(J.hand[0])] }; } };
  EX['skullcrusher'] = { v: 'side', hot: ['triceps'],
    a: { hip: [78, 85], t: 180, hands: [['fk', 258, 164]], feet: [[102, AN, -1]] },
    b: { hip: [78, 85], t: 180, hands: [['fk', 264, 270]] },
    props: function (J) { return { b: bench(30, 92, 94.6), f: [plate(J.hand[0], 5.8)] }; } };
  EX['kickback'] = { v: 'side', hot: ['triceps'],
    a: { hip: [40, 63], t: -14, head: -24, hands: [['fk', 176, 96], [70, 86, -1]], feet: [[33, AN, -1], [53, AN, -1]] },
    b: { hip: [40, 63], t: -14, head: -24, hands: [['fk', 176, 180], [70, 86, -1]] },
    props: function (J) { return { b: bench(60, 104, 91.4), f: [dbEnd(J.hand[0])] }; } };
  EX['wrist-curl'] = { v: 'side', hot: ['forearms'],
    a: { hip: [38, 85], t: -64, head: 20, hands: [[73, 79.5, 1]], feet: [[64, AN, -1]] },
    b: { hip: [38, 85], t: -64, head: 20, hands: [[73, 79.5, 1]] },
    props: function (J, t) { var h = J.hand[0]; return { b: bench(24, 54, 94.6), f: [dbEnd([h[0] + 4, h[1] + 4 - 8 * t])] }; } };

  /* ================= LEGS ================= */
  EX['squat'] = { v: 'side', hot: ['quads', 'glutes'],
    a: { hip: [54, 58], t: -87, hands: [['fkr', 150, -20, 0.7, 0.5]], feet: [[57, AN, -1]] },
    b: { hip: [44, 86], t: -56, hands: [['fkr', 150, -20, 0.7, 0.5]] },
    props: function (J) { return { f: [plate(add(add(J.sh, J.f2, -6), J.d2, -1.5), 8.6)] }; } };
  EX['front-squat'] = { v: 'side', hot: ['quads', 'glutes'],
    a: { hip: [54, 58], t: -88, hands: [['fkr', 62, -62, 0.75, 0.55]], feet: [[57, AN, -1]] },
    b: { hip: [43, 86], t: -70, hands: [['fkr', 62, -62, 0.75, 0.55]] },
    props: function (J) { return { f: [plate(add(add(J.sh, J.f2, 7), J.d2, -1), 8.6)] }; } };
  EX['goblet-squat'] = { v: 'side', hot: ['quads', 'glutes'],
    a: { hip: [54, 58], t: -88, hands: [['fkr', 130, 20, 0.75, 0.6]], feet: [[57, AN, -1]] },
    b: { hip: [43, 86], t: -68, hands: [['fkr', 130, 20, 0.75, 0.6]] },
    props: function (J) { return { f: [C(add(J.hand[0], [1, 1], 1), 5.2)] }; } };
  EX['hack-squat'] = { v: 'side', hot: ['quads', 'glutes'],
    a: { hip: [62, 55], t: 238, hands: [['fkr', 110, 10, 0.6, 0.6]], feet: [[89, 92, -1, -32]] },
    b: { hip: [75, 76], t: 238, hands: [['fkr', 110, 10, 0.6, 0.6]] },
    props: function (J) { return { b: [L(81, G - 1, 18, 8, 3, 'e'), base(60, 108), post(92, 96, 100, G - 1), L(83.5, 100, 100.5, 89.4, 4.6, 'e'), backPad(J, 6)] }; } };
  EX['leg-press'] = { v: 'side', hot: ['quads', 'glutes'],
    a: { hip: [48, 92], t: 205, hands: [[54, 97, 1, 0.7, 0.7]], feet: [[68, 72, -1, -135]] },
    b: { hip: [48, 92], t: 205, hands: [[54, 97, 1, 0.7, 0.7]], feet: [[81, 59, -1, -135]] },
    props: function (J) { var a = add(J.ankle[0], [0.707, -0.707], 3.6); return { b: [L(60, 104, 110, 54, 2.6, 'e'), base(34, 106), backPad(J, 8), pad(51, 103.4, 61, 101.8)], f: [L(a[0] + 7.4, a[1] + 7.4, a[0] - 8.5, a[1] - 8.5, 4.6, 'w'), C(add(a, [0.707, -0.707], 5.5), 4.2)] }; } };
  EX['leg-press-calf-raise'] = { v: 'side', hot: ['calves'],
    a: { hip: [48, 92], t: 205, hands: [[54, 97, 1, 0.7, 0.7]], feet: [[80, 60.6, -1, -152]] },
    b: { hip: [48, 92], t: 205, hands: [[54, 97, 1, 0.7, 0.7]], feet: [[81.8, 57.6, -1, -106]] },
    props: function (J) { var a = add(J.toe[0], [0.707, -0.707], 2.4); return { b: [L(60, 104, 110, 54, 2.6, 'e'), base(34, 106), backPad(J, 8), pad(51, 103.4, 61, 101.8)], f: [L(a[0] + 12, a[1] + 12, a[0] - 4, a[1] - 4, 4.6, 'w'), C(add(add(a, [0.707, 0.707], 4), [0.707, -0.707], 5.5), 4.2)] }; } };
  EX['leg-extension'] = { v: 'side', hot: ['quads'],
    a: { hip: [44, 79], t: 256, hands: [[49, 86, 1, 0.7, 0.7]], feet: [['fk', -3, 97, 8]] },
    b: { hip: [44, 79], t: 256, hands: [[49, 86, 1, 0.7, 0.7]], feet: [['fk', -3, 2, -80]] },
    props: function (J) { return { b: [post(50, 90, 50, G - 1), base(34, 74), pad(36, 87.4, 64, 87.4), backPad(J, 2), L(J.knee[0][0], J.knee[0][1] + 7, J.ankle[0][0], J.ankle[0][1], 1.6, 'e')], f: [roller(J, 0, 1)] }; } };
  EX['seated-leg-curl'] = { v: 'side', hot: ['hams'],
    a: { hip: [42, 77], t: -84, hands: [[57, 67, 1, 0.8, 0.8]], feet: [['fk', 2, 8, -70]] },
    b: { hip: [42, 77], t: -84, hands: [[57, 67, 1, 0.8, 0.8]], feet: [['fk', 2, 112, 30]] },
    props: function (J) { return { b: [post(44, 88, 44, G - 1), base(30, 70), pad(32, 85.4, 58, 85.4), backPad(J, 2)], f: [roller(J, 0, -1), L(54, 69.6, 66, 70, 5, 'w')] }; } };
  EX['lying-leg-curl'] = { v: 'side', face: -1, hot: ['hams'],
    a: { hip: [60, 80], t: 182, hands: [[36, 93, 1, 0.8, 0.8]], feet: [['fk', 4, 7, 96]] },
    b: { hip: [60, 80], t: 182, hands: [[36, 93, 1, 0.8, 0.8]], feet: [['fk', 4, -102, -12]] },
    props: function (J) { return { b: bench(18, 86, 89.6), f: [roller(J, 0, -1)] }; } };
  EX['lunge'] = { v: 'side', hot: ['quads', 'glutes'],
    a: { hip: [54, 62], t: -88, hands: [['fk', 91, 88]], feet: [[72, AN, -1], [29, 100.5, -1, 70]] },
    b: { hip: [52, 80.5], t: -84, hands: [['fk', 91, 88]] },
    props: function (J) { return { f: [dbEnd(J.hand[0])] }; } };
  EX['bulgarian-split-squat'] = { v: 'side', hot: ['quads', 'glutes'],
    a: { hip: [53, 61], t: -86, hands: [['fk', 91, 88]], feet: [[68, AN, -1], [25, 86.5, -1, 165]] },
    b: { hip: [49, 80], t: -76, hands: [['fk', 91, 88]] },
    props: function (J) { return { b: bench(6, 36, 93.2), f: [dbEnd(J.hand[0])] }; } };
  EX['step-up'] = { v: 'side', z: 0.86, hot: ['quads', 'glutes'],
    a: { hip: [48, 58], t: -82, hands: [['fk', 91, 88]], feet: [[70, 90.6, -1], [44, AN, -1]] },
    b: { hip: [70, 43.2], t: -90, hands: [['fk', 91, 88]], feet: [[70, 90.6, -1], [64, 90.6, -1]] },
    props: function (J) { return { b: ['<rect x="58" y="94" width="42" height="14.5" rx="2.5" class="epf"/>'], f: [dbEnd(J.hand[0])] }; } };
  EX['hip-thrust'] = { v: 'side', hot: ['glutes', 'hams'],
    a: { hip: [57, 97], t: 214, head: -14, hands: [['fkr', 196, 170, 0.9, 0.8]], feet: [[87, AN, -1]] },
    b: { hip: [63, 80.5], t: 180, head: 0, hands: [['fkr', 196, 176, 0.9, 0.8]] },
    props: function (J) { return { b: bench(8, 36, 90.4), f: [plate(add(J.hip, J.f1, 4), 10)] }; } };
  EX['glute-bridge'] = { v: 'side', hot: ['glutes', 'hams'],
    a: { hip: [58, 101], t: 181, head: 0, hands: [['fk', 3, 6]], feet: [[87, AN, -1]] },
    b: { hip: [61, 85], t: 152, head: 28, hands: [['fk', 3, 6]] } };
  EX['pull-through'] = { v: 'side', hot: ['glutes', 'hams'],
    a: { hip: [50, 62], t: -26, head: -22, hands: [[57, 73, 1]], feet: [[59, AN, -1]] },
    b: { hip: [57, 58], t: -88, head: 0, hands: [[59, 64, 1]] },
    props: function (J) { return { b: stack(10).concat([pulley([14, 101]), cable([14, 101], J.hand[0])]), f: [grip(J.hand[0])] }; } };
  EX['kb-swing'] = { v: 'side', hot: ['glutes', 'hams'],
    a: { hip: [46, 64], t: -32, head: -24, hands: [['fk', 130, 124]], feet: [[57, AN, -1]] },
    b: { hip: [55, 58], t: -90, head: 0, hands: [['fk', -4, -8]] },
    props: function (J) { var d = unit(sub(J.hand[0], J.el[0])); return { f: [ring(add(J.hand[0], d, 2.5), 3, 1.8), C(add(J.hand[0], d, 8), 5.4)] }; } };
  EX['glute-kickback'] = { v: 'side', hot: ['glutes'],
    a: { hip: [50, 58], t: -70, hands: [[82, 44, 1]], feet: [['fk', 80, 98, 10], [50, AN, -1]] },
    b: { hip: [50, 58], t: -66, hands: [[82, 44, 1]], feet: [['fk', 140, 128, 55], [50, AN, -1]] },
    props: function (J) { return { b: stack(100).concat([L(100, 44, 82, 44, 3, 'e'), pulley([96, 103]), cable([96, 103], J.ankle[0])]) }; } };
  EX['hip-abduction'] = { v: 'front', mirror: true, hot: ['glutes'],
    a: { hip: [60, 80], hands: [[42, 82, 1]], feet: [[55, AN, 1, 0, 0.35, 1]] },
    b: { hip: [60, 80], hands: [[42, 82, 1]], feet: [[36, 104, 1, 0, 0.8, 1]] },
    props: function (J, t, ex) { var k = J.knee, s = ex.inner ? 1 : -1; return { b: [post(60, 90, 60, G - 1), base(46, 74), pad(46, 87.4, 74, 87.4), L(60, 30, 60, 62, 13, 'ep')], f: [C([k[0][0] + 5.6 * s, k[0][1] + 1], 3.4), C([k[1][0] - 5.6 * s, k[1][1] + 1], 3.4)] }; } };
  EX['hip-adduction'] = { use: 'hip-abduction', inner: 1, hot: ['adductors'],
    a: { hip: [60, 80], hands: [[42, 82, 1]], feet: [[36, 104, 1, 0, 0.8, 1]] },
    b: { hip: [60, 80], hands: [[42, 82, 1]], feet: [[53, AN, 1, 0, 0.35, 1]] } };
  EX['nordic'] = { v: 'side', hot: ['hams'],
    a: { hip: [50, 80], t: -90, hands: [['fkr', 160, 50, 0.9, 0.9]], feet: [['fk', 90, 180, 180]] },
    b: { hip: [69.7, 90.2], t: -35, hands: [['fkr', 160, 50, 0.9, 0.9]], feet: [['fk', 145, 180, 180]] },
    props: function () { return { b: [post(28, 98, 22, G - 1), base(12, 34)], f: [C([29, 97.6], 3.6, 'epf')] }; } };
  EX['standing-calf-raise'] = { v: 'side', hot: ['calves'],
    a: { hip: [54, 56.3], t: -90, hands: [['fkr', 150, -10, 0.6, 0.5]], feet: [[54, 102.6, -1, -14]] },
    b: { hip: [54.6, 48.6], t: -90, hands: [['fkr', 150, -10, 0.6, 0.5]], feet: [[55.5, 94.8, -1, 46]] },
    props: function (J) { var y = J.sh[1] - 8; return { b: [post(96, 6, 96, G - 1), base(52, 104), L(J.sh[0], y, 96, y, 2.6, 'e'), pad(58, 106, 82, 106)], f: [L(J.sh[0] - 6, y, J.sh[0] + 6, y, 5, 'w')] }; } };
  EX['seated-calf-raise'] = { v: 'side', hot: ['calves'],
    a: { hip: [40, 83], t: -88, hands: [[61, 73, 1, 0.8, 0.8]], feet: [[66, 103, -1, -12]] },
    b: { hip: [40, 83], t: -88, hands: [[61, 68, 1, 0.8, 0.8]], feet: [[66.8, 97.4, -1, 40]] },
    props: function (J) { var k = J.knee[0]; return { b: [post(94, 60, 94, G - 1), base(28, 100), post(40, 94, 40, G - 1), pad(28, 91.6, 50, 91.6), L(k[0] + 4, k[1] - 7, 94, 72, 2.6, 'e'), pad(70, 106, 84, 106)], f: [L(k[0] - 7, k[1] - 7, k[0] + 5, k[1] - 7, 5, 'w')] }; } };

  /* ================= CORE ================= */
  EX['plank'] = { v: 'side', hot: ['abs'],
    a: { hip: [48, 89], t: -3, head: -10, hands: [['fk', 90, 2]], feet: [[2.5, 101, 1, 95]] },
    b: { hip: [48, 88.2], t: -4, head: -10, hands: [['fk', 90, 2]] } };
  EX['side-plank'] = { v: 'side', face: -1, hot: ['abs'],
    a: { hip: [63, 89.5], t: 183, head: 0, hands: [['fk', 90, 0], ['fk', -90, -92]], feet: [[110, 102.6, -1, 60]] },
    b: { hip: [63, 88.4], t: 185, head: 0, hands: [['fk', 90, 0], ['fk', -90, -92]] } };
  EX['crunch'] = { v: 'side', hot: ['abs'],
    a: { hip: [60, 101], t: 180, curl: 0, hands: [['fkr', 35, -120, 0.8, 0.5]], feet: [[92, AN, -1]] },
    b: { hip: [60, 101], t: 190, curl: 36, hands: [['fkr', 35, -120, 0.8, 0.5]] } };
  EX['sit-up'] = { v: 'side', hot: ['abs'],
    a: { hip: [60, 101], t: 180, curl: 0, hands: [['fkr', 35, -120, 0.8, 0.5]], feet: [[92, AN, -1]] },
    b: { hip: [60, 101], t: 242, curl: 14, hands: [['fkr', 35, -120, 0.8, 0.5]] } };
  EX['lying-leg-raise'] = { v: 'side', hot: ['abs'],
    a: { hip: [50, 101.5], t: 180, hands: [['fk', 4, 6]], feet: [['fk', 5, 2, -82]] },
    b: { hip: [50, 101.5], t: 180, hands: [['fk', 4, 6]], feet: [['fk', -84, -88, -172]] } };
  EX['hanging-leg-raise'] = { v: 'side', z: 0.86, ground: false, hot: ['abs'],
    a: { hip: [60, 73], t: -90, curl: 0, hands: [[60, 9, 1]], feet: [['fk', 90, 92, 8]] },
    b: { hip: [61, 72], t: -99, curl: 10, hands: [[60, 9, 1]], feet: [['fk', -8, -4, -88]] },
    props: function () { return { b: [post(60, 6, 60, -8)], f: [C([60, 6.4], 3)] }; } };
  EX['cable-crunch'] = { v: 'side', hot: ['abs'],
    a: { hip: [50, 80.5], t: -75, curl: 0, hands: [['fkr', 45, -75, 0.7, 0.6]], feet: [['fk', 80, 180, 180]] },
    b: { hip: [50, 80.5], t: -50, curl: 66, hands: [['fkr', 45, -75, 0.7, 0.6]] },
    props: function (J) { return { b: stack(110).concat([pulley([105, 8]), cable([105, 8], J.hand[0])]), f: [grip(J.hand[0])] }; } };
  EX['ab-wheel-rollout'] = { v: 'side', hot: ['abs'],
    a: { hip: [28.7, 84], t: -28, head: -20, hands: [[58, 99, 1]], feet: [['fk', 62, 178, 180]] },
    b: { hip: [55.4, 86.8], t: -2, head: -20, hands: [[111, 99, 1]], feet: [['fk', 130, 178, 180]] },
    props: function (J) { var h = J.hand[0]; return { f: [ring([h[0], 101], 6.6, 2.6), C([h[0], 101], 2)] }; } };
  EX['russian-twist'] = { v: 'front', hot: ['abs'],
    a: { hip: [60, 84], t: -97, hands: [[40, 64, -1], [44, 68, 1]], feet: [[52, 104, 1, 0, 0.5, 0.8], [68, 104, -1, 0, 0.5, 0.8]] },
    b: { hip: [60, 84], t: -83, hands: [[76, 68, -1], [80, 64, 1]] },
    props: function (J) { return { f: [C(mid(J.hand[0], J.hand[1]), 6)] }; } };
  EX['woodchop'] = { v: 'front', hot: ['abs'],
    a: { hip: [60, 58.3], t: -93, hands: [[38, 20, -1], [42, 17, -1]], feet: [[51, AN, 1], [69, AN, -1]] },
    b: { hip: [60, 58.3], t: -87, hands: [[70, 54, 1], [74, 58, 1]] },
    props: function (J) { var m = mid(J.hand[0], J.hand[1]); return { b: [L(8, 4, 8, G - 1, 4.5, 'e'), base(2, 16), pulley([11, 9]), cable([11, 9], m)], f: [grip(m)] }; } };

  /* ================= GENERIC (custom exercises): a standing figure with the muscle group tinted ================= */
  function gen(v, hot) { return { v: v, mirror: true, hot: hot, a: { hip: [60, 58.3], hands: [['fk', 100, 95]], feet: [[52.5, AN, 1]] } }; }
  EX['m-chest'] = gen('front', ['chest']); EX['m-back'] = gen('back', ['back', 'traps']); EX['m-shoulders'] = gen('front', ['delts']);
  EX['m-biceps'] = gen('front', ['biceps']); EX['m-triceps'] = gen('back', ['triceps']); EX['m-forearms'] = gen('front', ['forearms']);
  EX['m-quads'] = gen('front', ['quads']); EX['m-hamstrings'] = gen('back', ['hams']); EX['m-glutes'] = gen('back', ['glutes']);
  EX['m-calves'] = gen('back', ['calves']); EX['m-core'] = gen('front', ['abs']); EX['m-cardio'] = { use: 'run' };

  /* ================= CARDIO AND CARRIES (cyclic) ================= */
  var TAU = Math.PI * 2;
  function gait(t, amp, flex, lift) {
    var a = t * TAU, th1 = 90 - amp * Math.sin(a), th2 = 90 + amp * Math.sin(a);
    return [['fk', th1, th1 + 6 + flex * Math.max(0, Math.cos(a))], ['fk', th2, th2 + 6 + flex * Math.max(0, -Math.cos(a))]];
  }
  EX['run'] = { v: 'side', hot: ['quads', 'calves'], period: 900,
    fn: function (t) { var a = t * TAU, g = gait(t, 34, 62); return { hip: [50, 55.5 + 1.6 * Math.cos(2 * a)], t: -80, hands: [['fk', 90 + 34 * Math.sin(a), 90 + 34 * Math.sin(a) - 88], ['fk', 90 - 34 * Math.sin(a), 90 - 34 * Math.sin(a) - 88]], feet: g }; },
    props: function () { return { b: [L(14, G - 1, 98, G - 1, 4.5, 'e'), post(92, G - 3, 100, 54), L(100, 54, 88, 50, 3.4, 'w')] }; } };
  EX['walk'] = { v: 'side', hot: ['glutes', 'calves'], period: 1500, rot: -7,
    fn: function (t) { var a = t * TAU, g = gait(t, 22, 26); return { hip: [50, 57 + 0.8 * Math.cos(2 * a)], t: -76, hands: [['fk', 90 + 20 * Math.sin(a), 90 + 20 * Math.sin(a) - 30], ['fk', 90 - 20 * Math.sin(a), 90 - 20 * Math.sin(a) - 30]], feet: g }; },
    props: function () { return { b: [L(14, G - 1, 98, G - 1, 4.5, 'e'), post(92, G - 3, 100, 54), L(100, 54, 88, 50, 3.4, 'w')] }; } };
  EX['farmer-walk'] = { v: 'side', hot: ['forearms', 'traps'], period: 1500,
    fn: function (t) { var a = t * TAU, g = gait(t, 20, 24); return { hip: [56, 57.4 + 0.7 * Math.cos(2 * a)], t: -90, hands: [['fk', 90, 88]], feet: g }; },
    props: function (J) { return { f: [dbSide(add(J.hand[0], [0, 1], 2.5), 0)] }; } };
  EX['stairs'] = { v: 'side', hot: ['quads', 'glutes'], period: 1500,
    fn: function (t) { var a = t * TAU, k1 = 0.5 + 0.5 * Math.sin(a), k2 = 1 - k1; return { hip: [50, 50 + 1.2 * Math.cos(2 * a)], t: -80, hands: [[76, 44, 1]], feet: [['fk', 90 - 52 * k1, 90 + 28 * k1 + 4], ['fk', 90 - 52 * k2, 90 + 28 * k2 + 4]] }; },
    props: function () { return { b: ['<path class="epf" d="M40 108.5V98H56V86H72V74H88V62H102V108.5Z"/>', post(84, 62, 88, 40), L(88, 40, 72, 44, 3.4, 'w')] }; } };
  EX['elliptical'] = { v: 'side', hot: ['quads', 'glutes'], period: 1500,
    fn: function (t) { var a = t * TAU, c = [54, 97]; return { hip: [50, 52 + 0.8 * Math.cos(2 * a)], t: -84, hands: [[78 + 7 * Math.sin(a), 40, 1], [78 - 7 * Math.sin(a), 40, 1]], feet: [[c[0] + 15 * Math.cos(a), c[1] + 5 * Math.sin(a), -1, 0], [c[0] - 15 * Math.cos(a), c[1] - 5 * Math.sin(a), -1, 0]] }; },
    props: function (J) { return { b: [base(22, 104), ring([92, 94], 11, 2.6, 'e'), L(J.hand[1][0], J.hand[1][1], 84, 92, 2.4, 'e'), L(J.ankle[1][0] - 6, J.ankle[1][1] + 4.6, J.ankle[1][0] + 12, J.ankle[1][1] + 4.6, 3, 'w')], f: [L(J.hand[0][0], J.hand[0][1], 84, 92, 2.4, 'e'), L(J.ankle[0][0] - 6, J.ankle[0][1] + 4.6, J.ankle[0][0] + 12, J.ankle[0][1] + 4.6, 3, 'w')] }; } };
  EX['bike'] = { v: 'side', hot: ['quads'], period: 1300,
    fn: function (t) { var a = t * TAU, c = [63, 92], r = 8.5; return { hip: [44, 61], t: -58, head: -22, hands: [[85, 46, 1]], feet: [[c[0] + r * Math.cos(a), c[1] + r * Math.sin(a) - 3, -1, 12], [c[0] - r * Math.cos(a), c[1] - r * Math.sin(a) - 3, -1, 12]] }; },
    props: function (J) { var c = [63, 92]; return { b: [base(32, 106), post(47, 70, 53, 92), post(53, 92, 63, 92), post(63, 92, 85, 64), post(85, 64, 84, 47), post(47, 92, 40, G - 1), post(90, 96, 96, G - 1), ring([90, 95], 12, 2.8, 'e'), L(38, 69.6, 51, 69.6, 5, 'w'), L(80, 46, 90, 47.5, 3.6, 'w'), L(J.ankle[1][0] + 2, J.ankle[1][1] + 3, c[0], c[1], 2.4, 'w')], f: [L(J.ankle[0][0] + 2, J.ankle[0][1] + 3, c[0], c[1], 2.4, 'w'), C(c, 2.6)] }; } };
  EX['rower'] = { v: 'side', hot: ['back', 'quads'],
    a: { hip: [56, 88], t: -68, hands: [[94, 71, 1]], feet: [[84, 97, -1, -50]] },
    b: { hip: [37, 88], t: -108, hands: [[52, 75, 1]], feet: [[84, 97, -1, -50]] },
    props: function (J) { var h = J.hand[0]; return { b: [L(20, 97.6, 100, 97.6, 3, 'e'), post(26, 98, 26, G - 1), post(98, 98, 98, G - 1), ring([105, 82], 10, 2.8, 'e'), cable(h, [100, 78]), L(89, 90, 84, 103, 4.5, 'e'), L(J.hip[0] - 7, J.hip[1] + 8, J.hip[0] + 7, J.hip[1] + 8, 4, 'w')], f: [grip(h)] }; } };
  EX['jump-rope'] = { v: 'front', mirror: true, z: 0.9, hot: ['calves'], period: 700,
    fn: function (t) { var a = t * TAU, hop = 4.5 * Math.pow(Math.max(0, Math.cos(a)), 2); return { hip: [60, 58.3 - hop], t: -90, hands: [['fk', 122, 150]], feet: [[54, AN - hop, 1]] , rope: 58 + 118 * Math.cos(a) }; },
    props: function (J, t) { var y = 58 + 118 * Math.cos(t * TAU), a = J.hand[0], b = J.hand[1]; var p = '<path class="c" stroke-width="1.6" d="M' + n1(a[0]) + ' ' + n1(a[1]) + 'Q' + n1(a[0] - 26) + ' ' + n1(y) + ' 60 ' + n1(y) + 'Q' + n1(b[0] + 26) + ' ' + n1(y) + ' ' + n1(b[0]) + ' ' + n1(b[1]) + '"/>'; return y < 58 ? { b: [p] } : { f: [p] }; } };
  EX['mountain-climber'] = { v: 'side', hot: ['abs'], period: 900,
    fn: function (t) { var a = t * TAU, k1 = 0.5 + 0.5 * Math.sin(a), k2 = 1 - k1; return { hip: [51.5, 82], t: -19, head: -8, hands: [[79, 105.2, 1]], feet: [['fk', 160 - 92 * k1, 160 - 6 * k1, 95], ['fk', 160 - 92 * k2, 160 - 6 * k2, 95]] }; } };
})();
