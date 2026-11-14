import { useMemo, useState } from 'react';
import { useMetrics } from '@/state/useMetrics';
import { useStore, useActiveSite } from '@/state/store';
import { fmtLat, fmtLon } from '@/data/sites';
import { fmtCountdown, fmtDate, fmtDateTime, fmtDuration, fmtPct } from './format';
import { SCORE_WEIGHTS, MARGIN_BATTERY_HOURS, NEXT_EVENT_HORIZON_DAYS, subPoints } from '@/astro';
import { fullNight, batteryCheck, SCORE_REASONS } from './scoreModel';
import { LandingDates } from './LandingDates';
import { useOptions } from '@/state/useMetrics';
import { SkyTable } from './SkyTable';
import { ExplorerCallouts } from './Explorer';
import { FindWindowPanel } from './FindWindowPanel';

const CONF: Record<string, [string, string]> = { high: ['Verified', 'text-emerald-300 border-emerald-400/30'], medium: ['Published · limited precision', 'text-sky-300 border-sky-400/30'], approx: ['Approximate region', 'text-rose-300 border-rose-400/30'] };
const NONE_WITHIN = `none within ${NEXT_EVENT_HORIZON_DAYS} d`;

export function Dashboard({ explorer = false, compact = false, onClose }: { explorer?: boolean; compact?: boolean; onClose?: () => void }) {
  const site = useActiveSite();
  const { timeMs, setTime, windowDays, setWindowDays, sunsetDef, setSunsetDef, earthMarginDeg, setEarthMargin } = useStore();
  const { stats, live, horizon } = useMetrics();
  const [showFormula, setShowFormula] = useState(false);
  const conf = site.record ? CONF[site.record.confidence] : ['Custom input', 'text-white/70 border-white/20'];
  const options = useOptions();
  const night = useMemo(() => fullNight(site, horizon, timeMs, options, stats), [site, horizon, timeMs, options, stats]);
  const [batteryHours, setBatteryHours] = useState(72);
  const battery = batteryCheck(batteryHours, stats.window.longestDarkMs, night);
  const score = stats.score;
  const tone = score.total >= 70 ? 'text-emerald-300' : score.total >= 40 ? 'text-solar' : 'text-rose-300';
  const dte = stats.window.earthWindows.filter((w) => w.end > timeMs).slice(0, 4);
  const lib = useMemo(() => subPoints(new Date(timeMs)).subEarth, [timeMs]);
  // The next transition is computed exactly at the selected timestamp (useMetrics falls back to a fresh
  // recompute at `timeMs` whenever the hour-bucketed cache's events have already passed it) — see
  // src/state/useMetrics.ts. "Time to next transition" and "longest continuous darkness" are deliberately
  // two separate computations: the first is a bisection-refined instant from nextEvents(); the second is
  // the longest run in stats.window.sunWindows/darkWindows over the whole mission window. Neither
  // approximates the other.
  const nextSunTransition = live.sunUp ? stats.next.sunset : stats.next.sunrise;
  const windowLabel = `Mission window · ${windowDays} ${windowDays === 1 ? 'day' : 'days'} · ${fmtDate(stats.window.startMs)} → ${fmtDate(stats.window.endMs)}`;
  const scoreRows = [
    ['Power', score.power, SCORE_WEIGHTS.power, '#ffb547'],
    ['Comms', score.comms, SCORE_WEIGHTS.comms, '#5fc3ff'],
    ['Continuity', score.continuity, SCORE_WEIGHTS.continuity, '#9ef0c0'],
    ['Margin', score.margin, SCORE_WEIGHTS.margin, '#e7edf5'],
  ] as const;

  return (
    <aside className={compact ? 'compact-drawer absolute inset-x-4 top-28 bottom-36 z-30 glass rounded-xl flex flex-col overflow-hidden' : 'absolute right-4 top-28 bottom-36 z-20 w-[25rem] max-w-[calc(100vw-2rem)] glass rounded-xl flex flex-col overflow-hidden'} aria-label="Power and communications dashboard">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="label">Selected site</div>
            <h2 className="text-lg font-semibold leading-tight truncate" title={site.name}>{site.name}</h2>
            <div className="num text-xs text-haze mt-0.5">{fmtLat(site.lat)} · {fmtLon(site.lon)}{site.heightKm ? ` · h ${site.heightKm.toFixed(2)} km` : ''}</div>
            <div className="num text-[10px] text-white/45" title="Sub-Earth point: selenographic latitude/longitude of the point where Earth is overhead">libration · sub-Earth {lib.lat.toFixed(2)}° {lib.lon.toFixed(2)}°</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`label border rounded-full px-2 py-0.5 ${conf[1]}`}>{conf[0]}</span>
            {onClose && <button className="btn" onClick={onClose} aria-label="Close site details">✕</button>}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {explorer && <ExplorerCallouts />}
        <section aria-label="Mission viability score" className="space-y-2">
          <div className="label">{windowLabel}</div>
          <div className="flex items-start gap-4">
            <div>
              <div className="label">Viability</div>
              <div className={`num text-5xl leading-none ${tone}`}>{score.total.toFixed(0)}<span className="text-base text-white/40">/100</span></div>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {/* Conditions at the selected time, separate from the window score above: the next terrain-aware
                  transition after `timeMs` (live.sunUp and nextSunTransition both resolve exactly at timeMs). */}
              <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${live.sunUp ? 'bg-solar/15 text-solar' : 'bg-white/8 text-white/70'}`}>
                <span aria-hidden>{live.sunUp ? '☀' : '☾'}</span>
                <span>{live.sunUp ? 'Sunlit now' : 'Dark now'} · {live.sunUp ? 'sunset' : 'sunrise'} in {nextSunTransition !== null ? fmtDuration(nextSunTransition - timeMs) : NONE_WITHIN}</span>
              </div>
              {score.margin === 0 && (
                <p className="text-[11px] text-rose-300 leading-snug">
                  Zero margin points: this site is dark at the selected time. The longest continuous darkness in this window is <b>{fmtDuration(stats.window.longestDarkMs)}</b>, The margin score uses a {MARGIN_BATTERY_HOURS} h sunlight lead-time target.
                </p>
              )}
              {scoreRows.map(([l, v, w, c]) => {
                const possible = w * 100, earned = v * w;
                return (
                  <div key={l} className="flex items-center gap-2 text-[10px]">
                    <span className="label w-16 shrink-0">{l}</span>
                    <div className="flex-1 h-1.5 bg-white/8 rounded"><div className="h-full rounded" style={{ width: `${v}%`, background: c }} /></div>
                    <span className="num w-14 text-right shrink-0" title={`${l}: earned ${earned.toFixed(1)} of ${possible.toFixed(0)} possible points (weight ${(w * 100).toFixed(0)}%)`}>{earned.toFixed(1)}/{possible.toFixed(0)}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 text-[10px] pt-1 mt-0.5 border-t border-white/10">
                <span className="label w-16 shrink-0">Total</span>
                <span className="flex-1" />
                <span className="num w-14 text-right shrink-0 font-semibold text-white">{score.total.toFixed(1)}/100</span>
              </div>
              <button className="label normal-case tracking-normal text-white/50 hover:text-white/80 underline decoration-dotted" onClick={() => setShowFormula((v) => !v)} aria-expanded={showFormula}>{showFormula ? 'hide' : 'Why this score?'}</button>
              {showFormula && <p className="text-[11px] text-white/65 leading-snug">Each component earns up to its weight × 100 possible points, from: Power = mean illuminated fraction of the solar disc · Comms = fraction of time Earth is ≥ {earthMarginDeg}° above the terrain horizon · Continuity = longest continuous sunlight ÷ window length · Margin = min(1, hours until the next loss of sunlight ÷ {MARGIN_BATTERY_HOURS}). All over the mission window above.</p>}
            </div>
          </div>
        </section>
        <p className="text-sm text-haze">A polar-site comparison score. Near-side sites often keep Earth in view and receive all 30 radio points; this is not a spacecraft survival prediction.</p>
        <details><summary className="cursor-pointer text-sm">Why these score weights?</summary><ul className="text-sm text-haze space-y-1 mt-2">{SCORE_REASONS.map(([name, points, reason]) => <li key={name}><b>{name}: {points} points.</b> {reason}</li>)}</ul></details>
        <LandingDates />
        <section className="rounded-lg border border-white/10 p-3 space-y-2" aria-label="Night and battery estimate">
          <div className="label">{night.current ? 'Current night: full length' : 'Next night: full length'}</div>
          <p className="text-lg num">{night.durationMs > 0 ? `${night.atLeast ? 'At least ' : ''}${fmtDuration(night.durationMs)}` : 'No sunset found in the next 400 days'}</p>
          <p className="text-sm text-haze">This looks past the mission end. The longest darkness within your mission is {fmtDuration(stats.window.longestDarkMs)}.</p>
          <label className="flex flex-wrap gap-2 items-center text-sm">Battery lasts (hours without sunlight)<input className="btn w-24" aria-label="Battery lasts in hours" type="number" min={0} max={20000} value={batteryHours} onChange={(e) => setBatteryHours(Math.max(0, Number(e.target.value) || 0))} /></label>
          <p role="status" className={`text-sm ${battery.enough ? 'text-emerald-300' : 'text-rose-300'}`}>{battery.enough ? 'Your battery time covers this estimated darkness.' : battery.unknown ? 'The full night is outside our search range. This battery time cannot be confirmed.' : `Your battery time is shorter than the estimated darkness (${Math.ceil(battery.neededHours)} hours needed).`}</p>
          <p className="text-sm text-haze">A simple time comparison only. Temperature, power use, battery aging and heating are not modeled.</p>
        </section>
        <section className="grid grid-cols-2 gap-x-4 gap-y-3" aria-label="Live metrics">
          <Metric label="Sun elevation" value={`${live.sun.el.toFixed(2)}°`} sub={`az ${live.sun.az.toFixed(1)}° · horizon ${live.sunHorizon.toFixed(2)}°`} tone={live.sunUp ? 'text-solar' : 'text-white/45'} />
          <Metric label="Solar disc visible" value={fmtPct(live.sunFrac)} sub={live.sunUp ? 'sunlit' : 'in shadow'} tone={live.sunUp ? 'text-solar' : 'text-white/45'} />
          <Metric label={live.sunUp ? 'Next sunrise after' : 'Next sunset after'} value={stats.next.sunrise !== null && stats.next.sunset !== null ? fmtDuration((live.sunUp ? stats.next.sunrise : stats.next.sunset) - timeMs) : '—'} sub={live.sunUp ? (stats.next.sunrise ? fmtDateTime(stats.next.sunrise) : NONE_WITHIN) : (stats.next.sunset ? fmtDateTime(stats.next.sunset) : NONE_WITHIN)} tone="text-white/85" />
          <Metric label="Longest continuous sun" value={fmtDuration(stats.window.longestSunlitMs)} sub={`longest dark ${fmtDuration(stats.window.longestDarkMs)}`} tone="text-solar" />
          <Metric label="Sunlight" value={fmtPct(stats.window.sunlitFrac)} sub={`effective ${fmtPct(stats.window.effectiveSunFrac)} (disc-weighted)`} tone="text-solar" />
          <Metric label="Earth visible" value={fmtPct(stats.window.earthFrac)} sub={`power + DTE ${fmtPct(stats.window.bothFrac)}`} tone="text-earth" />
          <Metric label="Earth elevation" value={`${live.earth.el.toFixed(2)}°`} sub={`az ${live.earth.az.toFixed(1)}° · disc ${(2 * live.earth.radiusDeg).toFixed(2)}°`} tone={live.earthUp ? 'text-earth' : 'text-white/45'} />
          <Metric label={live.earthUp ? 'T-minus Earthset' : 'T-minus Earthrise'} value={fmtCountdown((live.earthUp ? stats.next.earthset : stats.next.earthrise) !== null ? (live.earthUp ? stats.next.earthset! : stats.next.earthrise!) - timeMs : NaN)} sub={(live.earthUp ? stats.next.earthset : stats.next.earthrise) !== null ? fmtDateTime(live.earthUp ? stats.next.earthset! : stats.next.earthrise!) : live.earthUp ? `Earth stays up ≥ ${NEXT_EVENT_HORIZON_DAYS} d` : `no Earthrise within ${NEXT_EVENT_HORIZON_DAYS} d`} tone="text-earth" live />
        </section>
        <section aria-label="Direct-to-Earth windows">
          <div className="label mb-1">DTE windows (within the mission window above)</div>
          {dte.length === 0 ? <div className="text-xs text-white/50">No Earth visibility in the mission window.</div> : (
            <ul className="space-y-1">{dte.map((w, i) => (
              <li key={i} className="flex items-center justify-between text-[11px] num"><button className="hover:text-earth text-left" onClick={() => setTime(Math.max(w.start, timeMs))}>{w.openStart ? '… ' : ''}{fmtDateTime(w.start)} → {fmtDateTime(w.end)}{w.openEnd ? ' …' : ''}</button><span className="text-earth">{fmtDuration(w.end - w.start)}</span></li>
            ))}</ul>
          )}
        </section>
        <FindWindowPanel />
        <SkyTable />
        {!explorer && <section className="grid grid-cols-3 gap-2 items-end" aria-label="Analysis options">
          <label className="flex flex-col"><span className="label">Window · days</span><input type="number" min={1} max={400} className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={windowDays} onChange={(e) => { const v = +e.target.value; if (v >= 1 && v <= 400) setWindowDays(v); }} /></label>
          <label className="flex flex-col"><span className="label">Sunset = </span><select className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={sunsetDef} onChange={(e) => setSunsetDef(e.target.value as 'center' | 'limb')}><option value="center">disc centre</option><option value="limb">last limb</option></select></label>
          <label className="flex flex-col"><span className="label">Earth clearance °</span><input type="number" min={0} max={30} step={0.5} className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={earthMarginDeg} onChange={(e) => setEarthMargin(+e.target.value)} /></label>
        <p className="col-span-3 text-sm text-haze">Earth must be this many degrees above the local terrain for a direct radio link. Default: 5°. Set 0° to check geometric visibility only.</p></section>}
        <p className="label normal-case tracking-normal text-white/45 leading-snug">Horizon: {horizon.label}. {site.record?.note ?? ''} Source: {site.record?.source ?? 'user input'}.</p>
      </div>
    </aside>
  );
}
function Metric({ label, value, sub, tone, live }: { label: string; value: string; sub: string; tone: string; live?: boolean }) {
  return <div><div className="label">{label}</div><div className={`num text-[22px] leading-none mt-0.5 ${tone}`} aria-live={live ? 'off' : undefined}>{value}</div><div className="num text-[10px] text-white/45 mt-1 truncate" title={sub}>{sub}</div></div>;
}
