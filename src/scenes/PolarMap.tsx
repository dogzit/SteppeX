import { useMemo, useRef, useState } from 'react';
import { SITES } from '@/data/sites';
import { useStore, useActiveSite } from '@/state/store';
import { useViewportWidth } from '@/ui/useViewport';
import { useEphemeris } from './useEphemeris';
import { polarPoint, polarLocation } from './polarProjection';

/** A genuine polar-stereographic map: no equirectangular pole sampling or longitude seam. */
export default function PolarMap() {
  const time = useStore((s) => s.timeMs), selectSite = useStore((s) => s.selectSite), setCustom = useStore((s) => s.setCustom);
  const active = useActiveSite(), { siteSun } = useEphemeris(time);
  const [radius, setRadius] = useState(3), [hover, setHover] = useState<string | null>(null);
  const width = useViewportWidth(), map = useRef<HTMLDivElement>(null);
  const markerSide = Math.min(width - 40, 540);
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
  return <section className="polar-map absolute inset-0" aria-label="South pole terrain map">
    <div className="polar-map-controls glass rounded-xl p-2 flex flex-wrap justify-center items-center gap-2" role="group" aria-label="Polar map zoom">
      <span className="label">South pole · terrain map</span>
      <button className="btn" aria-label="Zoom in on south pole" disabled={radius <= 1} onClick={() => setRadius((r) => Math.max(1, r / 2))}>＋</button>
      <button className="btn" aria-label="Zoom out from south pole" disabled={radius >= 15} onClick={() => setRadius((r) => Math.min(15, r * 2))}>−</button>
      <span className="text-sm">{(-90 + radius).toFixed(0)}°S to the pole</span>
    </div>
    <div ref={map} className="polar-disc" onClick={(e) => {
      const box = map.current!.getBoundingClientRect();
      const p = polarLocation((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height, radius);
      setCustom(p);
    }}>
      <img src={`${import.meta.env.BASE_URL}textures/polar-south.png`} alt="NASA LOLA south pole elevation hillshade, in polar stereographic projection" draggable={false} style={{ width: `${imageScale * 100}%`, height: `${imageScale * 100}%` }} />
      <span className="polar-origin" aria-hidden>South pole</span>
      {points.map((p) => <button key={p.id} className={`polar-pin ${p.id === active.id ? 'polar-pin-selected' : ''}`} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} title={p.name} aria-label={`Select ${p.name}`} onClick={(e) => { e.stopPropagation(); if (p.id !== 'custom') selectSite(p.id); }} onFocus={() => setHover(p.id)} onBlur={() => setHover(null)} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}><span style={{ background: (siteSun.get(p.id)?.fraction ?? 0) > 0 ? '#9a5b00' : '#145e8a' }} /></button>)}
    </div>
    <div className="polar-map-caption glass rounded-xl p-2 text-sm" role="status">{focused && <p><b>{focused.name}</b>{sun ? ` · ${sun.fraction === 0 ? '☾ In shadow' : '☀ Sun visible'} · ${sun.clear.toFixed(2)}° above terrain` : ''}</p>}<p className="text-haze">NASA LRO LOLA / PDS · fixed map lighting, not current sunlight. Nearby labels are hidden to keep the map clear. Use Sites to select any location.</p></div>
  </section>;
}
