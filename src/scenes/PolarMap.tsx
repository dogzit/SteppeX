import { useEffect, useMemo, useRef, useState } from 'react';
import { SITES } from '@/data/sites';
import { useStore, useActiveSite } from '@/state/store';
import { seedCustomHorizon } from '@/state/useHorizon';
import { useViewportWidth } from '@/ui/useViewport';
import { loadIllumination, paintLayer, SUN_RAMP, MONTH_NAMES, type Illumination, type Peak } from '@/ui/polarIllumination';
import { useEphemeris } from './useEphemeris';
import { polarPoint, polarLocation } from './polarProjection';

type Heat = 'off' | 'year' | 'month';

/** A genuine polar-stereographic map: no equirectangular pole sampling or longitude seam. */
export default function PolarMap() {
  const time = useStore((s) => s.timeMs), selectSite = useStore((s) => s.selectSite), setCustom = useStore((s) => s.setCustom);
  const active = useActiveSite(), { siteSun } = useEphemeris(time);
  const [radius, setRadius] = useState(3), [hover, setHover] = useState<string | null>(null);
  const [heat, setHeat] = useState<Heat>('off'), [peaksOpen, setPeaksOpen] = useState(false);
  const [ill, setIll] = useState<Illumination | null>(null), [illState, setIllState] = useState<'idle' | 'loading' | 'missing'>('idle');
  const width = useViewportWidth(), map = useRef<HTMLDivElement>(null);
  const markerSide = Math.min(width - 40, 540);

  // The grid is a megabyte: fetch it the first time someone asks to see it, never at boot.
  useEffect(() => {
    if ((heat === 'off' && !peaksOpen) || ill || illState !== 'idle') return;
    setIllState('loading');
    void loadIllumination().then((d) => { setIll(d); setIllState(d ? 'idle' : 'missing'); });
  }, [heat, peaksOpen, ill, illState]);

  const monthIdx = new Date(time).getUTCMonth();
  const layer = ill && heat !== 'off' ? (heat === 'year' ? ill.year : ill.months[monthIdx]) : null;
  const heatUrl = useMemo(() => (ill && layer ? paintLayer(ill, layer).toDataURL() : null), [ill, layer]);
  const periodLabel = ill ? (heat === 'year' ? `${ill.meta.year}` : `${MONTH_NAMES[monthIdx]} ${ill.meta.year}`) : '';

  const points = useMemo(() => {
    const accepted: { id: string; name: string; x: number; y: number }[] = [];
    const sites = [...SITES.filter((s) => s.lat < -75), ...(active.id === 'custom' ? [active] : [])].sort((a, b) => Number(b.id === active.id) - Number(a.id === active.id));
    for (const site of sites) {
      const p = polarPoint(site.lat, site.lon, radius);
      if (Math.hypot(p.x - .5, p.y - .5) > .48 || accepted.some((q) => Math.hypot(p.x - q.x, p.y - q.y) * markerSide < 22)) continue;
      accepted.push({ id: site.id, name: site.name, ...p });
    }
    return accepted;
  }, [active, radius, markerSide]);
  const focused = points.find((p) => p.id === hover) ?? points.find((p) => p.id === active.id);
  const sun = focused ? siteSun.get(focused.id) : undefined;
  const imageScale = Math.tan(7.5 * Math.PI / 180) / Math.tan(radius * Math.PI / 360);
  // Latitude circles at whole degrees, drawn in the same stereographic projection as everything else.
  const rings = useMemo(() => {
    const step = radius <= 1 ? 0.25 : radius <= 3 ? 1 : radius <= 6 ? 2 : 5;
    const out: { colat: number; r: number }[] = [];
    for (let c = step; c <= radius + 1e-9; c += step) {
      const r = Math.tan((c * Math.PI) / 360) / Math.tan((radius * Math.PI) / 360);
      if (r <= 1.001) out.push({ colat: +c.toFixed(2), r });
    }
    return out;
  }, [radius]);
  const spokes = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 30).map((a) => {
    const rad = (a * Math.PI) / 180;
    return { a, x1: 50 + Math.cos(rad) * 5, y1: 50 - Math.sin(rad) * 5, x2: 50 + Math.cos(rad) * 49.2, y2: 50 - Math.sin(rad) * 49.2 };
  }), []);
  const heatScale = ill ? Math.tan(ill.meta.halfAngleDeg * Math.PI / 180) / Math.tan(radius * Math.PI / 360) : 1;

  /** Opening a peak drops a pin on it, with the exact profile the ranking used. */
  const pickPeak = (p: Peak) => {
    seedCustomHorizon(p.lat, p.lon, Float32Array.from(p.el), `${ill!.meta.dem}; 250 km sweep at 1° steps; eye 2 m`, 40);
    setCustom({ lat: p.lat, lon: p.lon });
    setPeaksOpen(false);
  };

  return <section className="polar-map absolute inset-0" aria-label="South pole terrain map">
    <div className="polar-map-controls glass rounded-xl p-2 flex flex-wrap justify-center items-center gap-2" role="group" aria-label="Polar map zoom">
      <span className="label">South pole · terrain map</span>
      <button className="btn" aria-label="Zoom in on south pole" disabled={radius <= 1} onClick={() => setRadius((r) => Math.max(1, r / 2))}>＋</button>
      <button className="btn" aria-label="Zoom out from south pole" disabled={radius >= 15} onClick={() => setRadius((r) => Math.min(15, r * 2))}>−</button>
      <span className="text-sm">{(-90 + radius).toFixed(0)}°S to the pole</span>
      <span className="w-px h-5 bg-white/10" />
      <button className={`btn ${heat !== 'off' ? 'btn-on' : ''}`} aria-pressed={heat !== 'off'} onClick={() => setHeat((h) => (h === 'off' ? 'year' : 'off'))}>Sunlight map</button>
      {heat !== 'off' && (
        <div className="flex rounded-md overflow-hidden border border-white/10" role="group" aria-label="Sunlight period">
          <button className={`seg px-2.5 py-1.5 text-xs ${heat === 'year' ? 'seg-on' : 'bg-white/5'}`} aria-pressed={heat === 'year'} onClick={() => setHeat('year')}>Whole year</button>
          <button className={`seg px-2.5 py-1.5 text-xs ${heat === 'month' ? 'seg-on' : 'bg-white/5'}`} aria-pressed={heat === 'month'} onClick={() => setHeat('month')}>This month</button>
        </div>
      )}
      <button className={`btn ${peaksOpen ? 'btn-on' : ''}`} aria-expanded={peaksOpen} onClick={() => setPeaksOpen((v) => !v)}>Best lit places</button>
    </div>

    <div ref={map} className="polar-disc" onClick={(e) => {
      const box = map.current!.getBoundingClientRect();
      const p = polarLocation((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height, radius);
      setCustom(p);
    }}>
      <img src={`${import.meta.env.BASE_URL}textures/polar-south.png`} alt="NASA LOLA south pole elevation hillshade, in polar stereographic projection" draggable={false} style={{ width: `${imageScale * 100}%`, height: `${imageScale * 100}%` }} />
      {heatUrl && <img className="polar-heat" src={heatUrl} alt="" draggable={false} style={{ width: `${heatScale * 100}%`, height: `${heatScale * 100}%` }} />}
      {/* Drawn twice: a pale casing under a dark line, so the graticule reads on the bright
          hillshade and on the dark end of the sunlight map alike. */}
      <svg className="polar-graticule" viewBox="0 0 100 100" aria-hidden preserveAspectRatio="none">
        <g className="graticule-case">
          {rings.map((r) => <circle key={r.colat} cx="50" cy="50" r={r.r * 50} />)}
          {spokes.map((p) => <line key={p.a} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} />)}
        </g>
        <g className="graticule-line">
          {rings.map((r) => <circle key={r.colat} cx="50" cy="50" r={r.r * 50} />)}
          {spokes.map((p) => <line key={p.a} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} className={p.a % 90 === 0 ? 'major' : undefined} />)}
        </g>
      </svg>
      {rings.filter((r) => r.r < 0.95).map((r) => <span key={r.colat} className="graticule-label num" style={{ left: '50%', top: `${50 - r.r * 50}%` }}>{(-90 + r.colat).toFixed(0)}°</span>)}
      <span className="polar-origin" aria-hidden>South pole</span>
      {points.map((p) => <button key={p.id} className={`polar-pin ${p.id === active.id ? 'polar-pin-selected' : ''}`} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} title={p.name} aria-label={`Select ${p.name}`} onClick={(e) => { e.stopPropagation(); if (p.id !== 'custom') selectSite(p.id); }} onFocus={() => setHover(p.id)} onBlur={() => setHover(null)} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}><span style={{ background: (siteSun.get(p.id)?.fraction ?? 0) > 0 ? '#9a5b00' : '#145e8a' }} /></button>)}
    </div>

    {peaksOpen && (
      <div className="polar-peaks glass rounded-xl" role="region" aria-label="Best lit places">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
          <div><div className="label">Peaks of eternal light</div><div className="text-sm font-semibold">Most sunlit places, {ill ? ill.meta.year : ''}</div></div>
          <button className="btn px-2.5" onClick={() => setPeaksOpen(false)} aria-label="Close best lit places">✕</button>
        </div>
        <div className="overflow-y-auto">
          {!ill && <p className="p-3 text-sm text-haze">Loading…</p>}
          {ill && (
            <table className="w-full text-sm">
              <thead><tr className="label"><th scope="col" className="text-left px-3 py-1">Place</th><th scope="col" className="text-right px-2">Sunlit</th><th scope="col" className="text-right px-2">Longest dark</th><th scope="col" className="text-right px-3">Earth</th></tr></thead>
              <tbody>
                {ill.meta.peaks.map((p, i) => (
                  <tr key={`${p.lat},${p.lon}`} className="border-t border-white/10">
                    <td className="px-3 py-1.5">
                      <button className="underline decoration-dotted text-left" onClick={() => pickPeak(p)} title="Drop a pin here and open its details">
                        <span className="num">{i + 1}. {Math.abs(p.lat).toFixed(3)}°S {p.lon.toFixed(3)}°E</span>
                      </button>
                    </td>
                    <td className="num text-right px-2 text-solar">{p.sunlitPct.toFixed(0)}%</td>
                    <td className="num text-right px-2">{p.longestDarkH < 48 ? `${p.longestDarkH.toFixed(0)} h` : `${(p.longestDarkH / 24).toFixed(1)} d`}</td>
                    <td className="num text-right px-3 text-earth">{p.earthPct.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="px-3 py-2 text-xs text-haze">Ranked from {ill ? `${ill.meta.cellKm} km` : ''} grid cells, then searched locally at the full horizon resolution. A few hundred metres changes these figures, so treat each as a neighbourhood. Opening one drops a pin and shows its details.</p>
        </div>
      </div>
    )}

    {illState === 'loading' && <p className="polar-note glass rounded-xl px-3 py-2 text-sm">Loading the sunlight map…</p>}
    {illState === 'missing' && <p className="polar-note glass rounded-xl px-3 py-2 text-sm" role="alert">The sunlight map is not available in this build. Everything else still works.</p>}

    <div className="polar-bottom glass rounded-xl px-3 py-2">
      {heat !== 'off' && ill && (
        <div className="polar-legend">
          <div className="flex items-baseline justify-between gap-3">
            <span className="label">Share of {periodLabel} in sunlight</span>
            <span className="num text-xs text-haze">{ill.meta.cellKm} km cells</span>
          </div>
          <div className="legend-bar mt-1.5" role="img" aria-label={`Colour scale from dark, meaning none of ${periodLabel} in sunlight, to bright, meaning all of it`} style={{ background: `linear-gradient(90deg, ${SUN_RAMP.join(',')})` }} />
          <div className="flex justify-between num text-[11px] text-haze mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
        </div>
      )}
      <div className="polar-map-caption text-sm" role="status">{focused && <p><b>{focused.name}</b>{sun ? ` · ${sun.fraction === 0 ? '☾ In shadow' : '☀ Sun visible'} · ${sun.clear.toFixed(2)}° above terrain` : ''}</p>}<p className="text-haze" title="Nearby labels are hidden to keep the map clear. Use Sites to select any location.">NASA LRO LOLA / PDS · fixed map lighting, not live sunlight.</p></div>
    </div>
  </section>;
}
