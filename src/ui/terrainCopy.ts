import type { HorizonProfile } from '@/astro';

/** Keep service diagnostics out of everyday explanations. Full source labels remain available in data notes. */
export function terrainSummary(horizon: HorizonProfile): string {
  if (/computing|loading/i.test(horizon.label)) return 'Checking nearby mountains and craters. Results may change when this finishes.';
  if (horizon.source !== 'lola') return 'Using a smooth Moon estimate. Terrain details are not available yet. Try refreshing to load them; nearby mountains may change these results.';
  return 'Terrain checked using NASA elevation maps. Small rocks and slopes may not appear in these maps.';
}
