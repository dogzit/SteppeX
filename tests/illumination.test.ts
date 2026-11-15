import { describe, expect, it } from 'vitest';
import { illuminationSlice, illuminationStats, rankPeaks, surfaceDistanceKm } from '../src/astro/illumination';
import { buildSeries, siteSeries } from '../src/astro/series';
import { SPHERE_HORIZON, type HorizonProfile } from '../src/astro/horizon';
import type { Visibility } from '../src/astro/events';

const HOUR = 3600_000;
/** A visibility run built by hand, so the slice arithmetic is checked without any ephemeris. */
function fakeVisibility(sunUp: number[], earthUp = sunUp, sunFrac = sunUp.map((v) => v)): Visibility {
  const n = sunUp.length;
  return {
    sunUp: Uint8Array.from(sunUp), earthUp: Uint8Array.from(earthUp), both: Uint8Array.from(sunUp.map((v, i) => v & earthUp[i])),
    sunFrac: Float32Array.from(sunFrac), sunClear: new Float32Array(n), earthClear: new Float32Array(n),
  };
}

describe('illuminationSlice', () => {
  it('counts shares and the longest unbroken runs', () => {
    const v = fakeVisibility([1, 1, 1, 0, 0, 1, 0, 0, 0, 1]);
    const s = illuminationSlice(v, 0, HOUR);
    expect(s.sunlitFrac).toBeCloseTo(0.5, 10);
    expect(s.earthFrac).toBeCloseTo(0.5, 10);
    expect(s.longestSunMs).toBe(3 * HOUR);
    expect(s.longestDarkMs).toBe(3 * HOUR);
  });

  it('restricts itself to the requested sample range', () => {
    const v = fakeVisibility([1, 1, 1, 1, 0, 0, 0, 0]);
    expect(illuminationSlice(v, 0, HOUR, 0, 4).sunlitFrac).toBe(1);
    expect(illuminationSlice(v, 0, HOUR, 4, 8).sunlitFrac).toBe(0);
    expect(illuminationSlice(v, 0, HOUR, 2, 6).sunlitFrac).toBeCloseTo(0.5, 10);
  });

  it('averages the visible disc fraction rather than the up/down flag', () => {
    const v = fakeVisibility([1, 1, 0, 0], [1, 1, 0, 0], [1, 0.5, 0, 0]);
    expect(illuminationSlice(v, 0, HOUR).meanSunFrac).toBeCloseTo(0.375, 6);
    expect(illuminationSlice(v, 0, HOUR).sunlitFrac).toBeCloseTo(0.5, 10);
  });

  it('is empty, not NaN, for an empty range', () => {
    const s = illuminationSlice(fakeVisibility([1, 0]), 0, HOUR, 1, 1);
    expect(s).toEqual({ sunlitFrac: 0, meanSunFrac: 0, earthFrac: 0, longestDarkMs: 0, longestSunMs: 0 });
  });

  it('clamps a range that runs past the end of the run', () => {
    expect(illuminationSlice(fakeVisibility([1, 1]), 0, HOUR, 0, 99).sunlitFrac).toBe(1);
  });
});

