// usage: FR=0,0.5,1 node test/sheet2.js out.svg [light|dark] [filter]  -> one row per pose, one column per frame
global.ILLO = require('../src/illo-engine.js'); require('../src/illo-poses.js'); require('../src/illo-poses2.js');
const fs = require('fs');
const out = process.argv[2], dark = process.argv[3] === 'dark', filt = process.argv[4];
let keys = ILLO.keys(); if (filt) keys = filt.split(',').flatMap(f => keys.filter(k => f.startsWith('=') ? k === f.slice(1) : k.includes(f)));
const T = dark ? { bg: '#0a0f1a', tile: '#1a2333', fig: '#e9edf5', far: '#6b7890', hot: '#ff8a4c', eq: '#4c5a70', ep: '#34415a', w: '#a9b6cc', line: '#2b3648', txt: '#a9b6cc' }
               : { bg: '#ffffff', tile: '#eef2f8', fig: '#18233a', far: '#97a3b8', hot: '#f26a2e', eq: '#b4bfd0', ep: '#cad3e0', w: '#5a6780', line: '#d5dce8', txt: '#333' };
const css = `.b,.b0{fill:${T.fig}}.b{stroke:${T.tile};stroke-width:.7}.tr{stroke:${T.fig};stroke-width:4;stroke-linejoin:round}.f{fill:${T.far}}.h{fill:${T.hot}}
.e{stroke:${T.eq};fill:none;stroke-linecap:round}.ep{stroke:${T.ep};fill:none;stroke-linecap:round}.epf{fill:${T.ep}}.w{stroke:${T.w};fill:none;stroke-linecap:round}.wb{stroke:${T.w};fill:none;stroke-linecap:butt}.wf{fill:${T.w}}.wh{fill:${T.tile}}
.c{stroke:${T.w};fill:none;opacity:.7}.g{stroke:${T.line};stroke-width:1}.d{stroke:${T.tile};stroke-width:.9;fill:none;stroke-linecap:round;stroke-linejoin:round}.df{fill:${T.tile}} text{font:8px sans-serif;fill:${T.txt}}`;
const frames = process.env.FR ? process.env.FR.split(',').map(Number) : [0, 0.5, 1], cw = 126, ch = 136; let s = '';
keys.forEach((k, i) => frames.forEach((t, j) => { s += `<g transform="translate(${j * cw + 3},${i * ch + 3})"><rect width="120" height="120" fill="${T.tile}" rx="10"/><svg width="120" height="120" viewBox="0 0 120 120">${ILLO.render(k, t)}</svg>${j === 0 ? `<text x="2" y="130">${k}</text>` : ''}</g>`; }));
fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" width="${frames.length * cw}" height="${keys.length * ch}" viewBox="0 0 ${frames.length * cw} ${keys.length * ch}"><style>${css}</style><rect width="100%" height="100%" fill="${T.bg}"/>${s}</svg>`);
console.log(keys.length + ' poses x ' + frames.length + ' frames');
