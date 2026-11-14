import type { Metrics } from '@/astro';
import { downloadFile as dl } from './download';
export interface ExportRow { label: string; lat: number; lon: number; landingUtc: string; slipDays: number; windowDays: number; horizon: string; metrics: Metrics }
export function exportJson(rows: ExportRow[]) {
  dl(`lunar-navigator-compare-${Date.now()}.json`, JSON.stringify({ generated: new Date().toISOString(), tool: 'Lunar Navigator', scoreFormula: '40*discFrac + 30*earthFrac + 15*continuity + 15*min(1, hoursToDark/72)', rows }, null, 1), 'application/json');
}
export function exportCsv(rows: ExportRow[]) {
  const h = ['label', 'lat', 'lon', 'landing_utc', 'slip_days', 'window_days', 'horizon', 'score', 'sunlit_frac', 'effective_sun_frac', 'earth_frac', 'both_frac', 'longest_sun_h', 'longest_dark_h', 'next_sunset_utc', 'next_sunrise_utc', 'next_earthset_utc', 'next_earthrise_utc', 'sun_el_now', 'earth_el_now'];
  const f = (t: number | null) => (t === null ? '' : new Date(t).toISOString());
  const lines = rows.map((r) => { const m = r.metrics; return [JSON.stringify(r.label), r.lat, r.lon, r.landingUtc, r.slipDays, r.windowDays, JSON.stringify(r.horizon), m.score.total.toFixed(1), m.window.sunlitFrac.toFixed(4), m.window.effectiveSunFrac.toFixed(4), m.window.earthFrac.toFixed(4), m.window.bothFrac.toFixed(4), (m.window.longestSunlitMs / 3600_000).toFixed(1), (m.window.longestDarkMs / 3600_000).toFixed(1), f(m.next.sunset), f(m.next.sunrise), f(m.next.earthset), f(m.next.earthrise), m.now.sunEl.toFixed(3), m.now.earthEl.toFixed(3)].join(','); });
  dl(`lunar-navigator-compare-${Date.now()}.csv`, [h.join(','), ...lines].join('\n'), 'text/csv');
}
