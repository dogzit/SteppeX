import { SCORE_WEIGHTS, type Metrics } from '@/astro';
import type { NightEstimate } from './scoreModel';
import { fmtPct, fmtPlainDuration } from './format';
/** Keep unknown, out-of-range events distinct from a zero-duration night.
 *  Simple mode leaves out the score's radio points; Expert mode keeps them. */
export function siteSummary(stats: Metrics, night: NightEstimate, { simple = false }: { simple?: boolean } = {}): string {
  const start = stats.window.startMs;
  let light: string;
  if (stats.now.sunUp && stats.next.sunset === null) light = 'Sunlight continues throughout the 400-day search. No sunset was found.';
  else if (stats.now.sunUp) light = `Sunlight for ${fmtPlainDuration(stats.next.sunset! - start)}, then a night of ${night.atLeast ? 'at least ' : ''}${fmtPlainDuration(night.durationMs)}.`;
  else light = stats.next.sunrise === null ? 'Dark now. No sunrise was found in the next 400 days.' : `Dark now; sunrise in ${fmtPlainDuration(stats.next.sunrise - start)}.`;
  const earth = `Earth is visible ${fmtPct(stats.window.earthFrac)} of this date range`;
  if (simple) return `${light} ${earth}.`;
  return `${light} ${earth}, earning ${(stats.score.comms * SCORE_WEIGHTS.comms).toFixed(1)} of 30 radio points.`;
}
