import { useMemo } from 'react';
import { PLANETS, planetAzEl, planetClearance, nextCrossings, planetFromMoon, moonState, angleBetween, skyAt, horizonAt, type HorizonProfile, type Crossings } from '@/astro';
import { useStore, useActiveSite } from '@/state/store';
import { useMetrics } from '@/state/useMetrics';
import { fmtDateTime, fmtDuration } from './format';

const DIR = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compass = (az: number) => DIR[Math.round((((az % 360) + 360) % 360) / 22.5) % 16];
const HOUR = 3600_000, DAY = 86400_000;
const SEARCH = 60 * DAY, STEP = 2 * HOUR;

interface Row { name: string; color: string; el: number; az: number; mag?: number; up: boolean; cross: Crossings; comment: string; elong?: number }

/** "Sky from the site" table: rise, set, highest point, direction and a plain-language visibility comment for Sun, Earth and planets. */
export function SkyTable() {
  const site = useActiveSite(); const timeMs = useStore((s) => s.timeMs); const { stats, live, horizon } = useMetrics();
  const bucket = Math.floor(timeMs / HOUR) * HOUR;
  const s = useMemo(() => ({ lat: site.lat, lon: site.lon, heightKm: site.heightKm }), [site]);
  const planetEvents = useMemo(() => PLANETS.map((b) => nextCrossings(planetClearance(s, horizon, b), bucket, SEARCH, STEP)), [s, horizon, bucket]);
  const rows = useMemo<Row[]>(() => {
    const d = new Date(timeMs), st = moonState(d);
    const out: Row[] = [];
    const sunRow: Row = { name: 'Sun', color: '#ffb547', el: live.sunClear, az: live.sun.az, up: live.sunUp, cross: { upNow: live.sunUp, rise: stats.next.sunrise, set: stats.next.sunset, transit: null, maxEl: 0, searchedUntil: 0 }, comment: '' };
    sunRow.comment = live.sunUp ? `Up · sets in ${stats.next.sunset ? fmtDuration(stats.next.sunset - timeMs) : '> 400 d'}` : `Below horizon · rises in ${stats.next.sunrise ? fmtDuration(stats.next.sunrise - timeMs) : '> 400 d'}`;
    out.push(sunRow);
    const phase = (1 - Math.cos(angleBetween(st.sun, st.earth) * Math.PI / 180)) / 2;
    const later = moonState(new Date(timeMs + HOUR)); const waxing = (1 - Math.cos(angleBetween(later.sun, later.earth) * Math.PI / 180)) / 2 > phase;
    out.push({ name: 'Earth', color: '#5fc3ff', el: live.earth.el - live.earthHorizon, az: live.earth.az, up: live.earthUp, cross: { upNow: live.earthUp, rise: stats.next.earthrise, set: stats.next.earthset, transit: null, maxEl: 0, searchedUntil: 0 },
      comment: `${live.earthUp ? 'Visible · DTE link possible' : 'Below horizon · no direct-to-Earth link'} · phase ${(phase * 100).toFixed(0)}% ${waxing ? 'waxing' : 'waning'}` });
    PLANETS.forEach((b, i) => {
      const a = planetAzEl(s, b, d), cr = planetEvents[i], up = a.el - horizonAt(horizon, a.az) > 0;
      const elong = angleBetween(planetFromMoon(b, d).vec, st.sun);
      let comment: string;
      if (up) comment = elong < 6 ? `Lost in the Sun's glare (${elong.toFixed(0)}° from the Sun)` : live.sunUp ? `Visible in daylight — no atmosphere, no blue sky${a.mag > 5 ? ' · needs binoculars' : ''}` : a.mag < 2 ? 'Perfect visibility' : a.mag < 5 ? 'Average visibility' : 'Difficult to see · binoculars';
      else comment = cr.rise ? `Below horizon · rises in ${fmtDuration(cr.rise - timeMs)}` : 'Does not rise in the next 60 d';
      out.push({ name: b, color: '#d8dee8', el: a.el - horizonAt(horizon, a.az), az: a.az, mag: a.mag, up, cross: cr, comment, elong });
    });
    return out;
  }, [timeMs, live, stats, s, horizon, planetEvents]);
  const hz: HorizonProfile = horizon; void hz; void skyAt;
  return (
    <section aria-label="Sky from the site">
      <div className="label mb-1">Sky from the site · now and next 60 d</div>
      <table className="w-full text-[11px] num border-collapse">
        <thead><tr className="label text-left"><th className="font-normal pb-1">Body</th><th className="font-normal pb-1">Above terrain</th><th className="font-normal pb-1">Dir</th><th className="font-normal pb-1">Rise</th><th className="font-normal pb-1">Set</th><th className="font-normal pb-1">Mag</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <>
              <tr key={r.name} className="border-t border-white/8">
                <td className="py-1 pr-2 font-display" style={{ color: r.up ? r.color : 'rgba(255,255,255,.45)' }}>{r.name}</td>
                <td className={`py-1 pr-2 ${r.up ? '' : 'text-white/40'}`}>{r.el.toFixed(1)}°</td>
                <td className="py-1 pr-2 text-white/70" title={`azimuth ${r.az.toFixed(1)}°`}>{compass(r.az)} <span className="text-white/35">{r.az.toFixed(0)}°</span></td>
                <td className="py-1 pr-2 text-white/70">{r.cross.rise ? fmtDateTime(r.cross.rise).slice(5, 16) : '—'}</td>
                <td className="py-1 pr-2 text-white/70">{r.cross.set ? fmtDateTime(r.cross.set).slice(5, 16) : '—'}</td>
                <td className="py-1 text-white/50">{r.mag !== undefined ? r.mag.toFixed(1) : ''}</td>
              </tr>
              <tr key={r.name + '-c'}><td colSpan={6} className="pb-1 text-[10px] text-white/50 font-display">{r.comment}</td></tr>
            </>
          ))}
        </tbody>
      </table>
      <p className="label normal-case tracking-normal text-white/40 mt-1">Heights are measured above nearby terrain, not flat ground. Earth radio visibility also uses your clearance setting. Rise/set use the terrain horizon. Times UTC. No atmosphere: no twilight, no refraction, planets visible by day away from the Sun.</p>
    </section>
  );
}
