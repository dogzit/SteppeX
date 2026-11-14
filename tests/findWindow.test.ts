import { describe, expect, it } from 'vitest';
import { findWindowsCore } from '../src/astro/findWindow';
import type { Window } from '../src/astro/events';

const hr = 3600_000;
const win = (start: number, end: number, openStart = false, openEnd = false): Window => ({ start: start * hr, end: end * hr, openStart, openEnd });

describe('findWindowsCore — deterministic geometry (no astronomy)', () => {
  it('a later start qualifies when the only usable Earth window sits well into the sunlit stretch', () => {
    // 100 h sunlit stretch, 48 h required. A 0.5 h Earth blip at 10h is too short to count. The only
    // qualifying Earth window is [60h,63h] (3h, >=2h required); it cannot be reached by starting at 0h
    // (0h..48h does not include 60h..63h at all), so the earliest valid start must be pushed forward to
    // 14h, where the mission window [14h,62h] still fits inside the 100h sunlit stretch AND fully
    // contains [60h,62h] of the Earth window (2h overlap, exactly the requirement).
    const sun = [win(0, 100)];
    const earth = [win(10, 10.5), win(60, 63)];
    const out = findWindowsCore(sun, earth, 0, 48 * hr, 2 * hr);
    expect(out.candidates).toHaveLength(1);
    const c = out.candidates[0];
    expect(c.start).toBeCloseTo(14 * hr, 6);
    expect(c.end).toBeCloseTo(62 * hr, 6);
    expect(c.earthInterval).not.toBeNull();
    expect(c.earthInterval!.start).toBeCloseTo(60 * hr, 6);
    expect(c.earthInterval!.end).toBeCloseTo(62 * hr, 6);
    // A naive algorithm that only ever tries the earliest possible start (t = 0h) would find no overlap
    // with the Earth window at all — confirm 0h truly fails and a later start is what makes this work.
    expect(c.start).toBeGreaterThan(0);
  });

  it('two separate one-hour Earth intervals do not satisfy a two-hour continuous requirement', () => {
    const sun = [win(0, 100)];
    const earth = [win(10, 11), win(20, 21)]; // both exactly 1h, requirement is 2h continuous
    const out = findWindowsCore(sun, earth, 0, 48 * hr, 2 * hr);
    expect(out.candidates).toHaveLength(0);
    expect(out.sunlightSufficient).toBe(true); // the 100h stretch easily holds 48h on its own
    // Best achievable is 1h (either window fully contained in a mission window), not the 2h requested.
    expect(out.bestEarthOverlapMs).toBeCloseTo(1 * hr, 6);
  });

  it('an exact-duration match passes: the Earth window is exactly the required length', () => {
    const sun = [win(0, 100)];
    const earth = [win(46, 48)]; // exactly 2h, positioned so a 48h mission starting at 0h just contains it
    const out = findWindowsCore(sun, earth, 0, 48 * hr, 2 * hr);
    expect(out.candidates).toHaveLength(1);
    expect(out.candidates[0].start).toBeCloseTo(0, 6);
    expect(out.candidates[0].earthInterval!.end - out.candidates[0].earthInterval!.start).toBeCloseTo(2 * hr, 6);
  });

  it('an exact-duration match also passes when the sunlit stretch itself is exactly the required length', () => {
    const sun = [win(0, 48)]; // exactly 48h, no slack at all
    const out = findWindowsCore(sun, [], 0, 48 * hr, 0);
    expect(out.candidates).toHaveLength(1);
    expect(out.candidates[0].start).toBeCloseTo(0, 6);
    expect(out.candidates[0].end).toBeCloseTo(48 * hr, 6);
  });

  it('zero Earth requirement returns the earliest start of each qualifying sunlit stretch', () => {
    const sun = [win(0, 50), win(200, 300)];
    const out = findWindowsCore(sun, [], 0, 48 * hr, 0, 3);
    expect(out.candidates.map((c) => c.start)).toEqual([0, 200 * hr]);
    expect(out.candidates.every((c) => c.earthInterval === null)).toBe(true);
  });

  it('reports the longest sunlit stretch as a lower bound when it is cut by the search boundary', () => {
    const sun = [win(0, 10), win(500, 600, false, true)]; // second window still sunlit at the search end
    const out = findWindowsCore(sun, [], 0, 1000 * hr, 0);
    expect(out.longestSunlitMs).toBeCloseTo(100 * hr, 6);
    expect(out.longestSunlitIsLowerBound).toBe(true);
  });

  it('insufficient sunlight anywhere: no candidates, sunlightSufficient is false, longest is reported', () => {
    const sun = [win(0, 10), win(100, 130)]; // longest is 30h
    const out = findWindowsCore(sun, [], 0, 48 * hr, 0);
    expect(out.candidates).toHaveLength(0);
    expect(out.sunlightSufficient).toBe(false);
    expect(out.longestSunlitMs).toBeCloseTo(30 * hr, 6);
  });

  it('shows one result per sunlit stretch, earliest first, capped at maxResults', () => {
    const sun = [win(0, 60), win(100, 160), win(200, 260), win(300, 360)];
    const out = findWindowsCore(sun, [], 0, 48 * hr, 0);
    expect(out.candidates).toHaveLength(3);
    expect(out.candidates.map((c) => c.start)).toEqual([0, 100 * hr, 200 * hr]);
  });
});
