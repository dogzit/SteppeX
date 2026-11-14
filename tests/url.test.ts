import { describe, expect, it } from 'vitest';
import { parseUrlState, clampTime, normLon, TIME_MAX_MS, TIME_MIN_MS } from '../src/state/urlParse';

describe('shareable URL parsing never yields NaN, Infinity or out-of-range values', () => {
  it('rejects invalid custom coordinates', () => {
    for (const q of ['?lat=Infinity&lon=0', '?lat=91&lon=0', '?lat=-91&lon=10', '?lat=abc&lon=0', '?lat=&lon=0', '?lat=10&lon=NaN']) {
      expect(parseUrlState(q).custom, q).toBeUndefined();
    }
  });
  it('accepts the poles and wraps longitude', () => {
    expect(parseUrlState('?lat=-90&lon=0').custom).toEqual({ lat: -90, lon: 0 });
    expect(parseUrlState('?lat=10&lon=540').custom).toEqual({ lat: 10, lon: 180 });
    expect(parseUrlState('?lat=10&lon=-180').custom).toEqual({ lat: 10, lon: 180 });
    expect(normLon(359)).toBe(-1);
  });
  it('clamps extreme times instead of crashing the ephemeris', () => {
    expect(parseUrlState('?t=%2B275760-09-13T00:00:00Z').timeMs).toBe(TIME_MAX_MS);
    expect(parseUrlState('?t=-000100-01-01T00:00:00Z').timeMs).toBe(TIME_MIN_MS);
    expect(parseUrlState('?t=garbage').timeMs).toBeUndefined();
    expect(clampTime(Number.NaN)).toBeGreaterThan(TIME_MIN_MS);
  });
  it('drops out-of-range settings', () => {
    const s = parseUrlState('?margin=1e9&fwsun=-5&fwearth=1e12&win=-3&fwstart=2026-01-02T00:00Z&fwend=2026-01-01T00:00Z');
    expect(s.earthMarginDeg).toBeUndefined(); expect(s.fwSunHours).toBeUndefined(); expect(s.fwEarthHours).toBeUndefined();
    expect(s.windowDays).toBeUndefined(); expect(s.fwSelStart).toBeUndefined();
  });
});
