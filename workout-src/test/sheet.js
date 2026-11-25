// usage: node test/sheet.js out.svg [dark] [filter]
global.ILLO = require('../src/illo-engine.js');
require('../src/illo-poses.js'); require('../src/illo-poses2.js');
const fs = require('fs');
const out = process.argv[2], dark = process.argv[3] === 'dark', filt = process.argv[4];
let keys = ILLO.keys(); if (filt) keys = keys.filter(k => filt.split(',').some(f => k.includes(f)));
const T = dark ? { bg: '#11161d', tile: '#1c232c', fig: '#e7ebf0', far: '#6b7684', hot: '#f0763a', eq: '#4d5866', ep: '#3b4551', w: '#aab4c0', line: '#2b333d', txt: '#aab4c0' }
               : { bg: '#ffffff', tile: '#eef1f5', fig: '#1c2530', far: '#98a2af', hot: '#ec6a2c', eq: '#b6bfca', ep: '#cbd2db', w: '#5d6875', line: '#d5dbe2', txt: '#333' };
const css = `.b,.b0{fill:${T.fig}}.b{stroke:${T.tile};stroke-width:.7}.tr{stroke:${T.fig};stroke-width:4;stroke-linejoin:round}.f{fill:${T.far}}.h{fill:${T.hot}}
.e{stroke:${T.eq};fill:none;stroke-linecap:round}.ep{stroke:${T.ep};fill:none;stroke-linecap:round}.epf{fill:${T.ep}}.w{stroke:${T.w};fill:none;stroke-linecap:round}.wb{stroke:${T.w};fill:none;stroke-linecap:butt}.wf{fill:${T.w}}.wh{fill:${T.tile}}
.c{stroke:${T.w};fill:none;opacity:.7}.g{stroke:${T.line};stroke-width:1}.d{stroke:${T.tile};stroke-width:.9;fill:none;stroke-linecap:round;stroke-linejoin:round}.df{fill:${T.tile}} text{font:8px sans-serif;fill:${T.txt}}`;
const cols = 6, cw = 126, ch = 140; let s = '';
const frames = process.env.FR ? process.env.FR.split(',').map(Number) : [0, 0.5, 1];
keys.forEach((k, i) => { frames.forEach((t, j) => { const x = j * cw + (i % (cols / 3)) * cw * 3, y = Math.floor(i / (cols / 3)) * ch;
  s += `<g transform="translate(${x + 3},${y + 3})"><rect width="120" height="120" fill="${T.tile}" rx="8"/><svg width="120" height="120" viewBox="0 0 120 120">${ILLO.render(k, t)}</svg>${j === 0 ? `<text x="2" y="131">${k}</text>` : ''}</g>`; }); });
const rows = Math.ceil(keys.length / (cols / 3));
fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cw}" height="${rows * ch}" viewBox="0 0 ${cols * cw} ${rows * ch}"><style>${css}</style><rect width="100%" height="100%" fill="${T.bg}"/>${s}</svg>`);
console.log(keys.length + ' poses');
