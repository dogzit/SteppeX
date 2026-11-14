/**
 * "Find a window": the earliest mission start, within each separate sunlit stretch, whose fixed-length
 * mission window [start, start+requiredSunMs] both (a) stays entirely inside that one continuous sunlit
 * stretch and (b) contains a single continuous Earth-visible interval of at least requiredEarthMs.
 *
 * Split in two layers:
 *  - findWindowsCore: pure geometry over Window[] arrays (no astronomy, no DOM) — deterministically testable.
 *  - findWindow: integration wrapper that builds those windows from the real engine (same siteSeries/
 *    visibility/windows used by the dashboard and timeline, same Options), then bisection-refines every
 *    window edge with the existing `refine`/`clearanceAt` so results agree with the live readouts to ~1 s.
 */
import { buildSeries, siteSeries } from './series';
import { visibility, windows, refine, DEFAULT_OPTIONS, type Options, type Window } from './events';
import type { HorizonProfile } from './horizon';
import type { Site } from './topocentric';

export interface WindowCandidate {
  /** The continuous sunlit stretch this opportunity was found in. */
  sunWindow: Window;
  /** Proposed mission window: start/end in ms (UTC epoch). end - start === requiredSunMs. */
  start: number;
  end: number;
  /** The actual Earth-visible interval that satisfies the requirement (its real extent, which may exceed
   *  the requirement), intersected with the mission window. Null when no Earth visibility was required. */
  earthInterval: { start: number; end: number } | null;
  /** Sunlight still available in this stretch after the mission ends (ms). */
  remainingSunlightMs: number;
  /** True if the sunlit stretch was cut by the search boundary, so remainingSunlightMs is only a lower bound. */
  remainingIsLowerBound: boolean;
}

