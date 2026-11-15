/** DOM-free URL state parsing and value guards (unit-tested in tests/url.test.ts). */
export interface UrlState { siteId?: string; custom?: { lat: number; lon: number } | null; timeMs?: number; view?: 'globe' | 'polar' | 'horizon'; span?: 'day' | 'month' | 'year'; windowDays?: number; sunsetDef?: 'center' | 'limb'; earthMarginDeg?: number; mode?: 'planner' | 'explorer'; fwSunHours?: number; fwEarthHours?: number; fwSelStart?: number; fwSelEnd?: number }
/** Supported time range. Outside it the analytic ephemeris loses accuracy (and astronomy-engine throws for extreme dates). */
export const TIME_MIN_MS = Date.UTC(1900, 0, 1), TIME_MAX_MS = Date.UTC(2100, 11, 31, 23, 59, 59);
export const clampTime = (ms: number) => (Number.isFinite(ms) ? Math.min(TIME_MAX_MS, Math.max(TIME_MIN_MS, ms)) : Date.now());
/** Longitude to (-180, 180]. */
export const normLon = (lon: number) => { const l = ((((lon + 180) % 360) + 360) % 360) - 180; return l === -180 ? 180 : l; };
/** Pure parser (unit-tested). Invalid values are dropped, never passed on as NaN/Infinity. */
export function parseUrlState(search: string): UrlState {
  const q = new URLSearchParams(search), out: UrlState = {};
  const num = (k: string) => { const v = q.get(k); return v !== null && v.trim() !== '' && Number.isFinite(+v) ? +v : undefined; };
  const lat = num('lat'), lon = num('lon');
  if (lat !== undefined && lon !== undefined && Math.abs(lat) <= 90) { out.custom = { lat, lon: normLon(lon) }; out.siteId = 'custom'; } else if (q.get('site')) out.siteId = q.get('site')!;
  const t = q.get('t'); if (t) { const ms = Date.parse(t); if (Number.isFinite(ms)) out.timeMs = clampTime(ms); }
  const view = q.get('view'); if (view === 'globe' || view === 'polar' || view === 'horizon') out.view = view;
  const span = q.get('span'); if (span === 'day' || span === 'month' || span === 'year') out.span = span;
  const win = num('win'); if (win && win > 0 && win <= 400) out.windowDays = win;
  const sd = q.get('sunset'); if (sd === 'center' || sd === 'limb') out.sunsetDef = sd;
  const m = num('margin'); if (m !== undefined && m >= 0 && m <= 30) out.earthMarginDeg = m;
  const mode = q.get('mode'); if (mode === 'planner' || mode === 'explorer') out.mode = mode;
  const fwsun = num('fwsun'); if (fwsun !== undefined && fwsun > 0 && fwsun <= 24 * 90) out.fwSunHours = fwsun;
  const fwearth = num('fwearth'); if (fwearth !== undefined && fwearth >= 0 && fwearth <= 24 * 90) out.fwEarthHours = fwearth;
  const fwstart = q.get('fwstart'), fwend = q.get('fwend');
  if (fwstart && fwend) { const a = Date.parse(fwstart), b = Date.parse(fwend); if (Number.isFinite(a) && Number.isFinite(b) && b > a) { out.fwSelStart = clampTime(a); out.fwSelEnd = clampTime(b); } }
  return out;
}
