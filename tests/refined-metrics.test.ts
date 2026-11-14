import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeMetrics, clearanceAt, DEFAULT_OPTIONS } from '../src/astro/events';
import { SPHERE_HORIZON, type HorizonProfile } from '../src/astro/horizon';
import { SITES } from '../src/data/sites';
const raw = JSON.parse(readFileSync('public/data/horizons.json', 'utf8'));
const start = Date.parse('2026-11-14T09:04:00Z'), day = 86400_000;
const options = { ...DEFAULT_OPTIONS, earthMarginDeg: 0 };
function metrics(id: string) {
  const site = SITES.find((s) => s.id === id)!;
  const hz: HorizonProfile = { ...raw[id], source: 'lola', el: Float32Array.from(raw[id].el) };
  return { site, hz, m: computeMetrics(site, hz, start, 14, options) };
}
describe('mission statistics from refined, clipped event spans', () => {
  for (const id of ['glaser-c1', 'glaser-s', 'artemis-cr', 'artemis-pns']) {
    it(`${id}: spans fit exact mission limits and sunlight plus darkness partitions the window`, () => {
      const { m } = metrics(id), w = m.window;
      expect(w.startMs).toBe(start); expect(w.endMs).toBe(start + 14 * day);
      expect(w.longestSunlitMs).toBeLessThanOrEqual(14 * day);
      expect(w.longestDarkMs).toBeLessThanOrEqual(14 * day);
      const total = [...w.sunWindows, ...w.darkWindows].reduce((s, x) => s + x.end - x.start, 0);
      expect(total).toBeCloseTo(14 * day, 2);
      for (const span of [...w.sunWindows, ...w.darkWindows, ...w.earthWindows]) {
        expect(span.start).toBeGreaterThanOrEqual(start); expect(span.end).toBeLessThanOrEqual(w.endMs);
        expect(span.end).toBeGreaterThan(span.start);
      }
    });
  }
  it('Connecting Ridge: first sunlit stretch equals time until refined sunset', () => {
    const { m } = metrics('artemis-cr');
    expect(m.now.sunUp).toBe(true);
    expect(Math.abs(m.window.longestSunlitMs - (m.next.sunset! - start))).toBeLessThan(1100);
    expect(Math.abs(m.window.longestSunlitMs / 60000 - (11 * 1440 + 13 * 60 + 37))).toBeLessThan(2);
  });
  it('Peak Near Shackleton: longest sun and initial night use refined crossings', () => {
    const { m } = metrics('artemis-pns');
    expect(Math.abs(m.window.longestSunlitMs / 60000 - (11 * 1440 + 3 * 60 + 55))).toBeLessThan(2);
    expect(Math.abs(m.window.longestDarkMs - (m.next.sunrise! - start))).toBeLessThan(1100);
    expect(Math.abs(m.window.longestDarkMs / 60000 - (2 * 1440 + 14 * 60 + 26))).toBeLessThan(2);
  });
  it('Earth windows start at refined Earthrise and end no later than the mission end', () => {
    for (const id of ['artemis-cr', 'artemis-pns']) {
      const { site, hz, m } = metrics(id);
      for (const span of m.window.earthWindows) {
        if (!span.openStart) {
          expect(Math.abs(span.start - m.next.earthrise!)).toBeLessThan(1100);
          expect(clearanceAt(site, hz, 'earth', span.start - 2000, options)).toBeLessThan(0);
          expect(clearanceAt(site, hz, 'earth', span.start + 2000, options)).toBeGreaterThan(0);
        }
        expect(span.end).toBeLessThanOrEqual(m.window.endMs);
      }
    }
  });
  it('a custom midlatitude site has no padded final bin and continuity follows the exact run', () => {
    const m = computeMetrics({ lat: 11.873, lon: 45.655 }, SPHERE_HORIZON, start, 14, options);
    if (m.now.sunUp && m.next.sunset! < m.window.endMs) expect(Math.abs(m.window.longestSunlitMs - (m.next.sunset! - start))).toBeLessThan(1100);
    expect(m.score.continuity).toBeCloseTo(100 * m.window.longestSunlitMs / (14 * day), 8);
  });
});
