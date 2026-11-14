import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { SITES } from '@/data/sites';
import { computeMetrics, SPHERE_HORIZON } from '@/astro';
import { useStore } from '@/state/store';
import { useOptions } from '@/state/useMetrics';
import { getLibraryHorizon } from '@/state/useHorizon';
import { useDialogFocus } from './useDialogFocus';
import { fmtDate } from './format';
import { yearDates, scoreBand } from './yearDates';

export function SiteDateHeatmap() {
  const [open, setOpen] = useState(false);
  return <><button className="btn" onClick={() => { if (useStore.getState().playing) useStore.getState().togglePlay(); setOpen(true); }}>Open year score map</button>{open && createPortal(<YearMap onClose={() => setOpen(false)} />, document.body)}</>;
}
function YearMap({ onClose }: { onClose: () => void }) {
  const ref = useDialogFocus();
  const time = useStore((s) => s.timeMs), days = useStore((s) => s.windowDays), ready = useStore((s) => s.horizonsReady), options = useOptions();
  const dates = useMemo(() => yearDates(time), [time]);
  const [rows, setRows] = useState<{ id: string; scores: number[]; terrain: boolean }[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  useEffect(() => {
    let cancelled = false; setRows([]); setError(false);
    void (async () => {
      try {
        for (const site of SITES) {
          const horizon = ready && getLibraryHorizon(site.id);
          const scores: number[] = [];
          for (const date of dates) {
            await new Promise((resolve) => setTimeout(resolve, 0));
            if (cancelled) return;
            scores.push(computeMetrics(site, horizon || SPHERE_HORIZON, date, days, options).score.total);
          }
          if (cancelled) return;
          setRows((r) => [...r, { id: site.id, scores, terrain: !!horizon }]);
        }
      } catch { if (!cancelled) setError(true); }
    })();
    return () => { cancelled = true; };
  }, [dates, days, options, ready]);
  const pick = (id: string, date: number) => { useStore.getState().selectSite(id); useStore.getState().setTime(date); onClose(); };
  return <div className="fixed inset-0 z-50 p-3 sm:p-6 grid place-items-center scrim">
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="year-map-title" className="glass rounded-2xl p-4 w-full max-w-6xl max-h-full overflow-y-auto space-y-3">
      <div className="flex justify-between gap-3"><h2 id="year-map-title" className="text-xl font-semibold">A year of landing dates</h2><button className="btn" onClick={onClose}>Close year map</button></div>
      <p className="text-sm text-haze">One sample per month, at your selected UTC time, for each library site. Every cell uses the same {days}-day mission, sunset rule and {options.earthMarginDeg}° radio clearance. These samples do not find the best minute or every short opportunity.</p>
      <p className="text-sm text-haze">Choose a numbered cell to explore that site and date. Higher scores mean a better match to these weights, especially at polar sites. A high score does not guarantee spacecraft survival.</p>
      <div className="flex flex-wrap gap-2 text-sm" aria-label="Score color legend">{(['low', 'medium', 'high'] as const).map((band) => <span key={band} className={`heat-${band} rounded-md px-2 py-1`}>{band === 'low' ? '0–39' : band === 'medium' ? '40–69' : '70–100'} points</span>)}</div>
      <p role="status" className="text-sm text-haze">{error ? 'The table could not finish. Close it and try again.' : rows.length < SITES.length ? `Calculating: ${rows.length} of ${SITES.length} sites ready. You can close this table at any time.` : `All ${SITES.length} sites ready.`}</p>
      <div className="overflow-auto rounded-lg border border-white/10 max-h-[62vh]" tabIndex={0} role="region" aria-label="Year score table. Scroll horizontally for more dates.">
        <table className="text-sm border-collapse w-full">
          <caption className="sr-only">Site scores for thirteen monthly landing dates over one year</caption>
          <thead><tr><th scope="col" className="text-left p-2 sticky left-0 bg-ink">Site</th>{dates.map((d) => <th scope="col" key={d} className="p-2 whitespace-nowrap num">{fmtDate(d)}</th>)}</tr></thead>
          <tbody>{rows.map((row) => { const site = SITES.find((s) => s.id === row.id)!; return <tr key={row.id} className="border-t border-white/10"><th scope="row" className="text-left p-2 sticky left-0 bg-ink min-w-48 max-w-64 font-normal">{site.name}{!row.terrain && <span className="block text-xs text-haze">Smooth-Moon estimate</span>}</th>{row.scores.map((score, i) => <td key={dates[i]} className="p-1"><button className={`heat-${scoreBand(score)} rounded-md w-full min-w-14 min-h-10 num`} onClick={() => pick(row.id, dates[i])} aria-label={`${site.name}, ${fmtDate(dates[i])}, score ${score.toFixed(0)} out of 100`} title={`Exact score ${score.toFixed(1)}. Open this site and date.`}>{score.toFixed(0)}</button></td>)}</tr>; })}</tbody>
        </table>
      </div>
    </div>
  </div>;
}
