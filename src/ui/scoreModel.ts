import { nextEvents, refinedWindows, NEXT_EVENT_HORIZON_DAYS, type Metrics, type Options, type HorizonProfile, type Site } from '@/astro';
const DAY = 86400_000;
export const SCORE_REASONS = [
  ['Sunlight', 40, 'Sunlight is the main source of solar power.'],
  ['Earth view', 30, 'Seeing Earth allows a direct radio link.'],
  ['Steady sunlight', 15, 'Long, unbroken sunlight reduces interruptions.'],
  ['Time before sunset', 15, 'More time before darkness gives a mission room to prepare.'],
] as const;
export interface NightEstimate { start: number | null; end: number | null; durationMs: number; atLeast: boolean; current: boolean }
/** Display derivation only. It reuses the validated crossings and looks past mission boundaries. */
export function fullNight(site: Site, hz: HorizonProfile, time: number, options: Options, metrics: Metrics): NightEstimate {
  const current = !metrics.now.sunUp;
  const start = current ? (() => {
    const previous = refinedWindows(site, hz, 'sun', time - 45 * DAY, time, options);
    return previous.at(-1)?.end ?? null;
  })() : metrics.next.sunset;
  const end = current ? metrics.next.sunrise : start === null ? null : nextEvents(site, hz, start + 2000, options).sunrise;
  const durationMs = start !== null && end !== null ? end - start : current || start !== null ? (end ?? time + NEXT_EVENT_HORIZON_DAYS * DAY) - (start ?? time) : 0;
  return { start, end, durationMs, atLeast: (start === null || end === null) && (current || start !== null), current };
}
export function batteryCheck(batteryHours: number, windowDarkMs: number, night: NightEstimate) {
  const neededHours = Math.max(windowDarkMs, night.durationMs) / 3600_000;
  return { neededHours, enough: !night.atLeast && batteryHours >= neededHours, unknown: night.atLeast };
}
/** Leaders are based on the score precision shown to users, so displayed ties get equal badges. */
export function leadingScores(scores: { key: string; total: number }[]): Set<string> {
  const max = Math.max(...scores.map((s) => Math.round(s.total)));
  return new Set(scores.filter((s) => Math.round(s.total) === max).map((s) => s.key));
}
