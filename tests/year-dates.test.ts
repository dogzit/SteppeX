import { expect, it } from 'vitest';
import { yearDates, scoreBand } from '../src/ui/yearDates';
it('samples thirteen months across a year and clamps month end while retaining the selected UTC minute', () => {
  const samples = yearDates(Date.parse('2028-01-31T09:04Z'));
  expect(samples).toHaveLength(13);
  expect(new Date(samples[1]).toISOString()).toBe('2028-02-29T09:04:00.000Z');
  expect(new Date(samples[2]).toISOString()).toBe('2028-03-31T09:04:00.000Z');
  expect(new Date(samples[12]).toISOString()).toBe('2029-01-31T09:04:00.000Z');
  expect(scoreBand(39.4)).toBe('low'); expect(scoreBand(39.9)).toBe('medium'); expect(scoreBand(40)).toBe('medium'); expect(scoreBand(70)).toBe('high');
});
