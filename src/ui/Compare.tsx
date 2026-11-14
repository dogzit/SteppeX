import { useEffect, useMemo, useState } from 'react';
import { computeMetrics, SPHERE_HORIZON, type HorizonProfile, type Metrics } from '@/astro';
import { SITES, GROUP_LABEL, GROUP_ORDER, fmtLat, fmtLon } from '@/data/sites';
import { useStore, resolveSite } from '@/state/store';
import { useCompare, type Scenario } from '@/state/compare';
import { useOptions } from '@/state/useMetrics';
import { getLibraryHorizon, requestCustomHorizon } from '@/state/useHorizon';
import { leadingScores } from './scoreModel';
import { fmtDateTime, fmtDuration, fmtPct } from './format';
import { exportCsv, exportJson, type ExportRow } from './export';

const DAY = 86400_000;
function useScenarioHorizon(sc: Scenario): HorizonProfile {
  const [custom, setCustom] = useState<HorizonProfile | null>(null);
  const ready = useStore((s) => s.horizonsReady);
  useEffect(() => { if (sc.siteId !== 'custom' || !sc.custom) return; let alive = true; setCustom(null); requestCustomHorizon(sc.custom.lat, sc.custom.lon).then((p) => alive && setCustom(p)); return () => { alive = false; }; }, [sc.siteId, sc.custom]);
  return useMemo(() => (sc.siteId === 'custom' ? custom ?? { ...SPHERE_HORIZON, label: 'computing terrain…' } : (ready && getLibraryHorizon(sc.siteId)) || SPHERE_HORIZON), [sc.siteId, custom, ready]);
}

/** Signed delta chip: colour + sign + arrow so colour is never the only signal. */
function Delta({ v, unit = '', good = 'up', digits = 0 }: { v: number; unit?: string; good?: 'up' | 'down'; digits?: number }) {
  if (!Number.isFinite(v) || Math.abs(v) < 0.5 * 10 ** -digits) return <span className="text-white/35 num text-[10px]">±0</span>;
  const positive = v > 0, isGood = good === 'up' ? positive : !positive;
  return <span className={`num text-[10px] ${isGood ? 'text-emerald-300' : 'text-rose-300'}`} aria-label={`${positive ? 'up' : 'down'} ${Math.abs(v).toFixed(digits)}${unit}`}>{positive ? '▲+' : '▼−'}{Math.abs(v).toFixed(digits)}{unit}</span>;
}

