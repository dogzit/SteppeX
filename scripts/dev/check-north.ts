import { loadGlobal, loadPolar } from '../lib/dem';
const g = loadGlobal();
for (const flip of [false, true]) {
  const p = loadPolar('.cache/ldem_75n_240m', flip); if (!p) { console.log('no north tile'); break; }
  let n = 0, sumAbs = 0;
  for (let i = 0; i < 4000; i++) {
    const lat = 75.5 + Math.random() * 14.4, lon = Math.random() * 360;
    const a = p.heightAt(lat, lon), b = g.heightAt(lat, lon); if (Number.isNaN(a) || Number.isNaN(b)) continue;
    n++; sumAbs += Math.abs(a - b);
  }
  console.log(`north flipY=${flip}: n=${n} meanAbsDiff=${(sumAbs / n).toFixed(0)} m`);
}
const p = loadPolar('.cache/ldem_75n_240m')!;
console.log('Whipple rim (89.3766N, 126.48E) =', p.heightAt(89.3766, 126.48).toFixed(0), 'm; global =', g.heightAt(89.3766, 126.48).toFixed(0), 'm');
