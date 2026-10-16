import input from './cells.json';
export const dimensions=['occupation','level','arrangement'].map(k=>[...new Set(input.cells.map(c=>c[k]))].sort());
export const marks=input.cells.map((c,i)=>({...c,id:i,position:[dimensions[0].indexOf(c.occupation)*20-220,dimensions[1].indexOf(c.level)*20-70,dimensions[2].indexOf(c.arrangement)*30-45],radius:1+Math.sqrt(c.count)/3}));
window.input={dataset:input.dataset,groups:marks.length,count:marks.reduce((n,m)=>n+m.count,0)};
