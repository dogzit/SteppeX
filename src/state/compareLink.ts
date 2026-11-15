/**
 * The compare half of a shareable link, as pure string handling with no DOM.
 * `url.ts` wires it into the query string; these functions are what the unit tests exercise.
 */
export interface CompareScenarioUrl { siteId: string; custom: { lat: number; lon: number } | null; offsetDays: number }
export interface CompareUrlState { slipDays: number; scenarios: CompareScenarioUrl[] }

/**
 * Compare scenarios travel in one `cmp` parameter: items separated by commas, each
 * `<site-id>:<offset-days>`, with a custom pin written as `c<lat>_<lon>`. Site ids contain no
 * comma, colon or underscore, so the grammar stays unambiguous, and every character it uses is
 * legal unescaped in a query string — the link stays readable.
 */
export function formatCompare(c: CompareUrlState): string {
  return c.scenarios.slice(0, MAX_COMPARE).map((s) => {
    const token = s.siteId === 'custom' && s.custom ? `c${s.custom.lat.toFixed(4)}_${s.custom.lon.toFixed(4)}` : s.siteId;
    return `${token}:${Math.round(s.offsetDays)}`;
  }).join(',');
}
export function parseCompare(cmp: string | null, slip: string | null): CompareUrlState | undefined {
  if (!cmp) return undefined;
  const scenarios: CompareScenarioUrl[] = [];
  for (const item of cmp.split(',')) {
    const at = item.lastIndexOf(':');
    if (at <= 0) continue;
    const token = item.slice(0, at), off = Number(item.slice(at + 1));
    if (!Number.isFinite(off) || Math.abs(off) > 400) continue;
    if (token.startsWith('c') && token.includes('_')) {
      const [lat, lon] = token.slice(1).split('_').map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 360) continue;
      scenarios.push({ siteId: 'custom', custom: { lat, lon }, offsetDays: Math.round(off) });
    } else if (/^[a-z0-9-]+$/.test(token)) {
      scenarios.push({ siteId: token, custom: null, offsetDays: Math.round(off) });
    }
  }
  if (!scenarios.length) return undefined;
  const s = Number(slip);
  // Cap after validating, so one malformed item cannot push a good one off the end.
  return { slipDays: slip !== null && slip !== '' && Number.isFinite(s) ? Math.max(-14, Math.min(28, Math.round(s))) : 0, scenarios: scenarios.slice(0, MAX_COMPARE) };
}
const MAX_COMPARE = 4;
