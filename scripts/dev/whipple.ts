import { readFileSync } from 'node:fs';
import { loadAll } from '../lib/dem';
import { computeHorizon } from '../../src/astro/horizonCompute';
import { buildSeries, siteSeries, visibility, windows } from '../../src/astro';
import { EphemTable, type EphemMeta } from '../../src/astro/ephemTable';
import { setEphemTable } from '../../src/astro/series';

const meta = JSON.parse(readFileSync('public/data/ephem.json', 'utf8')) as EphemMeta; const buf = readFileSync('public/data/ephem.bin');
setEphemTable(EphemTable.fromBuffer(meta, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer));
const { dem } = loadAll();
const t0 = Date.parse('2024-01-01T00:00:00Z'), dt = 3600_000, n = Math.round((Date.parse('2026-01-01T00:00:00Z') - t0) / dt);
const series = buildSeries(t0, dt, n);
for (const [lat, lon] of [[89.3766, 126.48], [89.3766, -126.48], [89.3766, 121.6], [89.3766, -121.6]] as [number, number][]) {
  const r = computeHorizon(lat, lon, dem, { eyeHeightM: 2, maxDistKm: 250, azStepDeg: 1 });
  const p = { stepDeg: 1, el: r.el, source: 'lola' as const, label: 'x' };
  const v = visibility(siteSeries(series, { lat, lon }), p, { sunsetDef: 'limb' as const, earthMarginDeg: 0 });
  let avg = 0, vis = 0; for (let i = 0; i < n; i++) { avg += v.sunFrac[i]; vis += v.sunUp[i]; }
  const dark = new Uint8Array(n); for (let i = 0; i < n; i++) dark[i] = v.sunUp[i] ? 0 : 1;
  const sh = windows(dark, t0, dt).reduce((m, w) => Math.max(m, w.end - w.start), 0) / 3600_000;
  console.log(`lat=${lat} lon=${lon}  h=${r.siteHeightM.toFixed(0)} m  hz[min/max]=${Math.min(...r.el).toFixed(2)}/${Math.max(...r.el).toFixed(2)}°  avg=${(100*avg/n).toFixed(1)}%  vis=${(100*vis/n).toFixed(1)}%  shadow=${sh.toFixed(0)} h`);
}