export interface FindWindowOutcome {
  /** Up to maxResults opportunities, earliest first, one per sunlit stretch. */
  candidates: WindowCandidate[];
  /** Longest continuous sunlit stretch found anywhere in the search span (ms), for the "insufficient sunlight" explanation. */
  longestSunlitMs: number;
  /** True if the stretch achieving longestSunlitMs was cut by the search boundary (so the true longest may be more). */
  longestSunlitIsLowerBound: boolean;
  /** True if at least one sunlit stretch is long enough to hold requiredSunMs, independent of the Earth requirement. */
  sunlightSufficient: boolean;
  /** Best continuous Earth-visible overlap achievable inside any valid mission window (ms), for the
   *  "sunlight was fine but Earth visibility fell short" explanation. 0 when not applicable. */
  bestEarthOverlapMs: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function makeCandidate(w: Window, start: number, requiredSunMs: number, ew: Window | null): WindowCandidate {
  const end = start + requiredSunMs;
  const earthInterval = ew ? { start: Math.max(ew.start, start), end: Math.min(ew.end, end) } : null;
  return { sunWindow: w, start, end, earthInterval, remainingSunlightMs: w.end - end, remainingIsLowerBound: w.openEnd };
}

/**
 * Best achievable overlap (ms) between any single Earth window and a mission window of length requiredSunMs
 * whose start ranges over [Ls, upperT] inside sunlit window w. overlap(t) = |[t,t+requiredSunMs] ∩ ew| is
 * concave and piecewise-linear in t with breakpoints at t = ew.start and t = ew.end - requiredSunMs, so its
 * max over an interval is attained at one of those two points (clamped into range) or at the range's own
 * endpoints — no search needed, just evaluate at those four candidates.
 */
function bestOverlapInWindow(w: Window, earthWindows: Window[], searchStart: number, requiredSunMs: number): number {
  const Ls = Math.max(w.start, searchStart);
  const upperT = w.end - requiredSunMs;
  if (Ls > upperT) return 0;
  let best = 0;
  for (const ew of earthWindows) {
    for (const t of [Ls, upperT, clamp(ew.start, Ls, upperT), clamp(ew.end - requiredSunMs, Ls, upperT)]) {
      const overlap = Math.max(0, Math.min(ew.end, t + requiredSunMs) - Math.max(ew.start, t));
      if (overlap > best) best = overlap;
    }
  }
  return best;
}

/**
 * Pure geometric search. sunWindows/earthWindows are contiguous-run windows over the search span (as
 * produced by `windows()`); earthWindows is ignored (and may be empty) when requiredEarthMs <= 0.
 */
export function findWindowsCore(
  sunWindows: Window[],
  earthWindows: Window[],
  searchStart: number,
  requiredSunMs: number,
  requiredEarthMs: number,
  maxResults = 3,
): FindWindowOutcome {
  const raw: WindowCandidate[] = [];
  let longest = 0, longestLower = false;

  for (const w of sunWindows) {
    const len = w.end - w.start;
    if (len > longest) { longest = len; longestLower = w.openEnd; }

    const Ls = Math.max(w.start, searchStart);
    const upperT = w.end - requiredSunMs; // latest start that still fits requiredSunMs inside this stretch
    if (Ls > upperT) continue; // this stretch can never hold the requested sunlight duration

    if (requiredEarthMs <= 0) { raw.push(makeCandidate(w, Ls, requiredSunMs, null)); continue; }

    // Earliest start across every Earth-visible window long enough on its own to carry requiredEarthMs.
    // For a single Earth window ew=[Es,Ee] with length L=Ee-Es >= requiredEarthMs (and requiredEarthMs <=
    // requiredSunMs), the set of mission starts t with overlap(t) >= requiredEarthMs is exactly the interval
    // [Es + requiredEarthMs - requiredSunMs, Ee - requiredEarthMs] (closed form of the concave overlap
    // function's super-level set). A later, independent Earth window can therefore yield a feasible start
    // even when an earlier one's interval falls entirely outside [Ls, upperT] — each window is tried on its
    // own merits and the minimum feasible start across all of them wins.
    let best: number | null = null, bestEw: Window | null = null;
    for (const ew of earthWindows) {
      const L = ew.end - ew.start;
      if (L < requiredEarthMs) continue; // a single window can't be split to reach a continuous requirement
      const lo = ew.start + requiredEarthMs - requiredSunMs;
      const hi = ew.end - requiredEarthMs;
      const t = Math.max(Ls, lo);
      if (t > hi || t > upperT) continue; // this Earth window can't anchor a valid start in this stretch
      if (best === null || t < best) { best = t; bestEw = ew; }
    }
    if (best !== null && bestEw) raw.push(makeCandidate(w, best, requiredSunMs, bestEw));
  }

  raw.sort((a, b) => a.start - b.start);
  const sunlightSufficient = sunWindows.some((w) => w.end - Math.max(w.start, searchStart) >= requiredSunMs);
  const bestEarthOverlapMs = requiredEarthMs > 0 ? sunWindows.reduce((m, w) => Math.max(m, bestOverlapInWindow(w, earthWindows, searchStart, requiredSunMs)), 0) : 0;
  return { candidates: raw.slice(0, maxResults), longestSunlitMs: longest, longestSunlitIsLowerBound: longestLower, sunlightSufficient, bestEarthOverlapMs };
}

/** Refines sample-grid window edges to ~1 s via the same bisection used for sunset/Earthset elsewhere. */
function refineWindows(raw: Window[], body: 'sun' | 'earth', site: Site, hz: HorizonProfile, o: Options, dt: number): Window[] {
  return raw.map((w) => ({
    start: w.openStart ? w.start : refine(site, hz, body, w.start - dt, w.start, o),
    end: w.openEnd ? w.end : refine(site, hz, body, w.end - dt, w.end, o),
    openStart: w.openStart,
    openEnd: w.openEnd,
  }));
}

export interface FindWindowParams {
  site: Site;
  horizon: HorizonProfile;
  /** Search start, ms — the scenario/mission-clock time the search runs from. */
  searchStart: number;
  /** Search end, ms. If this exceeds the precomputed ephemeris table's range, buildSeries falls back to
   *  exact per-sample ephemeris for the whole span rather than reading past the table — results stay
   *  correct, just slower, right up to and past the table boundary. */
  searchEnd: number;
  requiredSunMs: number;
  requiredEarthMs: number;
  options?: Options;
  /** Coarse sampling step before bisection refinement. 15 min comfortably resolves 2 h+ Earth windows. */
  sampleMs?: number;
  maxResults?: number;
}

export function findWindow(p: FindWindowParams): FindWindowOutcome {
  const o = p.options ?? DEFAULT_OPTIONS;
  const dt = p.sampleMs ?? 900_000;
  const n = Math.ceil((p.searchEnd - p.searchStart) / dt) + 1;
  const ss = siteSeries(buildSeries(p.searchStart, dt, n), p.site);
  const v = visibility(ss, p.horizon, o);
  const sunWindows = refineWindows(windows(v.sunUp, p.searchStart, dt), 'sun', p.site, p.horizon, o, dt);
  const earthWindows = p.requiredEarthMs > 0 ? refineWindows(windows(v.earthUp, p.searchStart, dt), 'earth', p.site, p.horizon, o, dt) : [];
  return findWindowsCore(sunWindows, earthWindows, p.searchStart, p.requiredSunMs, p.requiredEarthMs, p.maxResults ?? 3);
}
