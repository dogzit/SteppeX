/** Time series of body-fixed Sun/Earth vectors (shared by all sites) and their per-site az/el projection. */
import { EphemTable } from './ephemTable';
import { moonState, norm, unit, DEG, SUN_RADIUS_KM, EARTH_RADIUS_KM } from './moonFrame';
import { siteBasis, type Site } from './topocentric';

export interface Series { t0: number; dt: number; n: number; sun: Float32Array; earth: Float32Array }
let table: EphemTable | null = null;
export function setEphemTable(t: EphemTable | null) { table = t; cache.clear(); }
export function hasEphemTable() { return table !== null; }

const cache = new Map<string, Series>();
const MAX_CACHE = 12;

/** Builds (or returns cached) series. Uses the precomputed table when it covers the span, exact ephemeris otherwise. */
export function buildSeries(t0: number, dt: number, n: number): Series {
  const key = `${t0}|${dt}|${n}`;
  const hit = cache.get(key); if (hit) return hit;
  const sun = new Float32Array(n * 3), earth = new Float32Array(n * 3);
  const tEnd = t0 + (n - 1) * dt;
  const out = { sun: [0, 0, 0] as [number, number, number], earth: [0, 0, 0] as [number, number, number] };
  const useTable = table && table.covers(t0) && table.covers(tEnd);
  for (let i = 0; i < n; i++) {
    const t = t0 + i * dt;
    if (useTable) table!.sample(t, out);
    else { const st = moonState(new Date(t)); const u = unit(st.sun); out.sun = u; out.earth = st.earth; }
    sun[i * 3] = out.sun[0]; sun[i * 3 + 1] = out.sun[1]; sun[i * 3 + 2] = out.sun[2];
    earth[i * 3] = out.earth[0]; earth[i * 3 + 1] = out.earth[1]; earth[i * 3 + 2] = out.earth[2];
  }
  const s: Series = { t0, dt, n, sun, earth };
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
  cache.set(key, s);
  return s;
}

export interface SiteSeries { t0: number; dt: number; n: number; sunEl: Float32Array; sunAz: Float32Array; earthEl: Float32Array; earthAz: Float32Array; earthRadiusDeg: Float32Array }

/** Project a shared series into a site's local frame (3 dot products per body per sample). */
export function siteSeries(s: Series, site: Site): SiteSeries {
  const b = siteBasis(site), n = s.n;
  const sunEl = new Float32Array(n), sunAz = new Float32Array(n), earthEl = new Float32Array(n), earthAz = new Float32Array(n), earthRadiusDeg = new Float32Array(n);
  const [ex, ey, ez] = b.east, [nx, ny, nz] = b.north, [ux, uy, uz] = b.up, [px, py, pz] = b.pos;
  for (let i = 0; i < n; i++) {
    let x = s.sun[i * 3], y = s.sun[i * 3 + 1], z = s.sun[i * 3 + 2];
    let e = x * ex + y * ey + z * ez, nn = x * nx + y * ny + z * nz, u = x * ux + y * uy + z * uz;
    sunEl[i] = Math.asin(u / Math.hypot(e, nn, u)) / DEG; let az = Math.atan2(e, nn) / DEG; sunAz[i] = az < 0 ? az + 360 : az;
    x = s.earth[i * 3] - px; y = s.earth[i * 3 + 1] - py; z = s.earth[i * 3 + 2] - pz; // topocentric parallax (up to 0.26°)
    e = x * ex + y * ey + z * ez; nn = x * nx + y * ny + z * nz; u = x * ux + y * uy + z * uz;
    const d = Math.hypot(e, nn, u);
    earthEl[i] = Math.asin(u / d) / DEG; az = Math.atan2(e, nn) / DEG; earthAz[i] = az < 0 ? az + 360 : az; earthRadiusDeg[i] = Math.asin(EARTH_RADIUS_KM / d) / DEG;
  }
  return { t0: s.t0, dt: s.dt, n, sunEl, sunAz, earthEl, earthAz, earthRadiusDeg };
}
export const SUN_RADIUS_DEG_MEAN = Math.asin(SUN_RADIUS_KM / 149597870.7) / DEG; // 0.2666°
export { norm };
