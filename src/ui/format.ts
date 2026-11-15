export const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');
export function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const s = Math.max(0, Math.round(ms / 1000)); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : h > 0 ? `${h}h ${pad(m)}m` : `${m}m ${pad(s % 60)}s`;
}
/** Shorter fmtDuration for tight one-line labels: days and hours ("11d 3h"), hours and minutes ("5h 20m"), or
 *  minutes alone ("45m", and "0m" under a minute). No zero padding. Smaller units are cut off, not rounded, so each
 *  number shown equals the same number in fmtDuration ("11d 03h 22m" -> "11d 3h", "0m 30s" -> "0m"). */
export function fmtDurationShort(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const s = Math.max(0, Math.round(ms / 1000)); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}
export function fmtCountdown(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const s = Math.max(0, Math.floor(ms / 1000)); const d = Math.floor(s / 86400);
  return `${d > 0 ? d + 'd ' : ''}${pad((s % 86400) / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
}
export const fmtDateTime = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + 'Z';
export const fmtDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const fmtPct = (f: number) => `${(f * 100).toFixed(0)}%`;

/** Everyday summary wording; Expert measurements keep their compact precision display. */
export function fmtPlainDuration(ms: number): string {
  if (!Number.isFinite(ms)) return 'an unknown amount of time';
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes === 0) return 'less than a minute';
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), rest = minutes % 60;
  return [[days, 'day'], [hours, 'hour'], [rest, 'minute']].filter(([n]) => Number(n) > 0).map(([n, unit]) => `${n} ${unit}${n === 1 ? '' : 's'}`).join(', ');
}
