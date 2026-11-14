/** Visibility flags, windows, event search with bisection, mission metrics and the viability score. */
import { horizonAt, type HorizonProfile } from './horizon';
import { buildSeries, siteSeries, SUN_RADIUS_DEG_MEAN, type SiteSeries } from './series';
import { skyAt, type Site } from './topocentric';

export interface Options {
  /** 'center': sunset when the Sun's centre crosses the horizon. 'limb': when the last of the disc disappears. */
  sunsetDef: 'center' | 'limb';
  /** Extra elevation (deg) the Earth must have above the terrain for a usable DTE link (antenna mask). */
  earthMarginDeg: number;
}
export const DEFAULT_OPTIONS: Options = { sunsetDef: 'center', earthMarginDeg: 0 };
/** How far ahead nextEvents() searches for a transition before giving up and reporting "none found". */
export const NEXT_EVENT_HORIZON_DAYS = 400;
/** Assumed battery survival time (h) without sunlight; also the margin score's divisor. Not yet user-configurable. */
export const MARGIN_BATTERY_HOURS = 72;

/** Fraction of a disc of radius r whose centre sits h above a straight horizon (0..1). */
export function discFraction(h: number, r: number): number {
  const x = Math.max(-1, Math.min(1, h / r));
  return (Math.acos(-x) + x * Math.sqrt(1 - x * x)) / Math.PI;
}
const sunOffset = (o: Options) => (o.sunsetDef === 'limb' ? SUN_RADIUS_DEG_MEAN : 0);

export interface Visibility { sunUp: Uint8Array; earthUp: Uint8Array; both: Uint8Array; sunFrac: Float32Array; sunClear: Float32Array; earthClear: Float32Array }
export function visibility(ss: SiteSeries, hz: HorizonProfile, o: Options = DEFAULT_OPTIONS): Visibility {
  const n = ss.n, sunUp = new Uint8Array(n), earthUp = new Uint8Array(n), both = new Uint8Array(n), sunFrac = new Float32Array(n), sunClear = new Float32Array(n), earthClear = new Float32Array(n);
  const so = sunOffset(o);
  for (let i = 0; i < n; i++) {
    const hs = ss.sunEl[i] - horizonAt(hz, ss.sunAz[i]), he = ss.earthEl[i] - horizonAt(hz, ss.earthAz[i]) - o.earthMarginDeg;
    sunClear[i] = hs; earthClear[i] = he;
    sunFrac[i] = discFraction(hs, SUN_RADIUS_DEG_MEAN);
    sunUp[i] = hs + so > 0 ? 1 : 0; earthUp[i] = he > 0 ? 1 : 0; both[i] = sunUp[i] & earthUp[i];
  }
  return { sunUp, earthUp, both, sunFrac, sunClear, earthClear };
}

export interface Window { start: number; end: number; openStart: boolean; openEnd: boolean }
/** Contiguous runs of 1s as time windows (sample-resolution edges). */
export function windows(flags: Uint8Array, t0: number, dt: number): Window[] {
  const out: Window[] = []; let start = -1;
  for (let i = 0; i <= flags.length; i++) {
    const on = i < flags.length && flags[i] === 1;
    if (on && start < 0) start = i;
    if (!on && start >= 0) { out.push({ start: t0 + start * dt, end: t0 + i * dt, openStart: start === 0, openEnd: i === flags.length }); start = -1; }
  }
  return out;
}

/** Exact clearance (deg) of a body above the (terrain) horizon at time t. */
export function clearanceAt(site: Site, hz: HorizonProfile, body: 'sun' | 'earth', t: number, o: Options): number {
  const sky = skyAt(site, new Date(t));
  if (body === 'sun') return sky.sun.el - horizonAt(hz, sky.sun.az) + sunOffset(o);
  return sky.earth.el - horizonAt(hz, sky.earth.az) - o.earthMarginDeg;
}
/** Bisection between a sample where the body is up/down and the next where it flipped. ±1 s. */
export function refine(site: Site, hz: HorizonProfile, body: 'sun' | 'earth', tA: number, tB: number, o: Options): number {
  let a = tA, b = tB, fa = clearanceAt(site, hz, body, a, o);
  for (let k = 0; k < 40 && b - a > 1000; k++) { const m = (a + b) / 2, fm = clearanceAt(site, hz, body, m, o); if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m; }
  return (a + b) / 2;
}