function Card({ sc, baseMs, slipDays, windowDays, best, onMetrics }: { sc: Scenario; baseMs: number; slipDays: number; windowDays: number; best: boolean; onMetrics: (key: string, row: ExportRow) => void }) {
  const { update, remove } = useCompare(); const opts = useOptions(); const hz = useScenarioHorizon(sc);
  const site = resolveSite(sc.siteId, sc.custom);
  const s = { lat: site.lat, lon: site.lon, heightKm: site.heightKm };
  const t0 = baseMs + sc.offsetDays * DAY, t = t0 + slipDays * DAY;
  const base = useMemo(() => computeMetrics(s, hz, t0, windowDays, opts), [s.lat, s.lon, s.heightKm, hz, t0, windowDays, opts]); // eslint-disable-line react-hooks/exhaustive-deps
  const m: Metrics = useMemo(() => (slipDays === 0 ? base : computeMetrics(s, hz, t, windowDays, opts)), [base, slipDays, s.lat, s.lon, s.heightKm, hz, t, windowDays, opts]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onMetrics(sc.key, { label: site.name, lat: site.lat, lon: site.lon, landingUtc: new Date(t).toISOString(), slipDays, windowDays, horizon: hz.label, metrics: m }); }, [m, sc.key, site, t, slipDays, windowDays, hz.label, onMetrics]);
  const toDark = (x: Metrics) => (x.now.sunUp && x.next.sunset ? x.next.sunset - (x === m ? t : t0) : 0);
  const w = m.window, bw = base.window;
  const tone = m.score.total >= 70 ? 'text-emerald-300' : m.score.total >= 40 ? 'text-solar' : 'text-rose-300';
  return (
    <article className={`glass rounded-xl p-3 flex flex-col gap-2 min-w-0 ${best ? 'ring-1 ring-emerald-400/50' : ''}`} aria-label={`Scenario ${site.name}`}>
      <div className="flex items-start justify-between gap-2">
        <select aria-label="Scenario site" className="bg-ink/60 border border-white/10 rounded-md px-1.5 py-1 text-xs min-w-0 flex-1" value={sc.siteId} onChange={(e) => update(sc.key, { siteId: e.target.value, custom: e.target.value === 'custom' ? sc.custom ?? useStore.getState().custom : null })}>
          {sc.custom && <option value="custom">Custom pin {fmtLat(sc.custom.lat)} {fmtLon(sc.custom.lon)}</option>}
          {GROUP_ORDER.map((g) => <optgroup key={g} label={GROUP_LABEL[g]}>{SITES.filter((x) => x.group === g).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>)}
        </select>
        <button className="btn px-2" aria-label="Remove scenario" onClick={() => remove(sc.key)}>✕</button>
      </div>
      <label className="flex items-center gap-2 text-[11px]"><span className="label">Date offset</span><input aria-label="Scenario date offset in days" type="number" step={1} className="num w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5" value={sc.offsetDays} onChange={(e) => update(sc.key, { offsetDays: +e.target.value || 0 })} /><span className="label">d</span><span className="num text-white/55 ml-auto">{fmtDateTime(t)}</span></label>
      <div className="flex items-end gap-3">
        <div><div className="label">Viability</div><div className={`num text-4xl leading-none ${tone}`}>{m.score.total.toFixed(0)}</div></div>
        <div className="pb-1"><Delta v={m.score.total - base.score.total} /></div>
        {best && <span className="label text-emerald-300 ml-auto">best (including ties)</span>}
      </div>
      <dl className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-1 text-[11px] num">
        <Row l="Sunlight" v={fmtPct(w.sunlitFrac)} d={<Delta v={100 * (w.sunlitFrac - bw.sunlitFrac)} unit="pt" />} />
        <Row l="Earth visible" v={fmtPct(w.earthFrac)} d={<Delta v={100 * (w.earthFrac - bw.earthFrac)} unit="pt" />} />
        <Row l="Power + DTE" v={fmtPct(w.bothFrac)} d={<Delta v={100 * (w.bothFrac - bw.bothFrac)} unit="pt" />} />
        <Row l="Longest sun" v={fmtDuration(w.longestSunlitMs)} d={<Delta v={(w.longestSunlitMs - bw.longestSunlitMs) / 3600_000} unit="h" />} />
        <Row l="Longest dark" v={fmtDuration(w.longestDarkMs)} d={<Delta v={(w.longestDarkMs - bw.longestDarkMs) / 3600_000} unit="h" good="down" />} />
        <Row l="To first sunset" v={m.now.sunUp ? (m.next.sunset ? fmtDuration(m.next.sunset - t) : '> 400 d') : 'dark at landing'} d={<Delta v={(toDark(m) - toDark(base)) / 3600_000} unit="h" />} />
        <Row l="Earth at landing" v={`${m.now.earthEl.toFixed(1)}°`} d={<Delta v={m.now.earthEl - base.now.earthEl} unit="°" digits={1} />} />
      </dl>
      <MiniBands m={m} t={t} windowDays={windowDays} />
      <div className="label normal-case tracking-normal text-white/40 truncate" title={hz.label}>{hz.label}</div>
    </article>
  );
}
const Row = ({ l, v, d }: { l: string; v: string; d: React.ReactNode }) => <><dt className="label normal-case tracking-normal text-white/55">{l}</dt><dd className="text-right">{v}</dd><dd className="text-right w-14">{d}</dd></>;
function MiniBands({ m, t, windowDays }: { m: Metrics; t: number; windowDays: number }) {
  const span = windowDays * DAY, x = (ms: number) => `${(100 * Math.max(0, Math.min(1, (ms - t) / span))).toFixed(2)}%`;
  const lane = (ws: { start: number; end: number }[], color: string, y: number) => ws.map((w, i) => <rect key={i} x={x(w.start)} y={y} width={`${Math.max(0.2, 100 * (Math.min(w.end, t + span) - Math.max(w.start, t)) / span).toFixed(2)}%`} height="5" fill={color} />);
  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-5 block" role="img" aria-label={`Window bands: sunlit ${fmtPct(m.window.sunlitFrac)}, Earth ${fmtPct(m.window.earthFrac)}, both ${fmtPct(m.window.bothFrac)}`}>
      <rect width="100" height="20" fill="rgba(255,255,255,.04)" />
      {lane(m.window.sunWindows, '#ffb547', 1)}{lane(m.window.earthWindows, '#5fc3ff', 7.5)}{lane(m.window.bothWindows, '#9ef0c0', 14)}
    </svg>
  );
}

