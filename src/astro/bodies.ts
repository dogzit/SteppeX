/** Planets as seen from a lunar site, plus a generic rise/set search for any elevation function. */
import { Body, GeoMoon, HelioVector, Illumination, MakeTime, type FlexibleDateTime } from 'astronomy-engine';
import { AU_KM, apply, moonBodyFixedMatrix, unit, dot, DEG, type Vec3 } from './moonFrame';
import { siteBasis, toAzEl, type Apparent, type Site } from './topocentric';
import { horizonAt, type HorizonProfile } from './horizon';

export const PLANETS = [Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune] as const;
export type Planet = (typeof PLANETS)[number];
const RADIUS_KM: Record<string, number> = { Mercury: 2440, Venus: 6052, Mars: 3390, Jupiter: 69911, Saturn: 58232, Uranus: 25362, Neptune: 24622 };

/** Planet position relative to the Moon's centre in the body-fixed frame (km) and its visual magnitude. */
export function planetFromMoon(body: Planet, date: FlexibleDateTime): { vec: Vec3; mag: number } {
  const time = MakeTime(date), m = moonBodyFixedMatrix(time), p = HelioVector(body, time), e = HelioVector(Body.Earth, time), moon = GeoMoon(time);
  const v: Vec3 = [(p.x - e.x - moon.x) * AU_KM, (p.y - e.y - moon.y) * AU_KM, (p.z - e.z - moon.z) * AU_KM];
  return { vec: apply(m, v), mag: Illumination(body, time).mag };
}
export function planetAzEl(site: Site, body: Planet, date: FlexibleDateTime): Apparent & { mag: number } {
  const { vec, mag } = planetFromMoon(body, date);
  return { ...toAzEl(siteBasis(site), vec, RADIUS_KM[body] ?? 1000), mag };
}
/** Angle between two body-fixed vectors (deg): used for elongation from the Sun. */
export const angleBetween = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b))))) / DEG;

export interface Crossings { upNow: boolean; rise: number | null; set: number | null; transit: number | null; maxEl: number; searchedUntil: number }
/**
 * Next rise and set (and the highest point between them) for any clearance function f(t) = elevation − horizon.
 * Coarse scan at stepMs, then bisection to ±1 s. Bodies that never cross within the span return null.
 */
export function nextCrossings(f: (t: number) => number, nowMs: number, spanMs: number, stepMs: number): Crossings {
  const n = Math.ceil(spanMs / stepMs);
  let prev = f(nowMs), prevT = nowMs, rise: number | null = null, set: number | null = null, maxEl = prev, maxT = nowMs;
  const upNow = prev > 0;
  const bisect = (a: number, b: number, fa: number) => { for (let k = 0; k < 40 && b - a > 1000; k++) { const m = (a + b) / 2, fm = f(m); if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; };
  for (let i = 1; i <= n && (rise === null || set === null); i++) {
    const t = nowMs + i * stepMs, v = f(t);
    if (v > maxEl) { maxEl = v; maxT = t; }
    if (v > 0 !== prev > 0) { const c = bisect(prevT, t, prev); if (v > 0) { if (rise === null) rise = c; } else if (set === null) set = c; }
    prev = v; prevT = t;
  }
  return { upNow, rise, set, transit: maxT, maxEl, searchedUntil: nowMs + n * stepMs };
}
export function planetClearance(site: Site, hz: HorizonProfile, body: Planet) {
  return (t: number) => { const a = planetAzEl(site, body, new Date(t)); return a.el - horizonAt(hz, a.az); };
}
