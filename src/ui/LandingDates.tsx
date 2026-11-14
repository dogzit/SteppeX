import { useEffect, useState } from 'react';
import { computeMetrics } from '@/astro';
import { useActiveSite, useStore } from '@/state/store';
import { useOptions } from '@/state/useMetrics';
import { useHorizon } from '@/state/useHorizon';
import { fmtDate } from './format';

/** Daily start-date comparison; astronomy and weights are shared with the main dashboard. */
export function LandingDates() {
  const site = useActiveSite(), hz = useHorizon(site), options = useOptions();
  const time = useStore((s) => s.timeMs), days = useStore((s) => s.windowDays), setTime = useStore((s) => s.setTime);
  const [open, setOpen] = useState(false), [count, setCount] = useState(14);
  const [rows, setRows] = useState<{ time: number; score: number }[]>([]), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    let cancelled = false; setRows([]); setBusy(true);
    void (async () => {
      const results: { time: number; score: number }[] = [];
      for (let i = 0; i <= count; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (cancelled) return;
        const start = time + i * 86400_000;
        results.push({ time: start, score: computeMetrics(site, hz, start, days, options).score.total });
      }
      if (!cancelled) { setRows(results); setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [open, count, site, hz, time, days, options]);
  const best = rows.length ? Math.max(...rows.map((r) => r.score)) : 0;
  return <details onToggle={(e) => setOpen(e.currentTarget.open)} className="border-t border-white/10 pt-3">
    <summary className="btn cursor-pointer">Compare landing dates</summary>
    <p className="text-sm text-haze my-2">Check daily start times with the same {days}-day mission and settings. This finds the best sampled date, not the best minute of every day.</p>
    <label className="flex gap-2 items-center text-sm">Days to look ahead<input aria-label="Days to compare landing dates" className="btn w-20" type="number" min={1} max={90} value={count} onChange={(e) => setCount(Math.max(1, Math.min(90, Number(e.target.value) || 1)))} /></label>
    <p role="status" className="text-sm text-haze my-2">{busy ? 'Comparing dates…' : rows.length ? `Best daily score: ${best.toFixed(0)}/100. Select a date to explore it.` : ''}</p>
    <div className="flex flex-wrap gap-2" aria-label="Scores by landing date">{rows.map((r) => <button key={r.time} className={`btn ${Math.round(r.score) === Math.round(best) ? 'btn-on' : ''}`} onClick={() => setTime(r.time)} aria-label={`${fmtDate(r.time)}: score ${r.score.toFixed(0)} of 100`} title={`${new Date(r.time).toISOString()} · score ${r.score.toFixed(1)}`}>
      {fmtDate(r.time).slice(5)} · {r.score.toFixed(0)}{Math.round(r.score) === Math.round(best) ? ' ★' : ''}
    </button>)}</div>
  </details>;
}