export function Compare() {
  const { open, setOpen, scenarios, slipDays, setSlip, addCurrent, nearby, reset } = useCompare();
  const baseMs = useStore((s) => s.timeMs), windowDays = useStore((s) => s.windowDays);
  const [rows, setRows] = useState<Record<string, ExportRow>>({});
  const onMetrics = useMemo(() => (key: string, row: ExportRow) => setRows((r) => (r[key] === row ? r : { ...r, [key]: row })), []);
  const list = scenarios.map((s) => rows[s.key]).filter(Boolean);
  const leaders = leadingScores(scenarios.filter((s) => rows[s.key]).map((s) => ({ key: s.key, total: rows[s.key].metrics.score.total })));
  if (!open) return null;
  return (
    <div className="compare-panel absolute inset-x-4 top-28 bottom-36 z-30 flex flex-col gap-3 rounded-2xl p-3 bg-ink/80 border border-white/8" role="dialog" aria-label="Compare scenarios">
      <div className="glass rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap">
        <div><div className="label">Compare</div><div className="text-sm font-semibold">Scenarios · site × landing date</div></div>
        <label className="flex items-center gap-3 flex-1 min-w-[18rem]">
          <span className="label whitespace-nowrap">Launch slips by</span>
          <input aria-label="Launch slip in days" type="range" min={-14} max={28} step={1} value={slipDays} onChange={(e) => setSlip(+e.target.value)} className="flex-1 accent-[#ffb547]" />
          <span className={`num text-lg w-16 text-right ${slipDays === 0 ? 'text-white/60' : 'text-solar'}`}>{slipDays > 0 ? '+' : ''}{slipDays} d</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={addCurrent} disabled={scenarios.length >= 4}>+ Add current</button>
          <button className="btn" onClick={nearby}>Same date · nearby sites</button>
          <button className="btn" onClick={reset}>Reset</button>
          <button className="btn" onClick={() => exportCsv(list)} disabled={!list.length}>CSV</button>
          <button className="btn" onClick={() => exportJson(list)} disabled={!list.length}>JSON</button>
          <button className="btn" onClick={() => setOpen(false)} aria-label="Close compare">Close ✕</button>
        </div>
      </div>
      <div className="grid gap-3 flex-1 min-h-0 overflow-auto" style={{ gridTemplateColumns: `repeat(${Math.max(1, scenarios.length)}, minmax(16rem, 1fr))` }}>
        {scenarios.map((sc) => <Card key={sc.key} sc={sc} baseMs={baseMs} slipDays={slipDays} windowDays={windowDays} best={leaders.has(sc.key)} onMetrics={onMetrics} />)}
      </div>
      <p className="label normal-case tracking-normal text-white/45">Deltas (▲ green / ▼ red) compare each scenario with its own no-slip baseline. Window: {windowDays} d from landing. Base date: {fmtDateTime(baseMs)} (the mission clock).</p>
    </div>
  );
}
