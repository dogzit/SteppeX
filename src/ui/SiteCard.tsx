import { useActiveSite, useStore } from '@/state/store';
import { fmtLat, fmtLon } from '@/data/sites';
import { skyAt } from '@/astro';
import { useMemo } from 'react';

const CONF: Record<string, [string, string]> = { high: ['Verified', 'text-emerald-300 border-emerald-400/30'], medium: ['Published, limited precision', 'text-sky-300 border-sky-400/30'], approx: ['Approximate region', 'text-rose-300 border-rose-400/30'] };

export function SiteCard() {
  const site = useActiveSite();
  const timeMs = useStore((s) => s.timeMs);
  const sky = useMemo(() => skyAt({ lat: site.lat, lon: site.lon, heightKm: site.heightKm }, new Date(timeMs)), [site.lat, site.lon, site.heightKm, timeMs]);
  const conf = site.record ? CONF[site.record.confidence] : ['Custom input', 'text-white/70 border-white/20'];
  return (
    <section className="absolute right-4 bottom-6 z-20 w-96 glass rounded-xl p-4" aria-label="Selected site">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label">Selected site</div>
          <h2 className="text-lg font-semibold leading-tight">{site.name}</h2>
          <div className="num text-xs text-haze mt-0.5">{fmtLat(site.lat)} · {fmtLon(site.lon)}{site.heightKm ? ` · h ${site.heightKm.toFixed(2)} km` : ''}</div>
        </div>
        <span className={`label border rounded-full px-2 py-0.5 ${conf[1]}`}>{conf[0]}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Metric label="Sun elevation" value={`${sky.sun.el.toFixed(2)}°`} sub={`az ${sky.sun.az.toFixed(1)}°`} tone={sky.sun.el > 0 ? 'text-solar' : 'text-white/50'} />
        <Metric label="Earth elevation" value={`${sky.earth.el.toFixed(2)}°`} sub={`az ${sky.earth.az.toFixed(1)}° · ${sky.earth.radiusDeg.toFixed(2)}° radius`} tone={sky.earth.el > 0 ? 'text-earth' : 'text-white/50'} />
      </div>
      <div className="label normal-case tracking-normal mt-3 text-white/55 leading-snug">
        {site.record?.note && <p className="mb-1">{site.record.note}</p>}
        <p>Horizon: spherical Moon (terrain arrives with the horizon view). Source: {site.record?.source ?? 'user input'}</p>
      </div>
    </section>
  );
}
function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return <div><div className="label">{label}</div><div className={`num text-2xl leading-none ${tone}`}>{value}</div><div className="num text-[10px] text-white/45 mt-1">{sub}</div></div>;
}
