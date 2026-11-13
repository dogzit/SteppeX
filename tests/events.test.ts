import { describe, expect, it } from 'vitest';
import { computeMetrics, discFraction, nextEvents, windows } from '../src/astro/events';
import { SPHERE_HORIZON } from '../src/astro/horizon';
import { skyAt } from '../src/astro/topocentric';

const H = SPHERE_HORIZON;
describe('disc fraction', () => {
  it('is 0 / 0.5 / 1 at -r / 0 / +r', () => { expect(discFraction(-0.27, 0.27)).toBeCloseTo(0, 6); expect(discFraction(0, 0.27)).toBeCloseTo(0.5, 6); expect(discFraction(0.27, 0.27)).toBeCloseTo(1, 6); });
});
describe('windows', () => {
  it('finds runs with open edges', () => {
    const w = windows(new Uint8Array([1, 1, 0, 0, 1, 0, 1]), 0, 10);
    expect(w).toEqual([{ start: 0, end: 20, openStart: true, openEnd: false }, { start: 40, end: 50, openStart: false, openEnd: false }, { start: 60, end: 70, openStart: false, openEnd: true }]);
  });
});
describe('historical sanity (smooth-sphere horizon)', () => {
  it('Apollo 11 landed in local morning with the Sun ~10° up, and Earth high in the sky', () => {
    const s = skyAt({ lat: 0.67408, lon: 23.47297 }, new Date('1969-07-20T20:17:40Z'));
    expect(s.sun.el).toBeGreaterThan(8); expect(s.sun.el).toBeLessThan(14); expect(s.earth.el).toBeGreaterThan(55);
  });
  it('Blue Ghost M1 (landed 2025-03-02) saw sunset around 2025-03-16', () => {
    const ev = nextEvents({ lat: 18.562, lon: 61.81 }, H, Date.parse('2025-03-02T08:34:00Z'));
    expect(ev.sunset).not.toBeNull();
    const d = new Date(ev.sunset!).toISOString().slice(0, 10);
    expect(['2025-03-15', '2025-03-16', '2025-03-17']).toContain(d);
  });
  it('Chandrayaan-3 landed shortly after local sunrise (Sun low, rising) on 2023-08-23', () => {
    const t = Date.parse('2023-08-23T12:32:00Z');
    const s = skyAt({ lat: -69.3733, lon: 32.3186 }, new Date(t));
    expect(s.sun.el).toBeGreaterThan(2); expect(s.sun.el).toBeLessThan(12);
    const ev = nextEvents({ lat: -69.3733, lon: 32.3186 }, H, t);
    expect((ev.sunset! - t) / 86400_000).toBeGreaterThan(10); expect((ev.sunset! - t) / 86400_000).toBeLessThan(15);
  });
  it('equatorial site is sunlit ~50% of a lunar month and never loses Earth on the near side', () => {
    const m = computeMetrics({ lat: 0, lon: 0 }, H, Date.parse('2026-06-01T00:00:00Z'), 29.53);
    expect(m.window.sunlitFrac).toBeGreaterThan(0.47); expect(m.window.sunlitFrac).toBeLessThan(0.53);
    expect(m.window.earthFrac).toBe(1); expect(m.next.earthset).toBeNull();
  });
  it('far side (Chang\'e-4) never sees Earth', () => {
    const m = computeMetrics({ lat: -45.4446, lon: 177.5991 }, H, Date.parse('2026-06-01T00:00:00Z'), 29.53);
    expect(m.window.earthFrac).toBe(0); expect(m.score.comms).toBe(0);
  });
  it('south pole: Earth visibility follows libration in latitude (both up and down within a month)', () => {
    const m = computeMetrics({ lat: -89.5, lon: 0 }, H, Date.parse('2026-06-01T00:00:00Z'), 29.53);
    expect(m.window.earthFrac).toBeGreaterThan(0.2); expect(m.window.earthFrac).toBeLessThan(0.8);
    expect(m.score.total).toBeGreaterThan(0); expect(m.score.total).toBeLessThanOrEqual(100);
  });
});
