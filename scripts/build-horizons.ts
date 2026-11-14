/** Precompute terrain horizon profiles for every library site -> public/data/horizons.json. Run: npm run data:horizons */
import { writeFileSync, mkdirSync } from 'node:fs';
import { loadAll } from './lib/dem';
import { computeHorizon } from '../src/astro/horizonCompute';
import raw from '../src/data/sites.json';

const { dem, parts } = loadAll();
console.log('DEM parts:', parts.join(', '));
const out: Record<string, unknown> = {};
const t0 = Date.now();
for (const s of (raw as { sites: { id: string; lat: number; lon: number }[] }).sites) {
  const r = computeHorizon(s.lat, s.lon, dem, { eyeHeightM: 2, maxDistKm: 250, azStepDeg: 1 });
  const finest = Math.abs(s.lat) >= 85 && parts.includes('ldem_85s_40m') && s.lat < 0 ? 40 : Math.abs(s.lat) >= 75 ? 240 : 1895;
  const label = finest === 40 ? 'LOLA DEM 40 m/px (<85°S), 240 m/px (75–85°S), 1.9 km/px beyond; 250 km sweep; eye 2 m'
    : finest === 240 ? 'LOLA DEM 240 m/px polar tile, 1.9 km/px beyond 75°; 250 km sweep; eye 2 m' : 'LOLA DEM 1.9 km/px (coarse global grid); 250 km sweep; eye 2 m';
  out[s.id] = { stepDeg: 1, el: Array.from(r.el, (v) => +v.toFixed(3)), source: 'lola', label, resolutionM: finest, siteHeightM: Math.round(r.siteHeightM), eyeHeightM: 2, maxDistKm: 250 };
  const mx = Math.max(...r.el), mn = Math.min(...r.el);
  console.log(`${s.id.padEnd(14)} h=${r.siteHeightM.toFixed(0).padStart(6)} m  horizon min ${mn.toFixed(2)}° max ${mx.toFixed(2)}°  (${finest} m/px)`);
}
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/horizons.json', JSON.stringify(out));
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
