import { useEffect, useRef, useMemo, useState } from 'react';
import { useMetrics } from '@/state/useMetrics';
import { useStore, useActiveSite } from '@/state/store';
import { fmtLat, fmtLon } from '@/data/sites';
import { fmtCountdown, fmtDate, fmtDateTime, fmtDuration, fmtPct } from './format';
import { SCORE_WEIGHTS, MARGIN_BATTERY_HOURS, NEXT_EVENT_HORIZON_DAYS, subPoints } from '@/astro';
import { fullNight, batteryCheck, SCORE_REASONS } from './scoreModel';
import { siteSummary } from './siteSummary';
import { SiteDateHeatmap } from './SiteDateHeatmap';
import { LandingDates } from './LandingDates';
import { useOptions } from '@/state/useMetrics';
import { terrainSummary } from './terrainCopy';
import { SkyTable } from './SkyTable';
import { ExplorerCallouts } from './Explorer';
import { FindWindowPanel } from './FindWindowPanel';

const CONF: Record<string, [string, string]> = { high: ['Well documented', 'text-emerald-300 border-emerald-400/30'], medium: ['Less precise location', 'text-sky-300 border-sky-400/30'], approx: ['Approximate location', 'text-rose-300 border-rose-400/30'] };
const NONE_WITHIN = `none within ${NEXT_EVENT_HORIZON_DAYS} days`;

