/**
 * Long-run illumination statistics for a place on the Moon, and the ranking that turns a grid of
 * them into "peaks of eternal light".
 *
 * Pure geometry reuse: the Sun and Earth angles come from `siteSeries`, the terrain test from
 * `visibility`, and the runs from `windows`. Nothing here re-derives an ephemeris or a horizon.
 */
import { DEG, MOON_RADIUS_KM } from './moonFrame';
import type { SiteSeries } from './series';
import type { HorizonProfile } from './horizon';
import { visibility, windows, DEFAULT_OPTIONS, type Options, type Visibility } from './events';

export interface IlluminationStats {
  /** Share of samples with any part of the solar disc above the terrain. */
  sunlitFrac: number;
  /** Mean visible fraction of the solar disc: "average illumination" in the Gläser sense. */
  meanSunFrac: number;
  /** Share of samples with Earth clear of the terrain and the radio margin. */
  earthFrac: number;
  /** Longest unbroken darkness and sunlight within the sampled span. */
  longestDarkMs: number;
  longestSunMs: number;
}

/** Stats over samples [from, to) of a visibility run that has already been computed. */
export function illuminationSlice(v: Visibility, t0: number, dt: number, from = 0, to = v.sunUp.length): IlluminationStats {
  const a = Math.max(0, Math.min(from, v.sunUp.length)), b = Math.max(a, Math.min(to, v.sunUp.length));
  const n = b - a;
  if (n === 0) return { sunlitFrac: 0, meanSunFrac: 0, earthFrac: 0, longestDarkMs: 0, longestSunMs: 0 };
  let sun = 0, earth = 0, frac = 0;
  const dark = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const up = v.sunUp[a + i];
    sun += up; earth += v.earthUp[a + i]; frac += v.sunFrac[a + i];
    dark[i] = up ? 0 : 1;
  }
  const span = (w: { start: number; end: number }[]) => w.reduce((m, x) => Math.max(m, x.end - x.start), 0);
  const base = t0 + a * dt;
  return {
    sunlitFrac: sun / n,
    meanSunFrac: frac / n,
    earthFrac: earth / n,
    longestDarkMs: span(windows(dark, base, dt)),
    longestSunMs: span(windows(v.sunUp.subarray(a, b), base, dt)),
  };
}

/** Convenience for one site over a whole series. */
export function illuminationStats(ss: SiteSeries, hz: HorizonProfile, o: Options = DEFAULT_OPTIONS): IlluminationStats {
  return illuminationSlice(visibility(ss, hz, o), ss.t0, ss.dt, 0, ss.n);
}

export interface PeakCandidate { lat: number; lon: number; sunlitFrac: number }
export interface RankOptions {
  /** How many to return. */
  count?: number;
  /** Great-circle spacing between results, so one bright ridge cannot fill the whole list. */
  minSeparationKm?: number;
  /** Ignore cells below this share of sunlight. */
  minSunlitFrac?: number;
}

/** Great-circle distance on the reference sphere, in kilometres. */
export function surfaceDistanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const p1 = aLat * DEG, p2 = bLat * DEG, dl = (bLon - aLon) * DEG;
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl);
  return Math.acos(Math.max(-1, Math.min(1, c))) * MOON_RADIUS_KM;
}

/**
 * Brightest cells first, keeping results apart so the list describes distinct places rather than
 * a dozen samples of the same crater rim. Ties break on position, so the result is deterministic.
 */
export function rankPeaks<T extends PeakCandidate>(cells: readonly T[], o: RankOptions = {}): T[] {
  const count = o.count ?? 10, minSep = o.minSeparationKm ?? 5, floor = o.minSunlitFrac ?? 0;
  const sorted = cells
    .filter((c) => c.sunlitFrac >= floor && Number.isFinite(c.lat) && Number.isFinite(c.lon))
    .slice()
    .sort((x, y) => y.sunlitFrac - x.sunlitFrac || x.lat - y.lat || x.lon - y.lon);
  const out: T[] = [];
  for (const c of sorted) {
    if (out.length >= count) break;
    if (out.every((k) => surfaceDistanceKm(k.lat, k.lon, c.lat, c.lon) >= minSep)) out.push(c);
  }
  return out;
}
