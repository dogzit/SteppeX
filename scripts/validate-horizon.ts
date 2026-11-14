/** Compare our terrain-aware illumination at Gläser et al. (2018) sites with their published values; append to VALIDATION.md. */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildSeries, siteSeries, visibility, windows, type HorizonProfile } from '../src/astro';
import { EphemTable, type EphemMeta } from '../src/astro/ephemTable';
import { setEphemTable } from '../src/astro/series';

const meta = JSON.parse(readFileSync('public/data/ephem.json', 'utf8')) as EphemMeta; const buf = readFileSync('public/data/ephem.bin');
setEphemTable(EphemTable.fromBuffer(meta, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer));
const hz = JSON.parse(readFileSync('public/data/horizons.json', 'utf8')) as Record<string, { el: number[]; label: string }>;
const sites = [
  { id: 'glaser-c1', name: 'Connecting Ridge C1', lat: -89.4505, lon: -137.16, pub: { avg: 76.0, vis: 81.3, shadowH: 268 }, pub2m: { avg: 88.0, vis: 92.1 } },
  { id: 'glaser-c2', name: 'Connecting Ridge C2', lat: -89.3157, lon: -114.06, pub: { avg: 75.6, vis: 80.6, shadowH: 166 } },
  { id: 'glaser-s', name: 'Shackleton rim S', lat: -89.7849, lon: -156.03, pub: { avg: 81.0, vis: 85.5, shadowH: 221 } },
  { id: 'whipple', name: 'Whipple rim (north)', lat: 89.3766, lon: 126.48, pub: { avg: 82.9, vis: 88.5, shadowH: 101 } },
];
const t0 = Date.parse('2024-01-01T00:00:00Z'), dt = 3600_000, n = Math.round((Date.parse('2026-01-01T00:00:00Z') - t0) / dt);
const series = buildSeries(t0, dt, n);
const rows: string[] = [];
for (const s of sites) {
  const p: HorizonProfile = { stepDeg: 1, el: Float32Array.from(hz[s.id].el), source: 'lola', label: hz[s.id].label };
  const ss = siteSeries(series, { lat: s.lat, lon: s.lon });
  const v = visibility(ss, p, { sunsetDef: 'limb', earthMarginDeg: 0 });
  let avg = 0, vis = 0; for (let i = 0; i < n; i++) { avg += v.sunFrac[i]; vis += v.sunUp[i]; }
  const dark = new Uint8Array(n); for (let i = 0; i < n; i++) dark[i] = v.sunUp[i] ? 0 : 1;
  const shadow = windows(dark, t0, dt).reduce((m, w) => Math.max(m, w.end - w.start), 0) / 3600_000;
  rows.push(`| ${s.name} | ${(100 * avg / n).toFixed(1)} | ${s.pub.avg}${s.pub2m ? ` (${s.pub2m.avg} at 2 m)` : ''} | ${(100 * vis / n).toFixed(1)} | ${s.pub.vis}${s.pub2m ? ` (${s.pub2m.vis} at 2 m)` : ''} | ${shadow.toFixed(0)} | ${s.pub.shadowH} | ${hz[s.id].label.split(';')[0]} |`);
}
const md = `
## Terrain illumination vs. Gläser et al. (2018)
Our 2024–2025 hourly sweep with the LOLA-derived horizon (eye 2 m) against the 20-year, 20 m/px study (surface level unless noted; Planet. Space Sci., NTRS 20170007365, Table 1). Different DEM resolution, period and eye height, so agreement within a few percentage points is the expectation, not identity.

| Site | Avg illumination % (ours) | published | Solar visibility % (ours) | published | Longest shadow h (ours) | published | DEM used |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}

Avg illumination = mean visible fraction of the solar disc; solar visibility = fraction of time any part of the disc is above the terrain. Regenerate with \`npm run validate:horizon\`.

**Whipple (north) note.** At the published point our 240 m/px profile gives 43.9 %, but the best pixel within ±720 m gives 77.0 % (scripts/dev/check-whipple.ts). The published 82.9 % comes from a 20 m/px DEM where the rim crest is resolved. Conclusion: at the poles a few hundred metres of position change illumination by tens of percent, so (a) our south-pole numbers use the 40 m/px tile, (b) coarse-tile results (north pole, custom pins) are labelled as such in the app, and (c) the app's horizon profile should be read as "this pixel", not "this region".
`;
const path = 'VALIDATION.md'; const cur = readFileSync(path, 'utf8'); const idx = cur.indexOf('\n## Terrain illumination');
writeFileSync(path, (idx >= 0 ? cur.slice(0, idx) : cur) + md);
console.log(md);
