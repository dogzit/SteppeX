import { useState } from 'react';
import { useMetrics } from '@/state/useMetrics';
import { useStore, useActiveSite } from '@/state/store';
import { fmtLat, fmtLon } from '@/data/sites';
import { fmtCountdown, fmtDateTime, fmtDuration, fmtPct } from './format';
import { SCORE_WEIGHTS } from '@/astro';

const CONF: Record<string, [string, string]> = { high: ['Verified', 'text-emerald-300 border-emerald-400/30'], medium: ['Published · limited precision', 'text-sky-300 border-sky-400/30'], approx: ['Approximate region', 'text-rose-300 border-rose-400/30'] };

export function Dashboard() {
  const site = useActiveSite();
  const { timeMs, setTime, windowDays, setWindowDays, sunsetDef, setSunsetDef, earthMarginDeg, setEarthMargin } = useStore();
  const { stats, live, horizon } = useMetrics();
  const [showFormula, setShowFormula] = useState(false);
  const conf = site.record ? CONF[site.record.confidence] : ['Custom input', 'text-white/70 border-white/20'];
  const score = stats.score;
  const tone = score.total >= 70 ? 'text-emerald-300' : score.total >= 40 ? 'text-solar' : 'text-rose-300';
  const dte = stats.window.earthWindows.filter((w) => w.end > timeMs).slice(0, 4);
  return (
    <aside className="absolute right-4 top-28 bottom-36 z-20 w-[25rem] glass rounded-xl flex flex-col overflow-hidden" aria-label="Power and communications dashboard">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="label">Selected site</div>
            <h2 className="text-lg font-semibold leading-tight truncate" title={site.name}>{site.name}</h2>
            <div className="num text-xs text-haze mt-0.5">{fmtLat(site.lat)} · {fmtLon(site.lon)}{site.heightKm ? ` · h ${site.heightKm.toFixed(2)} km` : ''}</div>
          </div>
          <span className={`label border rounded-full px-2 py-0.5 shrink-0 ${conf[1]}`}>{conf[0]}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section aria-label="Mission viability score" className="flex items-center gap-4">
          <div>
            <div className="label">Viability · next {windowDays} d</div>
            <div className={`num text-5xl leading-none ${tone}`}>{score.total.toFixed(0)}<span className="text-base text-white/40">/100</span></div>
          </div>
          <div className="flex-1 space-y-1">
            {([['Power', score.power, SCORE_WEIGHTS.power, '#ffb547'], ['Comms', score.comms, SCORE_WEIGHTS.comms, '#5fc3ff'], ['Continuity', score.continuity, SCORE_WEIGHTS.continuity, '#9ef0c0'], ['Margin', score.margin, SCORE_WEIGHTS.margin, '#e7edf5']] as const).map(([l, v, w, c]) => (
              <div key={l} className="flex items-center gap-2 text-[10px]"><span className="label w-16">{l} <span className="text-white/35">{(w * 100).toFixed(0)}%</span></span><div className="flex-1 h-1.5 bg-white/8 rounded"><div className="h-full rounded" style={{ width: `${v}%`, background: c }} /></div><span className="num w-7 text-right">{v.toFixed(0)}</span></div>
            ))}
            <button className="label normal-case tracking-normal text-white/50 hover:text-white/80 underline decoration-dotted" onClick={() => setShowFormula((v) => !v)} aria-expanded={showFormula}>{showFormula ? 'hide formula' : 'how is this computed?'}</button>
            {showFormula && <p className="text-[11px] text-white/65 leading-snug">score = 40·(mean illuminated fraction of the solar disc) + 30·(fraction of time Earth ≥ {earthMarginDeg}° above the terrain horizon) + 15·(longest continuous sunlight ÷ window) + 15·min(1, hours until the next loss of sunlight ÷ 72). Window starts at the current time.</p>}
          </div>
        </section>
        <section className="grid grid-cols-2 gap-x-4 gap-y-3" aria-label="Live metrics">
          <Metric label="Sun elevation" value={`${live.sun.el.toFixed(2)}°`} sub={`az ${live.sun.az.toFixed(1)}° · horizon ${live.sunHorizon.toFixed(2)}°`} tone={live.sunUp ? 'text-solar' : 'text-white/45'} />
          <Metric label="Solar disc visible" value={fmtPct(live.sunFrac)} sub={live.sunUp ? 'sunlit' : 'in shadow'} tone={live.sunUp ? 'text-solar' : 'text-white/45'} />
          <Metric label={live.sunUp ? 'T-minus sunset' : 'T-minus sunrise'} value={fmtCountdown((live.sunUp ? stats.next.sunset : stats.next.sunrise) !== null ? (live.sunUp ? stats.next.sunset! : stats.next.sunrise!) - timeMs : NaN)} sub={(live.sunUp ? stats.next.sunset : stats.next.sunrise) !== null ? fmtDateTime(live.sunUp ? stats.next.sunset! : stats.next.sunrise!) : 'none within 400 d'} tone="text-white" live />
          <Metric label={live.sunUp ? 'Next sunrise after' : 'Next sunset after'} value={stats.next.sunrise !== null && stats.next.sunset !== null ? fmtDuration((live.sunUp ? stats.next.sunrise : stats.next.sunset) - timeMs) : '—'} sub={live.sunUp ? (stats.next.sunrise ? fmtDateTime(stats.next.sunrise) : 'none within 400 d') : (stats.next.sunset ? fmtDateTime(stats.next.sunset) : 'none within 400 d')} tone="text-white/85" />
          <Metric label={`Sunlight · ${windowDays} d`} value={fmtPct(stats.window.sunlitFrac)} sub={`effective ${fmtPct(stats.window.effectiveSunFrac)} (disc-weighted)`} tone="text-solar" />
          <Metric label="Longest continuous sun" value={fmtDuration(stats.window.longestSunlitMs)} sub={`longest dark ${fmtDuration(stats.window.longestDarkMs)}`} tone="text-solar" />
          <Metric label="Earth elevation" value={`${live.earth.el.toFixed(2)}°`} sub={`az ${live.earth.az.toFixed(1)}° · disc ${(2 * live.earth.radiusDeg).toFixed(2)}°`} tone={live.earthUp ? 'text-earth' : 'text-white/45'} />
          <Metric label={live.earthUp ? 'T-minus Earthset' : 'T-minus Earthrise'} value={fmtCountdown((live.earthUp ? stats.next.earthset : stats.next.earthrise) !== null ? (live.earthUp ? stats.next.earthset! : stats.next.earthrise!) - timeMs : NaN)} sub={(live.earthUp ? stats.next.earthset : stats.next.earthrise) !== null ? fmtDateTime(live.earthUp ? stats.next.earthset! : stats.next.earthrise!) : live.earthUp ? 'Earth stays up ≥ 400 d' : 'no Earthrise within 400 d'} tone="text-earth" live />
          <Metric label={`Earth visible · ${windowDays} d`} value={fmtPct(stats.window.earthFrac)} sub={`power + DTE ${fmtPct(stats.window.bothFrac)}`} tone="text-earth" />
        </section>
        <section aria-label="Direct-to-Earth windows">
          <div className="label mb-1">DTE windows (next in window)</div>
          {dte.length === 0 ? <div className="text-xs text-white/50">No Earth visibility in the next {windowDays} days.</div> : (
            <ul className="space-y-1">{dte.map((w, i) => (
              <li key={i} className="flex items-center justify-between text-[11px] num"><button className="hover:text-earth text-left" onClick={() => setTime(Math.max(w.start, timeMs))}>{w.openStart ? '… ' : ''}{fmtDateTime(w.start)} → {fmtDateTime(w.end)}{w.openEnd ? ' …' : ''}</button><span className="text-earth">{fmtDuration(w.end - w.start)}</span></li>
            ))}</ul>
          )}
        </section>
        <section className="grid grid-cols-3 gap-2 items-end" aria-label="Analysis options">
          <label className="flex flex-col"><span className="label">Window · days</span><input type="number" min={1} max={400} className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={windowDays} onChange={(e) => { const v = +e.target.value; if (v >= 1 && v <= 400) setWindowDays(v); }} /></label>
          <label className="flex flex-col"><span className="label">Sunset = </span><select className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={sunsetDef} onChange={(e) => setSunsetDef(e.target.value as 'center' | 'limb')}><option value="center">disc centre</option><option value="limb">last limb</option></select></label>
          <label className="flex flex-col"><span className="label">Earth mask °</span><input type="number" min={0} max={30} step={0.5} className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={earthMarginDeg} onChange={(e) => setEarthMargin(+e.target.value)} /></label>
        </section>
        <p className="label normal-case tracking-normal text-white/45 leading-snug">Horizon: {horizon.label}. {site.record?.note ?? ''} Source: {site.record?.source ?? 'user input'}.</p>
      </div>
    </aside>
  );
}
function Metric({ label, value, sub, tone, live }: { label: string; value: string; sub: string; tone: string; live?: boolean }) {
  return <div><div className="label">{label}</div><div className={`num text-[22px] leading-none mt-0.5 ${tone}`} aria-live={live ? 'off' : undefined}>{value}</div><div className="num text-[10px] text-white/45 mt-1 truncate" title={sub}>{sub}</div></div>;
}
