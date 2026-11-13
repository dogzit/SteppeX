export const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');
export function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const s = Math.max(0, Math.round(ms / 1000)); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : h > 0 ? `${h}h ${pad(m)}m` : `${m}m ${pad(s % 60)}s`;
}
export function fmtCountdown(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const s = Math.max(0, Math.floor(ms / 1000)); const d = Math.floor(s / 86400);
  return `${d > 0 ? d + 'd ' : ''}${pad((s % 86400) / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
}
export const fmtDateTime = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + 'Z';
export const fmtDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const fmtPct = (f: number) => `${(f * 100).toFixed(0)}%`;
