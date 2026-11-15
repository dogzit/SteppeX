/**
 * Precompute how much of a year and of each month the south polar terrain spends in sunlight.
 *
 * One body-fixed Sun/Earth series is built once and shared by every grid cell, exactly as the app
 * does at runtime; a cell only adds its own horizon sweep, three dot products per sample and the
 * shared visibility test. Nothing here re-derives geometry that src/astro already owns.
 *
 *   node --import tsx scripts/build-polar-illumination.ts [--grid 256] [--year 2026]
 *
 * Writes public/data/polar-illumination.bin and .json.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { loadAll } from './lib/dem';
import { computeHorizon } from '../src/astro/horizonCompute';
import { EphemTable, type EphemMeta } from '../src/astro/ephemTable';
import { setEphemTable, buildSeries, siteSeries } from '../src/astro/series';
import { visibility, DEFAULT_OPTIONS } from '../src/astro/events';
import { illuminationSlice, rankPeaks } from '../src/astro/illumination';
import { readFileSync } from 'node:fs';

const arg = (name: string, dflt: number) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? Number(process.argv[i + 1]) : dflt; };
const N = arg('grid', 256);                 // raster side
const YEAR = arg('year', 2026);             // reference period, named in the legend
const HALF_ANGLE_DEG = 2.5;                 // square edge = 5 deg colatitude = the 40 m/px DEM's coverage
const PEAKS = 12, PEAK_SEPARATION_KM = 8, CANDIDATES = 30;
/** Local search around each candidate: a coarse pass, then a fine one around its winner, in metres. */
const REFINE_SPAN_M = 1200, REFINE_STEP_M = 400, FINE_SPAN_M = 450, FINE_STEP_M = 90;
const HOUR = 3600_000;
const NO_DATA = 255;

// Map grid settings used by the heatmap overlay. Mirrors build-polar-hillshade.ts so the overlay
// and the hillshade can share one transform in the UI.
const extent = Math.tan(HALF_ANGLE_DEG * Math.PI / 180);
const cellOf = (x: number, y: number) => {
  const px = ((x + 0.5) / N * 2 - 1) * extent, py = (1 - (y + 0.5) / N * 2) * extent;
  const colat = 2 * Math.atan(Math.hypot(px, py)) * 180 / Math.PI;
  return { lat: -(90 - colat), lon: Math.atan2(py, px) * 180 / Math.PI, colat };
};

const peaksOnly = process.argv.includes('--peaks-only');
const meta = JSON.parse(readFileSync('public/data/ephem.json', 'utf8')) as EphemMeta;
const buf = readFileSync('public/data/ephem.bin');
setEphemTable(EphemTable.fromBuffer(meta, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer));

const { dem, parts } = loadAll();
console.log('DEM parts:', parts.join(', '));

const t0 = Date.UTC(YEAR, 0, 1), tEnd = Date.UTC(YEAR + 1, 0, 1);
const samples = Math.round((tEnd - t0) / HOUR);
const series = buildSeries(t0, HOUR, samples); // site-independent, built once for the whole grid
const monthStart = Array.from({ length: 13 }, (_, m) => Math.round((Date.UTC(YEAR, m, 1) - t0) / HOUR));
console.log(`${YEAR}: ${samples} hourly samples, grid ${N}x${N}, colatitude <= ${2 * HALF_ANGLE_DEG} deg`);

const year = new Uint8Array(N * N).fill(NO_DATA);
const months = Array.from({ length: 12 }, () => new Uint8Array(N * N).fill(NO_DATA));
const earth = new Uint8Array(N * N).fill(NO_DATA);
const darkH = new Uint16Array(N * N);
const pct = (f: number) => Math.max(0, Math.min(254, Math.round(f * 100)));

