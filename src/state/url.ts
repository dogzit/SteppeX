/** Shareable URL state: ?site=id | ?lat=..&lon=.. ; t=ISO ; view ; span ; win ; sunset ; margin ; mode ; fwsun ; fwearth ; fwstart ; fwend */
import { parseUrlState, type UrlState } from './urlParse';
export { parseUrlState, clampTime, normLon, TIME_MIN_MS, TIME_MAX_MS, type UrlState } from './urlParse';
export function readUrlState(): UrlState {
  if (typeof window === 'undefined') return {};
  return parseUrlState(window.location.search);
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
  if (s.mode !== 'explorer') q.set('mode', s.mode);
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
