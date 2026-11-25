/* Exercise figures: a jointed mannequin with tapered limbs, posed per exercise and animated between
   a start (a) and end (b) keyframe. Working muscles are tinted. Limbs are placed either by a hand/foot
   target (two-bone IK) or by joint angles (FK), whichever matches how the movement really travels. */
var ILLO = (function () {
  'use strict';
  var RAD = Math.PI / 180;
  var UA = 17.5, FA = 16, TH = 24, SN = 23.5, T1 = 13.5, T2 = 17, NECK = 9.5, HEAD = 6.3, FOOT = 8.5, SW = 9.5, HW = 5.2;
  var G = 109;

  function dir(deg) { return [Math.cos(deg * RAD), Math.sin(deg * RAD)]; }
  function add(p, d, k) { return [p[0] + d[0] * k, p[1] + d[1] * k]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
  function unit(v) { var l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }
  function n1(v) { return Math.round(v * 10) / 10; }

  function ik(a, t, l1, l2, bend) {
    var dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 0.001;
    var dd = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.05), l1 + l2 - 0.05);
    var ux = dx / d, uy = dy / d;
    var k = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
    var h = Math.sqrt(Math.max(0, l1 * l1 - k * k));
    return { j: [a[0] + ux * k - uy * h * bend, a[1] + uy * k + ux * h * bend], e: [a[0] + ux * dd, a[1] + uy * dd] };
  }

  /* ---- keyframe interpolation ---- */
  function mix(a, b, m, t) {
    if (m == null) return a + (b - a) * t;
    var c = 2 * m - (a + b) / 2, u = 1 - t;
    return u * u * a + 2 * u * t * c + t * t * b;
  }
  function limb(a, b, m, t) {
    if (!b) return a;
    var out = [], fk = typeof a[0] === 'string';
    for (var i = 0; i < Math.max(a.length, b.length); i++) {
      var av = a[i], bv = b[i] == null ? av : b[i];
      if (typeof av === 'string' || (!fk && i === 2)) { out.push(av); continue; }
      if (av == null) { out.push(bv); continue; }
      out.push(mix(av, bv, m && m[i] != null && typeof m[i] === 'number' ? m[i] : null, t));
    }
    return out;
  }
  function limbs(A, B, M, t) { return A.map(function (l, i) { return limb(l, B && B[i], M && M[i], t); }); }
  function val(a, b, m, k, dflt, t) {
    var av = a[k] == null ? dflt : a[k], bv = b[k] == null ? av : b[k];
    return mix(av, bv, m && m[k] != null ? m[k] : null, t);
  }
  function poseAt(ex, t) {
    if (ex.fn) return ex.fn(t);
    var a = ex.a, b = ex.b || ex.a, m = ex.m || null;
    return {
      hip: [mix(a.hip[0], (b.hip || a.hip)[0], m && m.hip ? m.hip[0] : null, t), mix(a.hip[1], (b.hip || a.hip)[1], m && m.hip ? m.hip[1] : null, t)],
      t: val(a, b, m, 't', -90, t), curl: val(a, b, m, 'curl', 0, t), head: val(a, b, m, 'head', 0, t), sy: val(a, b, m, 'sy', 0, t),
      hands: limbs(a.hands, b.hands, m && m.hands, t),
      feet: limbs(a.feet, b.feet || a.feet, m && m.feet, t)
    };
  }

  /* ---- solve joints ---- */
  function solve(ex, p) {
    var front = ex.v === 'front' || ex.v === 'back', face = ex.face || 1;
    var d1 = dir(p.t == null ? -90 : p.t), d2 = dir((p.t == null ? -90 : p.t) + (p.curl || 0));
    var hip = p.hip, waist = add(hip, d1, T1), sh = add(waist, d2, T2);
    var head = add(sh, dir((p.t == null ? -90 : p.t) + (p.curl || 0) + (p.head || 0)), NECK);
    var J = { hip: hip, waist: waist, sh: sh, head: head, d1: d1, d2: d2, face: face, front: front, el: [], hand: [], knee: [], ankle: [], toe: [], so: [], ho: [] };
    J.f1 = [-d1[1] * face, d1[0] * face]; J.f2 = [-d2[1] * face, d2[0] * face];
    var hands = p.hands.slice(), feet = p.feet.slice();
    if (ex.mirror) {
      if (hands.length === 1) hands.push(mirror(hands[0], hip[0]));
      if (feet.length === 1) feet.push(mirror(feet[0], hip[0]));
    }
    var perp = [-d2[1], d2[0]];
    hands.forEach(function (h, i) {
      var o = front ? add(add(sh, perp, i === 0 ? -SW : SW), [0, 1], 1 + (p.sy || 0)) : sh;
      var r;
      if (h[0] === 'st') {
        var tg = [h[1], h[2]], dv = sub(tg, o), ds = Math.hypot(dv[0], dv[1]) || 0.01, mx = UA + FA - 0.4;
        if (ds > mx) { tg = add(o, unit(dv), mx); ds = mx; }
        var uu = unit(sub(tg, o));
        r = { j: add(add(o, uu, ds * UA / (UA + FA)), [-uu[1], uu[0]], (h[3] == null ? 0.12 : h[3]) * ds), e: tg };
      } else if (typeof h[0] === 'string') {
        var base = h[0] === 'fkr' ? (p.t == null ? -90 : p.t) + (p.curl || 0) : 0;
        var e = add(o, dir(base + h[1]), UA * (h[3] == null ? 1 : h[3]));
        r = { j: e, e: add(e, dir(base + h[2]), FA * (h[4] == null ? 1 : h[4])) };
      } else r = ik(o, h, UA * (h[3] == null ? 1 : h[3]), FA * (h[4] == null ? 1 : h[4]), h[2] == null ? 1 : h[2]);
      J.so.push(o); J.el.push(r.j); J.hand.push(r.e);
    });
    feet.forEach(function (f, i) {
      var o = front ? [hip[0] + (i === 0 ? -HW : HW), hip[1]] : hip, r, fd;
      if (typeof f[0] === 'string') {
        var base = f[0] === 'fkr' ? (p.t == null ? -90 : p.t) : 0;
        var k = add(o, dir(base + f[1]), TH * (f[4] == null ? 1 : f[4]));
        r = { j: k, e: add(k, dir(base + f[2]), SN * (f[5] == null ? 1 : f[5])) };
        fd = f[3] == null ? base + f[2] - 90 * face : f[3];
      } else {
        r = ik(o, f, TH * (f[4] == null ? 1 : f[4]), SN * (f[5] == null ? 1 : f[5]), f[2] == null ? -1 : f[2]);
        fd = f[3] == null ? (face > 0 ? 0 : 180) : f[3];
      }
      J.ho.push(o); J.knee.push(r.j); J.ankle.push(r.e);
      J.toe.push(front ? add(r.e, dir(i === 0 ? 112 : 68), 4.6) : add(r.e, dir(fd), FOOT));
    });
    return J;
  }
  function mirror(l, cx) {
    var o = l.slice();
    if (l[0] === 'st') { o[1] = 2 * cx - l[1]; o[3] = -(l[3] == null ? 0.12 : l[3]); }
    else if (typeof l[0] === 'string') { o[1] = 180 - l[1]; o[2] = 180 - l[2]; }
    else { o[0] = 2 * cx - l[0]; o[2] = -(l[2] == null ? 1 : l[2]); }
    return o;
  }

  /* ---- drawing primitives ---- */
  function cap(A, B, ra, rb, cls) {
    var dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy);
    if (l < 0.3) return '<circle cx="' + n1(A[0]) + '" cy="' + n1(A[1]) + '" r="' + n1(Math.max(ra, rb)) + '" class="' + cls + '"/>';
    var nx = -dy / l, ny = dx / l;
    return '<path class="' + cls + '" d="M' + n1(A[0] + nx * ra) + ' ' + n1(A[1] + ny * ra) + 'L' + n1(B[0] + nx * rb) + ' ' + n1(B[1] + ny * rb) +
      'A' + n1(rb) + ' ' + n1(rb) + ' 0 0 0 ' + n1(B[0] - nx * rb) + ' ' + n1(B[1] - ny * rb) + 'L' + n1(A[0] - nx * ra) + ' ' + n1(A[1] - ny * ra) +
      'A' + n1(ra) + ' ' + n1(ra) + ' 0 0 0 ' + n1(A[0] + nx * ra) + ' ' + n1(A[1] + ny * ra) + 'Z"/>';
  }
  function dotc(c, r, cls) { return '<circle cx="' + n1(c[0]) + '" cy="' + n1(c[1]) + '" r="' + n1(r) + '" class="' + cls + '"/>'; }
  /* a muscle belly: a slimmer capsule laid along one side of a limb segment */
  function belly(A, B, ra, rb, side, from, to, k) {
    var d = sub(B, A), P = add(A, d, from), Q = add(A, d, to), ka = k == null ? 0.6 : k;
    var r1 = ra + (rb - ra) * from, r2 = ra + (rb - ra) * to, sft = 1 - ka - 0.03;
    return cap(add(P, side, r1 * sft), add(Q, side, r2 * sft), r1 * ka, r2 * ka, 'h');
  }
  function sideOf(A, B, ref, fallback, want) {
    var d = unit(sub(B, A)), n = [-d[1], d[0]], r = unit(ref), s = dot(n, r);
    if (Math.abs(s) < 0.14) s = dot(n, fallback);
    if (s < 0) n = [-n[0], -n[1]];
    return want > 0 ? n : [-n[0], -n[1]];
  }

  function has(hot, k) { return hot && hot.indexOf(k) >= 0; }

  function figureSide(J, hot) {
    var s = '', i, back1 = [-J.f1[0], -J.f1[1]], back2 = [-J.f2[0], -J.f2[1]];
    for (i = J.el.length - 1; i >= 1; i--) s += cap(J.so[i], J.el[i], 3.4, 2.9, 'f') + cap(J.el[i], J.hand[i], 2.9, 2.2, 'f') + dotc(J.hand[i], 2.6, 'f');
    for (i = J.knee.length - 1; i >= 1; i--) s += cap(J.ho[i], J.knee[i], 5, 3.8, 'f') + cap(J.knee[i], J.ankle[i], 3.8, 2.6, 'f') + cap(J.ankle[i], J.toe[i], 2.6, 1.9, 'f');
    /* torso, neck, head */
    s += cap(J.sh, J.head, 3.1, 3.1, 'b0') + cap(J.hip, J.waist, 6.5, 6.2, 'b0') + cap(J.waist, J.sh, 6.2, 7.1, 'b0') + dotc(J.head, HEAD, 'b0');
    if (has(hot, 'chest')) s += belly(J.waist, J.sh, 6.2, 7.1, J.f2, 0.3, 0.92, 0.5);
    if (has(hot, 'back')) s += belly(J.waist, J.sh, 6.2, 7.1, back2, 0.02, 0.95, 0.5);
    if (has(hot, 'abs')) s += belly(J.hip, J.waist, 6.5, 6.2, J.f1, 0.2, 1.15, 0.48);
    if (has(hot, 'lowback')) s += belly(J.hip, J.waist, 6.5, 6.2, back1, 0.25, 1.1, 0.45);
    if (has(hot, 'traps')) s += cap(add(J.sh, back2, 3.2), add(add(J.sh, J.d2, 5.5), back2, 1.6), 3.4, 2.4, 'h');
    if (has(hot, 'glutes')) s += dotc(add(add(J.hip, back1, 2.4), J.d1, -0.5), 5, 'h');
    /* near leg */
    if (J.knee.length) {
      var H = J.ho[0], K = J.knee[0], A = J.ankle[0];
      s += cap(H, K, 5.4, 4, 'b') ;
      if (has(hot, 'quads')) s += belly(H, K, 5.4, 4, sideOf(H, K, sub(A, K), J.f1, -1), 0.12, 0.9, 0.55);
      if (has(hot, 'hams')) s += belly(H, K, 5.4, 4, sideOf(H, K, sub(A, K), J.f1, 1), 0.12, 0.88, 0.55);
      s += cap(K, A, 4, 2.7, 'b');
      if (has(hot, 'calves')) s += belly(K, A, 4.2, 2.9, sideOf(K, A, sub(H, K), [-J.f1[0], -J.f1[1]], 1), 0.06, 0.62, 0.62);
      s += cap(A, J.toe[0], 2.7, 2, 'b');
    }
    /* near arm */
    if (J.el.length) {
      var S = J.so[0], E = J.el[0], W = J.hand[0];
      s += cap(S, E, 3.8, 3.1, 'b');
      if (has(hot, 'biceps')) s += belly(S, E, 3.8, 3.1, sideOf(S, E, sub(W, E), J.f2, 1), 0.18, 0.92, 0.6);
      if (has(hot, 'triceps')) s += belly(S, E, 3.8, 3.1, sideOf(S, E, sub(W, E), J.f2, -1), 0.12, 0.9, 0.6);
      if (has(hot, 'delts')) s += dotc(add(S, unit(sub(E, S)), 1.2), 4.3, 'h');
      s += cap(E, W, 3.1, 2.4, 'b');
      if (has(hot, 'forearms')) s += cap(add(E, sub(W, E), 0.1), add(E, sub(W, E), 0.8), 2.3, 1.8, 'h');
      s += dotc(W, 2.8, 'b');
    }
    return s;
  }

  function figureFront(J, hot, isBack) {
    var s = '', i, sh = J.sh, hip = J.hip, w = J.waist;
    var px = [-J.d2[1], J.d2[0]];
    for (i = 0; i < J.knee.length; i++) {
      s += cap(J.ho[i], J.knee[i], 5, 3.9, 'b') ;
      if (has(hot, 'quads') || has(hot, 'hams') || has(hot, 'adductors')) s += cap(add(J.ho[i], sub(J.knee[i], J.ho[i]), 0.14), add(J.ho[i], sub(J.knee[i], J.ho[i]), 0.86), 3.2, 2.5, 'h');
      s += cap(J.knee[i], J.ankle[i], 3.9, 2.6, 'b');
      if (has(hot, 'calves')) s += cap(add(J.knee[i], sub(J.ankle[i], J.knee[i]), 0.08), add(J.knee[i], sub(J.ankle[i], J.knee[i]), 0.6), 2.7, 1.9, 'h');
      s += cap(J.ankle[i], J.toe[i], 2.6, 2.2, 'b');
    }
    var sl = J.so[0] || add(sh, px, -SW), sr = J.so[1] || add(sh, px, SW);
    var pts = [[sl[0] + 1.5, sl[1] - 1], [sr[0] - 1.5, sr[1] - 1], [w[0] + 6.4, w[1]], [hip[0] + HW + 2, hip[1] + 1], [hip[0] - HW - 2, hip[1] + 1], [w[0] - 6.4, w[1]]];
    s += '<path class="b0 tr" d="M' + pts.map(function (p) { return n1(p[0]) + ' ' + n1(p[1]); }).join('L') + 'Z"/>';
    s += cap(add(sh, J.d2, -1), J.head, 3.1, 3.1, 'b0') + dotc(J.head, HEAD, 'b0');
    if (has(hot, 'traps')) s += '<path class="h" d="M' + n1(sl[0] + 4) + ' ' + n1(sl[1] - 2.6) + 'L' + n1(sh[0]) + ' ' + n1(sh[1] - 6.5) + 'L' + n1(sr[0] - 4) + ' ' + n1(sr[1] - 2.6) + 'Z"/>';
    if (has(hot, 'chest') && !isBack) s += '<ellipse class="h" cx="' + n1(sh[0] - 4.7) + '" cy="' + n1(sh[1] + 6.2) + '" rx="4.1" ry="3.7"/><ellipse class="h" cx="' + n1(sh[0] + 4.7) + '" cy="' + n1(sh[1] + 6.2) + '" rx="4.1" ry="3.7"/>';
    if (has(hot, 'abs') && !isBack) s += '<rect class="h" x="' + n1(w[0] - 3.9) + '" y="' + n1(sh[1] + 11.5) + '" width="7.8" height="' + n1(Math.max(4, hip[1] - sh[1] - 13.5)) + '" rx="2.6"/>';
    if (has(hot, 'back')) s += '<path class="h" d="M' + n1(sl[0] + 3.2) + ' ' + n1(sl[1] + 3) + 'L' + n1(sr[0] - 3.2) + ' ' + n1(sr[1] + 3) + 'L' + n1(w[0] + 4.6) + ' ' + n1(w[1] + 2) + 'L' + n1(w[0]) + ' ' + n1(w[1] + 6) + 'L' + n1(w[0] - 4.6) + ' ' + n1(w[1] + 2) + 'Z"/>';
    if (has(hot, 'lowback')) s += '<rect class="h" x="' + n1(w[0] - 4) + '" y="' + n1(w[1] + 1) + '" width="8" height="8" rx="2.6"/>';
    if (has(hot, 'glutes') || has(hot, 'abductors')) s += isBack
      ? '<ellipse class="h" cx="' + n1(hip[0] - 3.5) + '" cy="' + n1(hip[1] + 0.9) + '" rx="3.3" ry="3.7"/><ellipse class="h" cx="' + n1(hip[0] + 3.5) + '" cy="' + n1(hip[1] + 0.9) + '" rx="3.3" ry="3.7"/>'
      : dotc([hip[0] - 6.4, hip[1] - 1.5], 3.5, 'h') + dotc([hip[0] + 6.4, hip[1] - 1.5], 3.5, 'h');
    /* front or back? Front: eyes, chest line, a centre line and a bulge. Back: spine, shoulder blades and buttocks. */
    var up = J.d2, P = function (ax, dn) { return add(add(sh, px, ax), up, -dn); }, Hq = function (ax, dn) { return [hip[0] + ax, hip[1] + dn]; };
    var q = function (pt) { return n1(pt[0]) + ' ' + n1(pt[1]); };
    if (isBack) {
      s += '<path class="d" d="M' + q(P(0, 3)) + 'L' + q(w) + 'L' + q(Hq(0, -4.5)) + '"/>' +
        '<path class="d" d="M' + q(P(-6.6, 5.2)) + 'L' + q(P(-3.4, 11)) + 'M' + q(P(6.6, 5.2)) + 'L' + q(P(3.4, 11)) + '"/>' +
        '<path class="d" d="M' + q(Hq(0, -3.4)) + 'L' + q(Hq(0, 3.6)) + 'M' + q(Hq(-7, 0.4)) + 'Q' + q(Hq(-3.8, 6.2)) + ' ' + q(Hq(-0.2, 3.4)) + 'M' + q(Hq(7, 0.4)) + 'Q' + q(Hq(3.8, 6.2)) + ' ' + q(Hq(0.2, 3.4)) + '"/>';
    } else {
      s += dotc(add(add(J.head, px, -2.3), up, 0.4), 0.85, 'df') + dotc(add(add(J.head, px, 2.3), up, 0.4), 0.85, 'df') +
        '<path class="d" d="M' + q(P(-7.8, 8.6)) + 'Q' + q(P(-4, 11.6)) + ' ' + q(P(-0.5, 9.2)) + 'M' + q(P(7.8, 8.6)) + 'Q' + q(P(4, 11.6)) + ' ' + q(P(0.5, 9.2)) + '"/>' +
        '<path class="d" d="M' + q(P(0, 9.6)) + 'L' + q(Hq(0, -6.5)) + '"/>' +
        '<path class="d" d="M' + q(Hq(-2.9, 2.6)) + 'Q' + q(Hq(0, 9)) + ' ' + q(Hq(2.9, 2.6)) + '"/>';
    }
    for (i = 0; i < J.el.length; i++) {
      s += cap(J.so[i], J.el[i], 3.8, 3.1, 'b');
      if (has(hot, 'biceps') || has(hot, 'triceps')) s += cap(add(J.so[i], sub(J.el[i], J.so[i]), 0.2), add(J.so[i], sub(J.el[i], J.so[i]), 0.88), 2.5, 2, 'h');
      if (has(hot, 'delts')) s += dotc(add(J.so[i], unit(sub(J.el[i], J.so[i])), 0.8), 4.2, 'h');
      s += cap(J.el[i], J.hand[i], 3.1, 2.4, 'b');
      if (has(hot, 'forearms')) s += cap(add(J.el[i], sub(J.hand[i], J.el[i]), 0.1), add(J.el[i], sub(J.hand[i], J.el[i]), 0.8), 2.2, 1.7, 'h');
      s += dotc(J.hand[i], 2.8, 'b');
    }
    return s;
  }

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  var EX = {};
  function render(key, t) {
    var ex = EX[key]; if (!ex) return '';
    if (ex.use) { var base = EX[ex.use], merged = {}; for (var k in base) merged[k] = base[k]; for (k in ex) if (k !== 'use') merged[k] = ex[k]; ex = merged; }
    var p = poseAt(ex, t), J = solve(ex, p), s = '', pr = ex.props ? ex.props(J, t, ex) : null;
    var z = ex.z || 1, open = '', close = '';
    if (z !== 1 || ex.rot) { open = '<g transform="translate(60 109) ' + (ex.rot ? 'rotate(' + ex.rot + ') ' : '') + 'scale(' + z + ') translate(-60 -109)">'; close = '</g>'; }
    if (ex.ground !== false) s += '<line x1="4" y1="' + (G + 0.5) + '" x2="116" y2="' + (G + 0.5) + '" class="g"/>';
    s += open;
    if (pr && pr.b) s += pr.b.join('');
    s += ex.v === 'front' || ex.v === 'back' ? figureFront(J, ex.hot, ex.v === 'back') : figureSide(J, ex.hot);
    if (pr && pr.f) s += pr.f.join('');
    return s + close;
  }
  function phase(key, ms) {
    var ex = EX[key]; if (!ex) return 0;
    if (ex.use && !ex.fn && !ex.a) ex = EX[ex.use];
    if (ex.fn) { var per = ex.period || 2400; return (ms % per) / per; }
    if (!ex.b) return 0;
    var c = (ms % 3200) / 3200;
    if (c < 0.38) return ease(c / 0.38);
    if (c < 0.5) return 1;
    if (c < 0.88) return 1 - ease((c - 0.5) / 0.38);
    return 0;
  }
  function restT(key) { var ex = EX[key]; if (!ex) return 0; if (ex.use && !ex.fn && !ex.a) ex = EX[ex.use]; return ex.still != null ? ex.still : (ex.fn ? 0.12 : (ex.b ? 0.72 : 0)); }

  return {
    EX: EX, render: render, phase: phase, restT: restT, has: function (k) { return !!EX[k]; }, keys: function () { return Object.keys(EX); },
    _: { dir: dir, add: add, sub: sub, unit: unit, n1: n1, G: G }
  };
})();
if (typeof module !== 'undefined') module.exports = ILLO;
