import { openDay } from './_common.mjs';
const rec = await openDay({ hour: 8, day: 8 });
const rows = await rec.eval(() => {
  const z = window.zomfy;
  const out = [];
  for (let j = -7; j <= 8; j++) {
    let row = String(j).padStart(3) + ' ';
    for (let i = -8; i <= 13; i++) row += z.placeCheck('zelt', i, j).ok ? 'o' : '.';
    out.push(row);
  }
  return out;
});
console.log('     ' + Array.from({ length: 22 }, (_, k) => String(Math.abs(k - 8) % 10)).join(''));
console.log(rows.join('\n'));
await rec.close();
process.exit(0);