const cells: { lat: number; lon: number; sunlitFrac: number; earthFrac: number; longestDarkMs: number; i: number }[] = [];
const t0ms = Date.now();
let done = 0, inside = 0;
if (peaksOnly) {
  // Reuse the grid already on disk and rebuild only the ranking.
  const prev = readFileSync('public/data/polar-illumination.bin');
  const n2 = N * N;
  const y8 = new Uint8Array(prev.buffer, prev.byteOffset, n2);
  const e8 = new Uint8Array(prev.buffer, prev.byteOffset + n2 * 13, n2);
  const d16 = new Uint16Array(prev.buffer.slice(prev.byteOffset + n2 * 14, prev.byteOffset + n2 * 16));
  year.set(y8); earth.set(e8); darkH.set(d16);
  for (let m = 0; m < 12; m++) months[m].set(new Uint8Array(prev.buffer, prev.byteOffset + n2 * (m + 1), n2));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; if (y8[i] === NO_DATA) continue;
    const { lat, lon } = cellOf(x, y);
    cells.push({ lat, lon, sunlitFrac: y8[i] / 100, earthFrac: e8[i] / 100, longestDarkMs: d16[i] * HOUR, i });
  }
  console.log(`reusing ${cells.length} grid cells from disk`);
}
for (let y = 0; !peaksOnly && y < N; y++) {
  for (let x = 0; x < N; x++) {
    const { lat, lon, colat } = cellOf(x, y);
    if (colat > 2 * HALF_ANGLE_DEG) continue;
    inside++;
    const i = y * N + x;
    const hz = computeHorizon(lat, lon, dem, { eyeHeightM: 2, maxDistKm: 250, azStepDeg: 2, stepFraction: 0.01 });
    const v = visibility(siteSeries(series, { lat, lon }), { stepDeg: hz.stepDeg, el: hz.el, source: 'lola', label: 'grid' }, DEFAULT_OPTIONS);
    const all = illuminationSlice(v, t0, HOUR);
    year[i] = pct(all.sunlitFrac);
    earth[i] = pct(all.earthFrac);
    darkH[i] = Math.min(65535, Math.round(all.longestDarkMs / HOUR));
    for (let m = 0; m < 12; m++) months[m][i] = pct(illuminationSlice(v, t0, HOUR, monthStart[m], monthStart[m + 1]).sunlitFrac);
    cells.push({ lat, lon, sunlitFrac: all.sunlitFrac, earthFrac: all.earthFrac, longestDarkMs: all.longestDarkMs, i });
    if (++done % 2000 === 0) {
      const rate = done / ((Date.now() - t0ms) / 1000);
      process.stdout.write(`\r  ${done} cells  ${rate.toFixed(0)}/s  eta ${(((N * N * Math.PI / 4) - done) / rate / 60).toFixed(1)} min   `);
    }
  }
}
if (!peaksOnly) console.log(`\n  ${inside} cells computed in ${((Date.now() - t0ms) / 1000 / 60).toFixed(1)} min`);

/**
 * A grid cell is a 1.2 km sample, and at the poles a few hundred metres moves illumination by
 * tens of points: the cell next to Connecting Ridge C1 reads 66% where the site itself reads 78%.
 * So each candidate is searched locally at the full 1-degree sweep, and the best point found is
 * what gets reported, with the profile that produced it.
 */
const DEG_RAD = Math.PI / 180, R_M = 1737400;
function evaluate(lat: number, lon: number) {
  const hz = computeHorizon(lat, lon, dem, { eyeHeightM: 2, maxDistKm: 250, azStepDeg: 1, stepFraction: 0.005 });
  const v = visibility(siteSeries(series, { lat, lon }), { stepDeg: 1, el: hz.el, source: 'lola', label: 'peak' }, DEFAULT_OPTIONS);
  return { lat, lon, hz, s: illuminationSlice(v, t0, HOUR) };
}
function sweepAround(lat0: number, lon0: number, span: number, step: number, seed: ReturnType<typeof evaluate>) {
  let best = seed;
  for (let dy = -span; dy <= span; dy += step) {
    for (let dx = -span; dx <= span; dx += step) {
      const lat = lat0 + (dy / R_M) / DEG_RAD;
      const cosLat = Math.max(1e-6, Math.cos(lat * DEG_RAD));
      const lon = lon0 + (dx / (R_M * cosLat)) / DEG_RAD;
      const got = evaluate(lat, lon);
      if (got.s.sunlitFrac > best.s.sunlitFrac) best = got;
    }
  }
  return best;
}
/** Coarse pass over the cell, then a fine pass around whatever it found: the sensitivity scale
 *  here is a couple of hundred metres, so a 400 m step on its own straddles the crests. */