describe('illuminationStats over a real series', () => {
  it('gives an equatorial site close to half sunlight on a smooth sphere', () => {
    const t0 = Date.UTC(2026, 0, 1);
    // Two synodic months, so one whole lunar day falls inside the span whatever phase it starts on.
    const ss = siteSeries(buildSeries(t0, HOUR, 1418), { lat: 0, lon: 0 });
    const s = illuminationStats(ss, SPHERE_HORIZON);
    expect(s.sunlitFrac).toBeGreaterThan(0.45);
    expect(s.sunlitFrac).toBeLessThan(0.55);
    // One sunrise and one sunset per synodic month: a whole lunar day is about 14.8 Earth days.
    expect(s.longestSunMs / 86400_000).toBeGreaterThan(14);
    expect(s.longestSunMs / 86400_000).toBeLessThan(16);
    expect(s.longestDarkMs / 86400_000).toBeGreaterThan(14);
  });

  it('terrain cuts the sunlight an open horizon would have given', () => {
    const t0 = Date.UTC(2026, 0, 1);
    const ss = siteSeries(buildSeries(t0, HOUR, 1418), { lat: 0, lon: 0 });
    const open = illuminationStats(ss, SPHERE_HORIZON).sunlitFrac;
    // The Sun climbs high over the equator, so a 30 deg ring still lets a third of the month through.
    const ridge: HorizonProfile = { stepDeg: 1, el: new Float32Array(360).fill(30), source: 'lola', label: 'test ridge' };
    const cut = illuminationStats(ss, ridge).sunlitFrac;
    expect(cut).toBeGreaterThan(0.2);
    expect(cut).toBeLessThan(open);

    // Near the pole the Sun never climbs above about 1.5 deg, so a 5 deg rim all around is a
    // permanently shadowed region: dark for the whole span.
    const polar = siteSeries(buildSeries(t0, HOUR, 1418), { lat: -89.9, lon: 0 });
    const rim: HorizonProfile = { stepDeg: 1, el: new Float32Array(360).fill(5), source: 'lola', label: 'test rim' };
    expect(illuminationStats(polar, rim).sunlitFrac).toBe(0);
    expect(illuminationStats(polar, rim).longestDarkMs).toBe(1418 * HOUR); // windows() counts each sample as dt
    // The same place with an open horizon is lit for most of the month.
    expect(illuminationStats(polar, SPHERE_HORIZON).sunlitFrac).toBeGreaterThan(0.4);
  });
});

describe('rankPeaks', () => {
  const cell = (lat: number, lon: number, sunlitFrac: number) => ({ lat, lon, sunlitFrac });

  it('returns the brightest cells first', () => {
    const got = rankPeaks([cell(-89, 0, 0.4), cell(-89, 90, 0.9), cell(-89, 180, 0.7)], { count: 3, minSeparationKm: 0 });
    expect(got.map((c) => c.sunlitFrac)).toEqual([0.9, 0.7, 0.4]);
  });

  it('keeps results apart so one ridge cannot fill the list', () => {
    // Three samples of the same ridge within a kilometre, plus a genuinely separate place.
    const ridge = [cell(-89.9, 0, 0.95), cell(-89.9005, 0, 0.94), cell(-89.901, 0, 0.93)];
    const far = cell(-88.0, 120, 0.6);
    const got = rankPeaks([...ridge, far], { count: 4, minSeparationKm: 5 });
    expect(got).toHaveLength(2);
    expect(got[0].sunlitFrac).toBe(0.95);
    expect(got[1]).toEqual(far);
  });

  it('honours the count and the floor', () => {
    const cells = [cell(-89, 0, 0.9), cell(-88, 90, 0.8), cell(-87, 180, 0.2)];
    expect(rankPeaks(cells, { count: 2, minSeparationKm: 0 })).toHaveLength(2);
    expect(rankPeaks(cells, { count: 9, minSeparationKm: 0, minSunlitFrac: 0.5 })).toHaveLength(2);
  });

  it('is deterministic when cells tie', () => {
    const cells = [cell(-89, 10, 0.5), cell(-89, 5, 0.5), cell(-88, 7, 0.5)];
    const a = rankPeaks(cells, { count: 3, minSeparationKm: 0 }), b = rankPeaks([...cells].reverse(), { count: 3, minSeparationKm: 0 });
    expect(a).toEqual(b);
  });

  it('skips cells with no usable position', () => {
    expect(rankPeaks([{ lat: NaN, lon: 0, sunlitFrac: 1 }, { lat: -89, lon: 0, sunlitFrac: 0.3 }], { count: 2, minSeparationKm: 0 })).toHaveLength(1);
  });
});

describe('surfaceDistanceKm', () => {
  it('measures a degree of latitude as about 30 km on the Moon', () => {
    expect(surfaceDistanceKm(-89, 0, -88, 0)).toBeCloseTo(30.3, 1);
  });
  it('is zero for the same point and symmetric', () => {
    expect(surfaceDistanceKm(-89.5, 20, -89.5, 20)).toBe(0);
    expect(surfaceDistanceKm(-80, 0, -70, 40)).toBeCloseTo(surfaceDistanceKm(-70, 40, -80, 0), 9);
  });
});