export interface NextEvents { sunset: number | null; sunrise: number | null; earthset: number | null; earthrise: number | null; searchedUntil: number }
/** First future transitions within `horizonDays`, searched on a coarse grid then refined. */
export function nextEvents(site: Site, hz: HorizonProfile, nowMs: number, o: Options = DEFAULT_OPTIONS, horizonDays = NEXT_EVENT_HORIZON_DAYS, stepMs = 3600_000): NextEvents {
  const t0 = Math.floor(nowMs / stepMs) * stepMs, n = Math.ceil((horizonDays * 86400_000) / stepMs) + 1;
  const ss = siteSeries(buildSeries(t0, stepMs, n), site), v = visibility(ss, hz, o);
  const find = (flags: Uint8Array, body: 'sun' | 'earth', to: 0 | 1): number | null => {
    const nowUp = clearanceAt(site, hz, body, nowMs, o) > 0 ? 1 : 0;
    if (nowUp === to) { // already in the target state: find the next time we leave and re-enter it
      let i = 1; while (i < n && flags[i] === to) i++;
      while (i < n && flags[i] !== to) i++;
      if (i >= n) return null;
      return refine(site, hz, body, t0 + (i - 1) * stepMs, t0 + i * stepMs, o);
    }
    let i = 1; while (i < n && flags[i] !== to) i++;
    if (i >= n) return null;
    const a = Math.max(nowMs, t0 + (i - 1) * stepMs);
    return refine(site, hz, body, a, t0 + i * stepMs, o);
  };
  return { sunset: find(v.sunUp, 'sun', 0), sunrise: find(v.sunUp, 'sun', 1), earthset: find(v.earthUp, 'earth', 0), earthrise: find(v.earthUp, 'earth', 1), searchedUntil: t0 + (n - 1) * stepMs };
}

export interface Metrics {
  now: { sunEl: number; sunAz: number; earthEl: number; earthAz: number; sunClear: number; earthClear: number; sunFrac: number; sunUp: boolean; earthUp: boolean; earthRadiusDeg: number; sunRadiusDeg: number; earthDistKm: number };
  window: { startMs: number; endMs: number; sunlitFrac: number; effectiveSunFrac: number; earthFrac: number; bothFrac: number; longestSunlitMs: number; longestDarkMs: number; sunWindows: Window[]; earthWindows: Window[]; bothWindows: Window[] };
  next: NextEvents;
  score: { total: number; power: number; comms: number; continuity: number; margin: number };
}
export const SCORE_WEIGHTS = { power: 0.4, comms: 0.3, continuity: 0.15, margin: 0.15 } as const;

export function computeMetrics(site: Site, hz: HorizonProfile, nowMs: number, windowDays = 14, o: Options = DEFAULT_OPTIONS): Metrics {
  const sky = skyAt(site, new Date(nowMs));
  const sunClear = sky.sun.el - horizonAt(hz, sky.sun.az), earthClear = sky.earth.el - horizonAt(hz, sky.earth.az) - o.earthMarginDeg;
  const dt = 600_000, n = Math.round((windowDays * 86400_000) / dt) + 1, t0 = Math.floor(nowMs / dt) * dt;
  const ss = siteSeries(buildSeries(t0, dt, n), site), v = visibility(ss, hz, o);
  let sunN = 0, earthN = 0, bothN = 0, eff = 0;
  for (let i = 0; i < n; i++) { sunN += v.sunUp[i]; earthN += v.earthUp[i]; bothN += v.both[i]; eff += v.sunFrac[i]; }
  const sunWindows = windows(v.sunUp, t0, dt), earthWindows = windows(v.earthUp, t0, dt), bothWindows = windows(v.both, t0, dt);
  const longest = (ws: Window[]) => ws.reduce((m, w) => Math.max(m, w.end - w.start), 0);
  const dark = new Uint8Array(n); for (let i = 0; i < n; i++) dark[i] = v.sunUp[i] ? 0 : 1;
  const next = nextEvents(site, hz, nowMs, o);
  const windowMs = windowDays * 86400_000;
  const power = eff / n, comms = earthN / n, continuity = Math.min(1, longest(sunWindows) / windowMs);
  const hoursToDark = sunClear + sunOffset(o) > 0 ? (next.sunset ? (next.sunset - nowMs) / 3600_000 : MARGIN_BATTERY_HOURS) : 0;
  const margin = Math.min(1, hoursToDark / MARGIN_BATTERY_HOURS);
  const total = 100 * (SCORE_WEIGHTS.power * power + SCORE_WEIGHTS.comms * comms + SCORE_WEIGHTS.continuity * continuity + SCORE_WEIGHTS.margin * margin);
  return {
    now: { sunEl: sky.sun.el, sunAz: sky.sun.az, earthEl: sky.earth.el, earthAz: sky.earth.az, sunClear, earthClear, sunFrac: discFraction(sunClear, SUN_RADIUS_DEG_MEAN), sunUp: sunClear + sunOffset(o) > 0, earthUp: earthClear > 0, earthRadiusDeg: sky.earth.radiusDeg, sunRadiusDeg: sky.sun.radiusDeg, earthDistKm: sky.earth.distKm },
    window: { startMs: t0, endMs: t0 + (n - 1) * dt, sunlitFrac: sunN / n, effectiveSunFrac: power, earthFrac: comms, bothFrac: bothN / n, longestSunlitMs: longest(sunWindows), longestDarkMs: longest(windows(dark, t0, dt)), sunWindows, earthWindows, bothWindows },
    next,
    score: { total, power: 100 * power, comms: 100 * comms, continuity: 100 * continuity, margin: 100 * margin },
  };
}
