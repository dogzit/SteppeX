import { expect, it } from 'vitest';
import { batteryCheck, leadingScores, fullNight } from '../src/ui/scoreModel';
import { computeMetrics, DEFAULT_OPTIONS } from '../src/astro/events';
import { SPHERE_HORIZON } from '../src/astro/horizon';
it('badges every displayed score tie', () => {
  expect([...leadingScores([{ key: 'a', total: 84.7 }, { key: 'b', total: 85.2 }, { key: 'c', total: 85.1 }, { key: 'd', total: 84 }])]).toEqual(['a', 'b', 'c']);
});
it('checks battery duration including the full night, not just the clipped mission', () => {
  const night = { start: 0, end: 100 * 3600_000, durationMs: 100 * 3600_000, atLeast: false, current: false };
  expect(batteryCheck(72, 12 * 3600_000, night).enough).toBe(false);
  expect(batteryCheck(100, 12 * 3600_000, night).enough).toBe(true);
  expect(batteryCheck(1000, 0, { ...night, atLeast: true }).enough).toBe(false);
});
it('looks past a short mission for the complete upcoming night', () => {
  const site = { lat: 0, lon: 0 }, time = Date.parse('2026-06-01T00:00Z');
  const m = computeMetrics(site, SPHERE_HORIZON, time, 1);
  const night = fullNight(site, SPHERE_HORIZON, time, DEFAULT_OPTIONS, m);
  expect(night.durationMs).toBeGreaterThan(10 * 86400_000);
  expect(night.atLeast).toBe(false);
});
