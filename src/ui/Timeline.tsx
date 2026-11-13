import { useMemo, useRef, useState } from 'react';
import { scaleUtc } from 'd3-scale';
import { buildSeries, siteSeries, visibility, windows, type Window } from '@/astro';
import { useStore, useActiveSite, SPAN_MS, SPEEDS, type Span } from '@/state/store';
import { useOptions } from '@/state/useMetrics';
import { useHorizon } from '@/state/useHorizon';
import { fmtDateTime, fmtDuration, fmtPct } from './format';
import { SYNODIC_MONTH_DAYS } from '@/astro';

const STEP: Record<Span, number> = { day: 120_000, month: 1200_000, year: 7200_000 };
const LANES = [
  { key: 'sun', label: 'Sun up', color: '#ffb547', pattern: 'none' },
  { key: 'earth', label: 'Earth up', color: '#5fc3ff', pattern: 'none' },
  { key: 'both', label: 'Power + DTE', color: '#9ef0c0', pattern: 'hatch' },
] as const;

export function Timeline() {
  const site = useActiveSite(); const hz = useHorizon(site); const opts = useOptions();
  const { timeMs, setTime, span, setSpan, playing, togglePlay, speed, setSpeed, stepTime, ephemReady } = useStore();
  const spanMs = SPAN_MS[span], dt = STEP[span];
  // Anchor the visible span so the playhead sits 30% in; snap to a coarse grid so the series is cached while time plays.
  const start = Math.floor((timeMs - spanMs * 0.3) / (spanMs / 48)) * (spanMs / 48);
  const data = useMemo(() => {
    const n = Math.ceil(spanMs / dt) + 1;
    const ss = siteSeries(buildSeries(start, dt, n), { lat: site.lat, lon: site.lon, heightKm: site.heightKm });
    const v = visibility(ss, hz, opts);
    const frac = (f: Uint8Array) => f.reduce((a, b) => a + b, 0) / f.length;
    return { ss, v, sun: windows(v.sunUp, start, dt), earth: windows(v.earthUp, start, dt), both: windows(v.both, start, dt), sunFrac: frac(v.sunUp), earthFrac: frac(v.earthUp), bothFrac: frac(v.both) };
  }, [site, hz, opts, start, dt, spanMs, ephemReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000, H = 84, PAD_L = 8, PAD_R = 8, laneH = 16, top = 6;
  const x = useMemo(() => scaleUtc().domain([new Date(start), new Date(start + spanMs)]).range([PAD_L, W - PAD_R]), [start, spanMs]);
  const ticks = x.ticks(span === 'day' ? 8 : span === 'month' ? 10 : 12);
  const toTime = (clientX: number) => { const r = ref.current!.getBoundingClientRect(); return x.invert(PAD_L + ((clientX - r.left) / r.width) * (W - PAD_L - PAD_R)).getTime(); };
  const dragging = useRef(false);
  const idxAt = (t: number) => Math.max(0, Math.min(data.ss.n - 1, Math.round((t - start) / dt)));
  const hv = hover !== null ? idxAt(hover) : null;
  const summary = `Timeline for ${site.name} over one ${span}: sunlit ${fmtPct(data.sunFrac)}, Earth visible ${fmtPct(data.earthFrac)}, both ${fmtPct(data.bothFrac)}.`;

  return (
    <footer className="absolute left-4 right-4 bottom-3 z-20 glass rounded-xl px-3 py-2 flex items-center gap-3" aria-label="Timeline and time controls">
      <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Transport">
        <button className="btn num" title="Back one lunar day (29.53 d)" aria-label="Back one lunar day" onClick={() => stepTime(-SYNODIC_MONTH_DAYS * 86400_000)}>«☾</button>
        <button className="btn num" title="Back one Earth day" aria-label="Back one day" onClick={() => stepTime(-86400_000)}>−1d</button>
        <button className={`btn w-16 ${playing ? 'btn-on' : ''}`} onClick={togglePlay} aria-pressed={playing} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
        <button className="btn num" title="Forward one Earth day" aria-label="Forward one day" onClick={() => stepTime(86400_000)}>+1d</button>
        <button className="btn num" title="Forward one lunar day (29.53 d)" aria-label="Forward one lunar day" onClick={() => stepTime(SYNODIC_MONTH_DAYS * 86400_000)}>☾»</button>
        <select aria-label="Playback speed" className="btn num bg-ink" value={speed} onChange={(e) => setSpeed(+e.target.value)}>
          {SPEEDS.map((s) => <option key={s} value={s}>{s < 3600 ? `${s / 60} min/s` : s < 86400 ? `${s / 3600} h/s` : `${s / 86400} d/s`}</option>)}
        </select>
      </div>
      <div className="flex flex-col justify-start pt-[6px] shrink-0 w-20" aria-hidden>
        {LANES.map((l) => <div key={l.key} className="label h-4 leading-4 truncate" style={{ color: l.color }}>{l.label}</div>)}
      </div>
      <div className="relative flex-1 min-w-0">
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[84px] block cursor-crosshair select-none" role="img" aria-label={summary}
          onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); setTime(toTime(e.clientX)); }}
          onPointerMove={(e) => { const t = toTime(e.clientX); setHover(t); if (dragging.current) setTime(t); }}
          onPointerUp={() => { dragging.current = false; }} onPointerLeave={() => { dragging.current = false; setHover(null); }}>
          <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="#9ef0c0" opacity="0.9" /></pattern></defs>
          {ticks.map((t) => <g key={+t}><line x1={x(t)} x2={x(t)} y1={top} y2={top + 3 * laneH + 4} stroke="rgba(255,255,255,.08)" /><text x={x(t)} y={H - 4} fill="#8ea0b8" fontSize="9" textAnchor="middle" className="num">{span === 'day' ? t.toISOString().slice(11, 16) : span === 'month' ? t.toISOString().slice(5, 10) : t.toISOString().slice(0, 7)}</text></g>)}
          {LANES.map((lane, i) => {
            const ws: Window[] = data[lane.key]; const y = top + i * laneH;
            return (
              <g key={lane.key}>
                <rect x={PAD_L} y={y + 2} width={W - PAD_L - PAD_R} height={laneH - 4} fill="rgba(255,255,255,.04)" />
                {ws.map((w, k) => <rect key={k} x={x(w.start)} y={y + 2} width={Math.max(0.8, x(w.end) - x(w.start))} height={laneH - 4} fill={lane.pattern === 'hatch' ? 'url(#hatch)' : lane.color} opacity={0.85} rx={1} />)}
              </g>
            );
          })}
          <line x1={x(timeMs)} x2={x(timeMs)} y1={2} y2={H - 12} stroke="#fff" strokeWidth={1.5} />
          <polygon points={`${x(timeMs) - 5},2 ${x(timeMs) + 5},2 ${x(timeMs)},9`} fill="#fff" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={2} y2={H - 12} stroke="rgba(255,255,255,.35)" strokeDasharray="3 3" />}
        </svg>
        {hover !== null && hv !== null && (
          <div className="absolute -top-14 glass rounded-md px-2 py-1 text-[11px] num pointer-events-none whitespace-nowrap" style={{ left: `${((x(hover) - PAD_L) / (W - PAD_L - PAD_R)) * 100}%`, transform: 'translateX(-50%)' }}>
            {fmtDateTime(hover)} · <span className="text-solar">☀ {data.ss.sunEl[hv].toFixed(1)}°</span> · <span className="text-earth">⊕ {data.ss.earthEl[hv].toFixed(1)}°</span>
          </div>
        )}
        <div className="absolute right-1 -top-5 label normal-case tracking-normal num text-white/50">{span === 'day' ? 'Sun ' + fmtPct(data.sunFrac) : `sun ${fmtPct(data.sunFrac)} · earth ${fmtPct(data.earthFrac)} · both ${fmtPct(data.bothFrac)} · longest sun ${fmtDuration(Math.max(0, ...data.sun.map((w) => w.end - w.start)))}`}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Span">
        {(['day', 'month', 'year'] as Span[]).map((s) => <button key={s} className={`btn ${span === s ? 'btn-on' : ''}`} aria-pressed={span === s} onClick={() => setSpan(s)}>{s === 'month' ? 'Lunar month' : s[0].toUpperCase() + s.slice(1)}</button>)}
      </div>
    </footer>
  );
}
