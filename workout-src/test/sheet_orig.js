const ILLO=require('../orig/illo.js');
const keys=ILLO.keys();
const css=`.ib{stroke:#1b222c}.ih{fill:#1b222c;stroke:none}.if{stroke:#8d96a3}.ig{stroke:#d3d8df}.ig.ih{fill:#d3d8df;stroke:none}.ie{stroke:#b4bcc7}.ig0{stroke:#dde1e7}.ieo{stroke:#b4bcc7;fill:none;stroke-width:3}.il{stroke:#2a78d6;fill:#2a78d6}.ilo{stroke:#2a78d6;fill:none;stroke-width:3}.ic{stroke:#8d96a3} line{stroke-linecap:round;fill:none} text{font:9px sans-serif;fill:#333}`;
const cols=8, cell=130; let out='';
keys.forEach((k,i)=>{const x=(i%cols)*cell, y=Math.floor(i/cols)*(cell*2+20);
 out+=`<g transform="translate(${x},${y})"><rect width="120" height="120" fill="#f3f5f8" rx="8"/>${ILLO.render(k,0,false)}<text x="2" y="132">${k.slice(0,26)}</text></g>`;
 out+=`<g transform="translate(${x},${y+140})"><rect width="120" height="120" fill="#f3f5f8" rx="8"/>${ILLO.render(k,1,true)}</g>`;});
const rows=Math.ceil(keys.length/cols);
console.log(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols*cell}" height="${rows*(cell*2+20)}" viewBox="0 0 ${cols*cell} ${rows*(cell*2+20)}"><style>${css}</style><rect width="100%" height="100%" fill="#fff"/>${out}</svg>`);
