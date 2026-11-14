/** Empirical check of the polar-stereographic orientation: compare tile heights with the independent global cylindrical DEM. */
import { loadGlobal, loadPolar } from '../lib/dem';
const g = loadGlobal();
for (const base of ['.cache/ldem_75s_240m', '.cache/ldem_85s_40m']) {
  for (const flip of [false, true]) {
    const p = loadPolar(base, flip); if (!p) continue;
    let n = 0, sum = 0, sumAbs = 0; const minLat = base.includes('85s') ? -89.9 : -89.9, maxLat = base.includes('85s') ? -85.2 : -75.5;
    for (let i = 0; i < 4000; i++) {
      const lat = minLat + Math.random() * (maxLat - minLat), lon = Math.random() * 360;
      const a = p.heightAt(lat, lon), b = g.heightAt(lat, lon); if (Number.isNaN(a) || Number.isNaN(b)) continue;
      n++; sum += a - b; sumAbs += Math.abs(a - b);
    }
    console.log(`${base} flipY=${flip}: n=${n} meanDiff=${(sum / n).toFixed(0)} m  meanAbsDiff=${(sumAbs / n).toFixed(0)} m`);
  }
}
// Known features: Shackleton floor (89.9S, 0E) should be ~4 km below its rim; Malapert massif (~86S, 0E) high.
const p = loadPolar('.cache/ldem_75s_240m')!;
console.log('Shackleton centre h =', p.heightAt(-89.9, 0).toFixed(0), 'm; rim NW (89.75S, 220E) =', p.heightAt(-89.75, 220).toFixed(0), 'm; Malapert area (86S, 0E) =', p.heightAt(-86, 0).toFixed(0), 'm; global at 86S,0E =', g.heightAt(-86, 0).toFixed(0));
