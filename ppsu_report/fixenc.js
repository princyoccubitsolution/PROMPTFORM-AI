// Repairs UTF-8 text that was mis-decoded as Windows-1252 and re-saved.
const fs = require('fs');
const f = process.argv[2];
let c = fs.readFileSync(f, 'utf8').replace(/^﻿/, '');
const m = { 'â€”': '—', 'Â·': '·', 'â†’': '→', 'â€¦': '…', 'â€“': '–', 'â‰¥': '≥' };
for (const k in m) c = c.split(k).join(m[k]);
fs.writeFileSync(f, c);
console.log(/[Ââ]/.test(c) ? 'still bad' : 'clean');