function refine(lat0: number, lon0: number) {
  const coarse = sweepAround(lat0, lon0, REFINE_SPAN_M, REFINE_STEP_M, evaluate(lat0, lon0));
  return sweepAround(coarse.lat, coarse.lon, FINE_SPAN_M, FINE_STEP_M, coarse);
}

const candidates = rankPeaks(cells, { count: CANDIDATES, minSeparationKm: PEAK_SEPARATION_KM / 2, minSunlitFrac: 0.4 });
console.log(`\nrefining ${candidates.length} candidates: +-${REFINE_SPAN_M} m at ${REFINE_STEP_M} m, then +-${FINE_SPAN_M} m at ${FINE_STEP_M} m`);
const refined = candidates.map((c) => {
  const b = refine(c.lat, c.lon);
  console.log(`  grid ${(c.sunlitFrac * 100).toFixed(1)}% at ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)} -> ${(b.s.sunlitFrac * 100).toFixed(1)}% at ${b.lat.toFixed(4)}, ${b.lon.toFixed(4)}`);
  return { ...b, sunlitFrac: b.s.sunlitFrac };
});
const peaks = rankPeaks(refined, { count: PEAKS, minSeparationKm: PEAK_SEPARATION_KM }).map((b, rank) => {
  console.log(`  peak ${rank + 1}: ${b.lat.toFixed(4)}, ${b.lon.toFixed(4)}  sunlit ${(b.s.sunlitFrac * 100).toFixed(1)}%  dark ${(b.s.longestDarkMs / HOUR).toFixed(0)} h  earth ${(b.s.earthFrac * 100).toFixed(0)}%  h=${b.hz.siteHeightM.toFixed(0)} m`);
  return {
    lat: +b.lat.toFixed(4), lon: +b.lon.toFixed(4),
    sunlitPct: +(b.s.sunlitFrac * 100).toFixed(1),
    meanSunPct: +(b.s.meanSunFrac * 100).toFixed(1),
    earthPct: +(b.s.earthFrac * 100).toFixed(1),
    longestDarkH: +(b.s.longestDarkMs / HOUR).toFixed(1),
    siteHeightM: Math.round(b.hz.siteHeightM),
    el: Array.from(b.hz.el, (e) => +e.toFixed(2)),
  };
});

mkdirSync('public/data', { recursive: true });
const bin = Buffer.concat([Buffer.from(year.buffer), ...months.map((m) => Buffer.from(m.buffer)), Buffer.from(earth.buffer), Buffer.from(darkH.buffer)]);
if (!peaksOnly) writeFileSync('public/data/polar-illumination.bin', bin);
writeFileSync('public/data/polar-illumination.json', JSON.stringify({
  grid: N, halfAngleDeg: HALF_ANGLE_DEG, year: YEAR, noData: NO_DATA,
  cellKm: +(2 * 1737.4 * Math.tan(HALF_ANGLE_DEG * Math.PI / 180) / N * 2).toFixed(2),
  layers: ['year', 'month01..month12', 'earth', 'darkHours'],
  sweep: { azStepDeg: 2, maxDistKm: 250, eyeHeightM: 2 },
  refine: { spanM: REFINE_SPAN_M, stepM: REFINE_STEP_M, fineSpanM: FINE_SPAN_M, fineStepM: FINE_STEP_M, sweep: { azStepDeg: 1, maxDistKm: 250, eyeHeightM: 2 } },
  dem: 'NASA LRO LOLA / PDS: 40 m/px inside 85 deg S, 240 m/px beyond',
  peaks,
}));
console.log(`wrote polar-illumination.bin (${(bin.length / 1024).toFixed(0)} kB) and .json (${peaks.length} peaks)`);
