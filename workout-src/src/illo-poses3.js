/* Outdoor endurance: run, ride, swim. Same mannequin, but under a sky with a sun, on a road that moves or in
   water, so they read as a different kind of workout at a glance. The app tints these in its outdoor colour. */
(function () {
  'use strict';
  var EX = ILLO.EX, U = ILLO._, n1 = U.n1, G = U.G, TAU = Math.PI * 2, RAD = Math.PI / 180;
  function L(a, b, w, cls) { return '<line x1="' + n1(a[0]) + '" y1="' + n1(a[1]) + '" x2="' + n1(b[0]) + '" y2="' + n1(b[1]) + '" stroke-width="' + w + '" class="' + cls + '"/>'; }
  /* The sky follows the clock: the app sets data-tod (morning, day, evening, night) on the page and the stylesheet
     moves and recolours the sun, or swaps it for the moon and stars. Everything is drawn; CSS picks what shows. */
  var STARS = [[-12, 14, 0.9], [4, 34, 0.7], [16, 9, 1.1], [31, 24, 0.7], [44, 12, 0.9], [63, 7, 0.7], [76, 18, 1], [88, 42, 0.7], [112, 11, 0.9], [118, 38, 0.8], [130, 22, 1.1], [136, 46, 0.7], [22, 46, 0.8], [124, 6, 0.7]];
  var NIGHT = '<g class="stars">' + STARS.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '"/>'; }).join('') + '</g><path class="moon" d="M100 16.3A8 8 0 1 0 104.7 26.5A6.4 6.4 0 0 1 100 16.3Z"/>';
  function sky(low) { return NIGHT + '<g style="--sd:' + (low - 74) + 'px"><circle class="sun-h" cx="97" cy="24" r="15"/><circle class="sun" cx="97" cy="24" r="9"/></g>' + '<path class="hill" d="M-24 ' + (low - 3) + 'C-14 ' + (low + 5) + ' -7 ' + (low + 9) + ' 0 ' + (low + 4) + 'C18 ' + (low - 12) + ' 34 ' + (low - 10) + ' 52 ' + (low - 2) + 'C68 ' + (low - 16) + ' 92 ' + (low - 20) + ' 120 ' + (low - 4) + 'C130 ' + (low + 2) + ' 137 ' + (low + 5) + ' 144 ' + (low + 5) + 'V120H-24Z"/>'; }
  /* the road: a ground line and lane dashes that slide back as the figure moves forward */
  function road(t, k) {
    var s = '<line class="rd" x1="-24" y1="' + (G + 0.5) + '" x2="144" y2="' + (G + 0.5) + '"/>', off = (t * 24 * k) % 24;
    for (var x = -off - 24; x < 144; x += 24) s += '<line class="dash" x1="' + n1(x) + '" y1="' + (G + 6) + '" x2="' + n1(x + 10) + '" y2="' + (G + 6) + '"/>';
    return s;
  }
  function gait(t, amp, flex) {
    var a = t * TAU, th1 = 90 - amp * Math.sin(a), th2 = 90 + amp * Math.sin(a);
    return [['fk', th1, th1 + 6 + flex * Math.max(0, Math.cos(a))], ['fk', th2, th2 + 6 + flex * Math.max(0, -Math.cos(a))]];
  }
  EX['out-run'] = { v: 'side', hot: ['quads', 'calves'], period: 900, ground: false,
    fn: function (t) { var a = t * TAU; return { hip: [56, 55.5 + 1.6 * Math.cos(2 * a)], t: -78, hands: [['fk', 90 + 34 * Math.sin(a), 90 + 34 * Math.sin(a) - 88], ['fk', 90 - 34 * Math.sin(a), 90 - 34 * Math.sin(a) - 88]], feet: gait(t, 34, 62) }; },
    props: function (J, t) { return { b: [sky(96), road(t, 1)] }; } };

  var BB = [58, 93], RW = [30, 93], FW = [92, 93], HT = [80, 66], ST = [48, 71], WR = 15;
  function wheel(c, t) {
    var s = '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + WR + '" stroke-width="2.4" class="w"/>';
    for (var i = 0; i < 4; i++) { var d = t * TAU + i * Math.PI / 4, dx = Math.cos(d) * (WR - 1.4), dy = Math.sin(d) * (WR - 1.4); s += L([c[0] - dx, c[1] - dy], [c[0] + dx, c[1] + dy], 0.7, 'c'); }
    return s + '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="1.8" class="wf"/>';
  }
  EX['out-ride'] = { v: 'side', hot: ['quads', 'glutes'], period: 1100, ground: false,
    fn: function (t) { var a = t * TAU, r = 8; return { hip: [46, 60.5], t: -34, head: -32, hands: [[85.5, 62.5, 1]], feet: [[BB[0] + r * Math.cos(a), BB[1] + r * Math.sin(a) - 3, -1, 12], [BB[0] - r * Math.cos(a), BB[1] - r * Math.sin(a) - 3, -1, 12]] }; },
    props: function (J, t) {
      var frame = L(ST, BB, 2.6, 'w') + L(ST, HT, 2.6, 'w') + L(HT, BB, 2.6, 'w') + L(BB, RW, 2.2, 'w') + L(ST, RW, 2, 'w') + L(HT, FW, 2.4, 'w') + L(HT, [83, 60.5], 2.4, 'w') +
        '<path class="w" stroke-width="2.4" d="M81.5 60.5H86C89.5 60.5 90 66 86.5 67"/>' + L([41, 68.8], [52, 68.8], 4, 'w');
      return { b: [sky(96), road(t, 2), wheel(RW, t), wheel(FW, t), frame, L([J.ankle[1][0] + 2, J.ankle[1][1] + 3], BB, 2.2, 'w')],
        f: [L([J.ankle[0][0] + 2, J.ankle[0][1] + 3], BB, 2.2, 'w'), '<circle cx="' + BB[0] + '" cy="' + BB[1] + '" r="3.4" class="wf"/>'] };
    } };

  /* front crawl: the arms turn over one after the other, the legs flutter, and the water line crosses the body */
  function water(t, y) {
    var d = 'M-24 ' + y, x;
    for (x = -24; x <= 144; x += 6) d += 'L' + x + ' ' + n1(y + 1.4 * Math.sin(x / 120 * TAU * 3 - t * TAU));
    return '<path class="wa" d="' + d + 'V120H-24Z"/><path class="wl" d="' + d.replace('M-24 ' + y + 'L', 'M') + '"/>';
  }
  function crawl(d) { var s = Math.sin(d * RAD); return ['fk', d, d + (s > 0 ? 22 * s : 38 * s)]; }
  EX['out-swim'] = { v: 'side', hot: ['back', 'delts'], period: 1500, ground: false, still: 0.06,
    fn: function (t) { var a = t * TAU, k = 9 * Math.sin(3 * a); return { hip: [52, 75 + 0.7 * Math.sin(2 * a)], t: -5, head: 4, hands: [crawl(360 * t), crawl(360 * t + 180)], feet: [['fk', 177 + k, 183 + k, 180, 0.9, 0.9], ['fk', 177 - k, 183 - k, 180, 0.9, 0.9]] }; },
    props: function (J, t) { return { b: [sky(74)], f: [water(t, 71.5)] }; } };
})();
