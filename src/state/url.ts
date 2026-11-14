/** Shareable URL state: ?site=id | ?lat=..&lon=.. ; t=ISO ; view ; span ; win ; sunset ; margin ; mode ; fwsun ; fwearth ; fwstart ; fwend */
export interface UrlState { siteId?: string; custom?: { lat: number; lon: number } | null; timeMs?: number; view?: 'globe' | 'polar' | 'horizon'; span?: 'day' | 'month' | 'year'; windowDays?: number; sunsetDef?: 'center' | 'limb'; earthMarginDeg?: number; mode?: 'planner' | 'explorer'; fwSunHours?: number; fwEarthHours?: number; fwSelStart?: number; fwSelEnd?: number }
export function readUrlState(): UrlState {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search), out: UrlState = {};
  const num = (k: string) => { const v = q.get(k); return v !== null && v !== '' && !Number.isNaN(+v) ? +v : undefined; };
  const lat = num('lat'), lon = num('lon');
  if (lat !== undefined && lon !== undefined) { out.custom = { lat, lon }; out.siteId = 'custom'; } else if (q.get('site')) out.siteId = q.get('site')!;
  const t = q.get('t'); if (t) { const ms = Date.parse(t); if (!Number.isNaN(ms)) out.timeMs = ms; }
  const view = q.get('view'); if (view === 'globe' || view === 'polar' || view === 'horizon') out.view = view;
  const span = q.get('span'); if (span === 'day' || span === 'month' || span === 'year') out.span = span;
  const win = num('win'); if (win && win > 0 && win <= 400) out.windowDays = win;
  const sd = q.get('sunset'); if (sd === 'center' || sd === 'limb') out.sunsetDef = sd;
  const m = num('margin'); if (m !== undefined) out.earthMarginDeg = m;
  const mode = q.get('mode'); if (mode === 'planner' || mode === 'explorer') out.mode = mode;
  const fwsun = num('fwsun'); if (fwsun !== undefined && fwsun > 0) out.fwSunHours = fwsun;
  const fwearth = num('fwearth'); if (fwearth !== undefined && fwearth >= 0) out.fwEarthHours = fwearth;
  const fwstart = q.get('fwstart'), fwend = q.get('fwend');
  if (fwstart && fwend) { const a = Date.parse(fwstart), b = Date.parse(fwend); if (!Number.isNaN(a) && !Number.isNaN(b)) { out.fwSelStart = a; out.fwSelEnd = b; } }
  return out;
}
export function writeUrlState(s: Required<Pick<UrlState, 'siteId' | 'custom' | 'timeMs' | 'view' | 'span' | 'windowDays' | 'sunsetDef' | 'earthMarginDeg' | 'mode'>> & { fwSunHours?: number; fwEarthHours?: number; fwSelStart?: number | null; fwSelEnd?: number | null }) {
  const q = new URLSearchParams();
  if (s.siteId === 'custom' && s.custom) { q.set('lat', s.custom.lat.toFixed(4)); q.set('lon', s.custom.lon.toFixed(4)); } else q.set('site', s.siteId);
  q.set('t', new Date(s.timeMs).toISOString().slice(0, 16) + 'Z');
  if (s.view !== 'globe') q.set('view', s.view);
  if (s.span !== 'month') q.set('span', s.span);
  if (s.windowDays !== 14) q.set('win', String(s.windowDays));
  if (s.sunsetDef !== 'center') q.set('sunset', s.sunsetDef);
  if (s.earthMarginDeg !== 5) q.set('margin', String(s.earthMarginDeg));
  if (s.mode !== 'planner') q.set('mode', s.mode);
  // find-a-window: omitted entirely at defaults / unset, so untouched sessions keep the existing link shape
  if (s.fwSunHours !== undefined && s.fwSunHours !== 48) q.set('fwsun', String(s.fwSunHours));
  if (s.fwEarthHours !== undefined && s.fwEarthHours !== 2) q.set('fwearth', String(s.fwEarthHours));
  if (s.fwSelStart !== undefined && s.fwSelEnd !== undefined && s.fwSelStart !== null && s.fwSelEnd !== null) {
    q.set('fwstart', new Date(s.fwSelStart).toISOString());
    q.set('fwend', new Date(s.fwSelEnd).toISOString());
  }
  const url = `${window.location.pathname}?${q.toString()}`;
  if (url !== window.location.pathname + window.location.search) window.history.replaceState(null, '', url);
}
