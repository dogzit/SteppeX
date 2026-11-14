/** Is the Whipple gap a DEM-resolution/crest-picking effect? Scan a 1.5 km box at 240 m for the best-lit point. */
import { readFileSync } from 'node:fs';
import { loadAll } from '../lib/dem';
import { computeHorizon } from '../../src/astro/horizonCompute';
import { buildSeries, siteSeries, visibility, setEphemTable, EphemTable, type EphemMeta } from '../../src/astro';
const meta = JSON.parse(readFileSync('public/data/ephem.json', 'utf8')) as EphemMeta; const buf = readFileSync('public/data/ephem.bin');
setEphemTable(EphemTable.fromBuffer(meta, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer));
const { dem } = loadAll();
const t0 = Date.parse('2024-01-01T00:00:00Z'), dt = 3600_000, n = 365 * 24; const series = buildSeries(t0, dt, n);
const illum = (lat: number, lon: number) => {
  const r = computeHorizon(lat, lon, dem, { eyeHeightM: 2, maxDistKm: 250, azStepDeg: 2 });
  const v = visibility(siteSeries(series, { lat, lon }), { stepDeg: 2, el: r.el, source: 'lola', label: '' }, { sunsetDef: 'limb', earthMarginDeg: 0 });
  let s = 0; for (let i = 0; i < n; i++) s += v.sunFrac[i]; return { pct: 100 * s / n, h: r.siteHeightM };
};
const base = { lat: 89.3766, lon: 126.48 };
console.log('at published point:', illum(base.lat, base.lon));
let best = { pct: 0, lat: 0, lon: 0, h: 0 };
const dLat = 240 / (1737400 * Math.PI / 180), dLon = dLat / Math.cos(base.lat * Math.PI / 180);
for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const lat = base.lat + i * dLat, lon = base.lon + j * dLon; const r = illum(lat, lon); if (r.pct > best.pct) best = { pct: r.pct, lat, lon, h: r.h }; }
console.log('best within ±720 m:', best);
