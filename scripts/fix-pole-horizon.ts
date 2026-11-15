/**
 * Rebuilds the horizon profile of the exact-pole library sites ("south-pole", and any site at |lat| = 90) from the
 * shipped downsampled tiles (public/data/dem_*.bin), using the same code path as custom pins.
 * Why: the original sweep was degenerate at |lat| = 90 (fixed in horizonCompute.ts). The 40 m source DEMs are not in
 * the repo, so this profile is honestly labelled 720 m. Re-run `npm run data:horizons` with the source DEMs to get 40 m.
 * Usage: npx tsx scripts/fix-pole-horizon.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { computeHorizon, composite, cylindricalProject, makeRasterSampler, polarProject } from '../src/astro/horizonCompute';
import sitesJson from '../src/data/sites.json';

interface TileMeta { name: string; file: string; proj: 'polar' | 'cyl'; centerLat?: -90 | 90; ppd?: number; width: number; height: number; scale: number; scaleM?: number; lineOffset?: number; sampleOffset?: number; label: string }
const metas = JSON.parse(readFileSync('public/data/dem_tiles.json', 'utf8')) as TileMeta[];
const load = (m: TileMeta) => { const b = readFileSync(`public/data/${m.file}`); return new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const sampler = (m: TileMeta) => m.proj === 'polar'
  ? makeRasterSampler(load(m), m.width, m.height, m.scale, polarProject(m.centerLat!, m.scaleM!, m.lineOffset!, m.sampleOffset!), m.scaleM!, m.label)
  : makeRasterSampler(load(m), m.width, m.height, m.scale, cylindricalProject(m.ppd!, m.width, m.height), 1737400 * Math.PI / 180 / m.ppd!, m.label, true);

const path = 'public/data/horizons.json';
const all = JSON.parse(readFileSync(path, 'utf8')) as Record<string, any>;
for (const s of sitesJson.sites.filter((x) => Math.abs(x.lat) >= 89.9999 && all[x.id])) {
  const parts = metas.filter((m) => m.proj === 'cyl' || m.centerLat === Math.sign(s.lat) * 90).sort((a, b) => (a.proj === 'polar' ? -1 : 1) - (b.proj === 'polar' ? -1 : 1)).map(sampler);
  const r = computeHorizon(s.lat, s.lon, composite(parts, 'LOLA tiles'), { eyeHeightM: 2, maxDistKm: 250, azStepDeg: 1 });
  const before = new Set(all[s.id].el.map((v: number) => v.toFixed(3))).size;
  all[s.id] = { ...all[s.id], el: Array.from(r.el, (v) => Math.round(v * 1000) / 1000), resolutionM: 720, siteHeightM: Math.round(r.siteHeightM),
    label: 'LOLA DEM 720 m/px (downsampled polar tile); 250 km sweep; eye 2 m' };
  console.log(`${s.id}: ${before} distinct values -> ${new Set(all[s.id].el).size}; site height ${Math.round(r.siteHeightM)} m; horizon ${Math.min(...r.el).toFixed(2)}..${Math.max(...r.el).toFixed(2)}°`);
}
writeFileSync(path, JSON.stringify(all));
