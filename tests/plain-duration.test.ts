import { siteSummary } from '../src/ui/siteSummary';
import { computeMetrics } from '../src/astro/events';
import { SPHERE_HORIZON } from '../src/astro/horizon';
import { expect, it } from 'vitest';
import { fmtPlainDuration } from '../src/ui/format';
it('writes everyday durations without losing the displayed minute', () => {
  expect(fmtPlainDuration((11 * 1440 + 13 * 60 + 37) * 60000)).toBe('11 days, 13 hours, 37 minutes');
  expect(fmtPlainDuration(60000)).toBe('1 minute');
  expect(fmtPlainDuration(0)).toBe('less than a minute');
});

it('does not invent a zero-length night when no sunset was found', () => {
  const m = computeMetrics({ lat: 0, lon: 0 }, SPHERE_HORIZON, Date.parse('2026-11-14T09:04Z'));
  m.now.sunUp = true; m.next.sunset = null;
  const summary = siteSummary(m, { start: null, end: null, durationMs: 0, current: false, atLeast: false });
  expect(summary).toContain('No sunset was found');
  expect(summary).not.toContain('night of');
});

it('Simple mode ends the summary at the Earth percentage; Expert keeps the radio points', () => {
  const m = computeMetrics({ lat: 0, lon: 0 }, SPHERE_HORIZON, Date.parse('2026-11-14T09:04Z'));
  const night = { start: null, end: null, durationMs: 0, current: false, atLeast: false };
  const simple = siteSummary(m, night, { simple: true }), expert = siteSummary(m, night);
  expect(simple).toMatch(/Earth is visible \d+% of this date range\.$/);
  expect(simple).not.toContain('radio points');
  expect(expert).toContain('of 30 radio points.');
  expect(expert.startsWith(simple.slice(0, -1))).toBe(true);
});