export function Dashboard({ explorer = false, compact = false, onClose }: { explorer?: boolean; compact?: boolean; onClose?: () => void }) {
  const site = useActiveSite();
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 0; }, [site.id, site.lat, site.lon]);
  const { timeMs, setTime, windowDays, setWindowDays, sunsetDef, setSunsetDef, earthMarginDeg, setEarthMargin } = useStore();
  const { stats, live, horizon } = useMetrics();
  const [showFormula, setShowFormula] = useState(false);
  const conf = site.record ? CONF[site.record.confidence] : ['Your location', 'text-white/70 border-white/20'];
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
  const windowLabel = `Date range · ${windowDays} ${windowDays === 1 ? 'day' : 'days'} · ${fmtDate(stats.window.startMs)} → ${fmtDate(stats.window.endMs)}`;
  const scoreRows = [
    ['Sunlight', score.power, SCORE_WEIGHTS.power, '#ffb547'],
    ['Earth view', score.comms, SCORE_WEIGHTS.comms, '#5fc3ff'],
    ['Steady sun', score.continuity, SCORE_WEIGHTS.continuity, '#9ef0c0'],
    ['Time left', score.margin, SCORE_WEIGHTS.margin, '#e7edf5'],
  ] as const;

  return (
    <aside className={compact ? 'compact-drawer absolute inset-x-4 top-28 bottom-36 z-30 glass rounded-xl flex flex-col overflow-hidden' : 'absolute right-4 top-28 bottom-36 z-20 w-[25rem] max-w-[calc(100vw-2rem)] glass rounded-xl flex flex-col overflow-hidden'} aria-label="Site details">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="label">Selected site</div>
            <h2 className="text-base font-semibold leading-tight break-words" title={site.name}>{site.name}</h2>
            <div className="num text-xs text-haze mt-0.5">{fmtLat(site.lat)} · {fmtLon(site.lon)}{site.heightKm ? ` · height ${site.heightKm.toFixed(2)} km` : ''}</div>
            <div hidden={explorer} className="num text-[10px] text-white/45" title="Location on the Moon where Earth is directly overhead">Earth is overhead at {lib.lat.toFixed(2)}° {lib.lon.toFixed(2)}°</div>
            {!explorer && <span className={`label inline-flex border rounded-full px-2 py-0.5 mt-1 ${conf[1]}`}>{conf[0]}</span>}
          </div>
          {onClose && <button className="btn shrink-0" onClick={onClose} aria-label="Close site details">✕</button>}
        </div>
      </div>

      <div ref={scroll} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
      <p className="text-sm leading-relaxed" aria-label="Site summary">{siteSummary(stats, night)}</p>

        {live.sun.el > 0 && live.sunFrac === 0 && <p className="text-sm text-solar">☾ Sun is up, but a mountain is blocking it. This site is in shadow.</p>}
        <section aria-label="Site score" className="space-y-2">
          <div className="label">{windowLabel}</div>
          <div className="flex items-start gap-4">
            <div>
              <div className="label">Site score</div>
              <div className={`num text-5xl leading-none ${tone}`}>{score.total.toFixed(0)}<span className="text-base text-white/40">/100</span></div>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {/* Conditions at the selected time, separate from the window score above: the next terrain-aware
                  transition after `timeMs` (live.sunUp and nextSunTransition both resolve exactly at timeMs). */}
              <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${live.sunUp ? 'bg-solar/15 text-solar' : 'bg-white/8 text-white/70'}`}>
                <span aria-hidden>{live.sunUp ? '☀' : '☾'}</span>
                <span>{live.sunUp ? 'Sunlit now' : 'Dark now'} · {live.sunUp ? 'sunset' : 'sunrise'} in {nextSunTransition !== null ? fmtDuration(nextSunTransition - timeMs) : NONE_WITHIN}</span>
              </div>
              {!explorer && score.margin === 0 && (
                <p className="text-[11px] text-rose-300 leading-snug">
                  No points for time left before sunset because this site is dark now. The longest stretch of darkness in this date range is <b>{fmtDuration(stats.window.longestDarkMs)}</b>. Full points need at least {MARGIN_BATTERY_HOURS} hours of sunlight left.
                </p>
              )}
              {!explorer && scoreRows.map(([l, v, w, c]) => {
                const possible = w * 100, earned = v * w;
                return (
                  <div key={l} className="flex items-center gap-2 text-[10px]">
                    <span className="label w-20 shrink-0">{l}</span>
                    <div className="flex-1 h-1.5 bg-white/8 rounded"><div className="h-full rounded" style={{ width: `${v}%`, background: c }} /></div>
                    <span className="num w-14 text-right shrink-0" title={`${l}: earned ${earned.toFixed(1)} of ${possible.toFixed(0)} possible points (weight ${(w * 100).toFixed(0)}%)`}>{earned.toFixed(1)}/{possible.toFixed(0)}</span>
                  </div>
                );
              })}
              <div hidden={explorer} className="flex items-center gap-2 text-[10px] pt-1 mt-0.5 border-t border-white/10">
                <span className="label w-16 shrink-0">Total</span>
                <span className="flex-1" />
                <span className="num w-14 text-right shrink-0 font-semibold text-white">{score.total.toFixed(1)}/100</span>
              </div>
              <button className="label normal-case tracking-normal text-white/50 hover:text-white/80 underline decoration-dotted" onClick={() => setShowFormula((v) => !v)} aria-expanded={showFormula}>{showFormula ? 'Hide explanation' : 'Why this score?'}</button>
              {showFormula && <p className="text-[11px] text-white/65 leading-snug">Up to 40 points come from the average amount of Sun visible, 30 from time with Earth in view, 15 from the longest unbroken stretch of sunlight, and 15 from time left before sunset (full points at {MARGIN_BATTERY_HOURS} hours). Earth must clear the terrain by {earthMarginDeg}°. This helps compare sites; it does not predict whether a spacecraft will survive.</p>}
            </div>
          </div>
        </section>
        {explorer && <p className="text-sm text-haze">Higher scores mean more sunlight and Earth view. Use the same dates to compare polar sites.</p>}
        <p hidden={explorer} className="text-sm text-haze">A polar-site comparison score. Near-side sites often keep Earth in view and receive all 30 radio points; this is not a spacecraft survival prediction.</p>
        <details hidden={explorer}><summary className="cursor-pointer text-sm">Why these score weights?</summary><ul className="text-sm text-haze space-y-1 mt-2">{SCORE_REASONS.map(([name, points, reason]) => <li key={name}><b>{name}: {points} points.</b> {reason}</li>)}</ul></details>
        {explorer && <section className="grid grid-cols-2 gap-4" aria-label="Essential results"><Metric label="Sunlight in this date range" value={fmtPct(stats.window.sunlitFrac)} sub={`longest stretch ${fmtDuration(stats.window.longestSunlitMs)}`} tone="text-solar" /><Metric label="Earth visible" value={fmtPct(stats.window.earthFrac)} sub="above terrain and your radio clearance" tone="text-earth" /></section>}
        <FindWindowPanel />
        <div hidden={explorer} className="space-y-4">
        <LandingDates />
        {!explorer && <SiteDateHeatmap />}
        <section className="rounded-lg border border-white/10 p-3 space-y-2" aria-label="Night and battery estimate">
          <div className="label">{night.current ? 'Current night: full length' : 'Next night: full length'}</div>
          <p className="text-lg num">{night.durationMs > 0 ? `${night.atLeast ? 'At least ' : ''}${fmtDuration(night.durationMs)}` : 'No sunset found in the next 400 days'}</p>
          <p className="text-sm text-haze">This looks past the mission end. The longest darkness within your mission is {fmtDuration(stats.window.longestDarkMs)}.</p>
          <label className="flex flex-wrap gap-2 items-center text-sm">Battery lasts (hours without sunlight)<input className="btn w-24" aria-label="Battery lasts in hours" type="number" min={0} max={20000} value={batteryHours} onChange={(e) => setBatteryHours(Math.max(0, Number(e.target.value) || 0))} /></label>
          <p role="status" className={`text-sm ${battery.enough ? 'text-emerald-300' : 'text-rose-300'}`}>{battery.enough ? 'Your battery time covers this estimated darkness.' : battery.unknown ? 'The full night is outside our search range. This battery time cannot be confirmed.' : `Your battery time is shorter than the estimated darkness (${Math.ceil(battery.neededHours)} hours needed).`}</p>
          <p className="text-sm text-haze">A simple time comparison only. Temperature, power use, battery aging and heating are not modeled.</p>
        </section>
        <section className="grid grid-cols-2 gap-x-4 gap-y-3" aria-label="Live metrics">
          <Metric label="Sun above terrain" value={`${live.sunClear.toFixed(2)}°`} sub={`direction ${live.sun.az.toFixed(1)}° · terrain height ${live.sunHorizon.toFixed(2)}°`} tone={live.sunUp ? 'text-solar' : 'text-white/45'} />
          <Metric label="How much of the Sun is visible" value={fmtPct(live.sunFrac)} sub={live.sunUp ? 'sunlit' : 'in shadow'} tone={live.sunUp ? 'text-solar' : 'text-white/45'} />
          <Metric label={live.sunUp ? 'Next sunrise after' : 'Next sunset after'} value={stats.next.sunrise !== null && stats.next.sunset !== null ? fmtDuration((live.sunUp ? stats.next.sunrise : stats.next.sunset) - timeMs) : '—'} sub={live.sunUp ? (stats.next.sunrise ? fmtDateTime(stats.next.sunrise) : NONE_WITHIN) : (stats.next.sunset ? fmtDateTime(stats.next.sunset) : NONE_WITHIN)} tone="text-white/85" />
          <Metric label="Longest stretch of sunlight" value={fmtDuration(stats.window.longestSunlitMs)} sub={`longest night ${fmtDuration(stats.window.longestDarkMs)}`} tone="text-solar" />
          <Metric label="Sunlight" value={fmtPct(stats.window.sunlitFrac)} sub={`average visible Sun ${fmtPct(stats.window.effectiveSunFrac)}`} tone="text-solar" />
          <Metric label="Earth visible" value={fmtPct(stats.window.earthFrac)} sub={`sunlight and Earth visible ${fmtPct(stats.window.bothFrac)}`} tone="text-earth" />
          <Metric label="Earth above terrain" value={`${(live.earth.el - live.earthHorizon).toFixed(2)}°`} sub={`direction ${live.earth.az.toFixed(1)}° · apparent size ${(2 * live.earth.radiusDeg).toFixed(2)}°`} tone={live.earthUp ? 'text-earth' : 'text-white/45'} />
          <Metric label={live.earthUp ? 'Earth leaves view in' : 'Earth returns in'} value={fmtCountdown((live.earthUp ? stats.next.earthset : stats.next.earthrise) !== null ? (live.earthUp ? stats.next.earthset! : stats.next.earthrise!) - timeMs : NaN)} sub={(live.earthUp ? stats.next.earthset : stats.next.earthrise) !== null ? fmtDateTime(live.earthUp ? stats.next.earthset! : stats.next.earthrise!) : live.earthUp ? `Earth stays up ≥ ${NEXT_EVENT_HORIZON_DAYS} days` : `no Earthrise within ${NEXT_EVENT_HORIZON_DAYS} days`} tone="text-earth" live />
        </section>
        <section aria-label="Times when Earth is visible">
          <div className="label mb-1">Times when Earth is visible</div>
          {dte.length === 0 ? <div className="text-xs text-white/50">Earth is not visible during this date range. Try a different date or choose another site.</div> : (
            <ul className="space-y-1">{dte.map((w, i) => (
              <li key={i} className="flex items-center justify-between text-[11px] num"><button className="hover:text-earth text-left" onClick={() => setTime(Math.max(w.start, timeMs))}>{w.openStart ? '… ' : ''}{fmtDateTime(w.start)} → {fmtDateTime(w.end)}{w.openEnd ? ' …' : ''}</button><span className="text-earth">{fmtDuration(w.end - w.start)}</span></li>
            ))}</ul>
          )}
        </section>
        <SkyTable />
        {!explorer && <details><summary className="btn cursor-pointer">Advanced settings</summary><p className="text-xs text-haze my-2">Adjust the date range and how terrain affects visibility. All dates use UTC, the same time worldwide.</p><section className="grid grid-cols-3 gap-2 items-end" aria-label="Advanced settings">
          <label className="flex flex-col"><span className="label">Date range · days</span><input type="number" min={1} max={400} className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={windowDays} onChange={(e) => { const v = +e.target.value; if (v >= 1 && v <= 400) setWindowDays(v); }} /></label>
          <label className="flex flex-col"><span className="label">Count sunset when</span><select className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={sunsetDef} onChange={(e) => setSunsetDef(e.target.value as 'center' | 'limb')}><option value="center">Half the Sun has set</option><option value="limb">The whole Sun has set</option></select></label>
          <label className="flex flex-col"><span className="label">Earth clearance °</span><input type="number" min={0} max={30} step={0.5} className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={earthMarginDeg} onChange={(e) => setEarthMargin(+e.target.value)} /></label>
        <p className="col-span-3 text-sm text-haze">Earth must be this many degrees above the local terrain for a direct radio link. Default: 5°. Set 0° to check geometric visibility only.</p></section></details>}
        <ExplorerCallouts />
        </div>
        <p className="text-xs text-haze" role="status">{terrainSummary(horizon)}</p>
        <details><summary className="label cursor-pointer">Location notes and data sources</summary><p className="text-xs text-haze mt-2">{site.record?.note ?? 'You chose this location.'} Location source: {site.record?.source ?? 'Your coordinates'}. {horizon.source === 'lola' ? horizon.label : ''}</p></details>
      </div>
    </aside>
  );
}
function Metric({ label, value, sub, tone, live }: { label: string; value: string; sub: string; tone: string; live?: boolean }) {
  return <div><div className="label">{label}</div><div className={`num text-[22px] leading-none mt-0.5 ${tone}`} aria-live={live ? 'off' : undefined}>{value}</div><div className="num text-[10px] text-white/45 mt-1 truncate" title={sub}>{sub}</div></div>;
}
