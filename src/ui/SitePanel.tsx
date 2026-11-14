import { useEffect, useState } from 'react';
import { SITES, GROUP_LABEL, GROUP_ORDER, COORD_DECIMALS, fmtLat, fmtLon } from '@/data/sites';
import { useStore } from '@/state/store';

const STATUS: Record<string, string> = { landed: 'text-emerald-300', planned: 'text-sky-300', failed: 'text-rose-300', region: 'text-solar', reference: 'text-haze' };

export function SitePanel({ compact = false, onClose }: { compact?: boolean; onClose?: () => void }) {
  const { siteId, selectSite, setCustom, setHover, custom } = useStore();
  const [q, setQ] = useState('');
  const [lat, setLat] = useState(custom ? custom.lat.toFixed(COORD_DECIMALS) : '-89.5');
  const [lon, setLon] = useState(custom ? custom.lon.toFixed(COORD_DECIMALS) : '0');
  // Keep the displayed text in step with the committed value (a globe click, a URL-loaded pin, or this
  // form's own submit) at the same precision as the header, without touching full precision in the store
  // or fighting the user's own in-progress keystrokes (which only change local state, not `custom`).
  useEffect(() => {
    if (custom) { setLat(custom.lat.toFixed(COORD_DECIMALS)); setLon(custom.lon.toFixed(COORD_DECIMALS)); }
  }, [custom]);
  const filtered = SITES.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <aside className={compact ? 'compact-drawer absolute inset-x-4 top-28 bottom-36 z-30 glass rounded-xl flex flex-col overflow-hidden' : 'absolute left-4 top-28 bottom-36 z-20 w-80 max-w-[calc(100vw-2rem)] glass rounded-xl flex flex-col overflow-hidden'} aria-label="Site library">
      <div className="p-3 border-b border-white/10 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="label mb-1">Site library · {SITES.length} sites</div>
          <input aria-label="Search sites" placeholder="Search sites…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm outline-none focus:border-solar/60" />
        </div>
        {onClose && <button className="btn shrink-0" onClick={onClose} aria-label="Close site library">✕</button>}
      </div>
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {GROUP_ORDER.map((g) => {
          const items = filtered.filter((s) => s.group === g); if (!items.length) return null;
          return (
            <div key={g} className="mb-2">
              <div className="label px-2 pt-2 pb-1">{GROUP_LABEL[g]}</div>
              {items.map((s) => (
                <button key={s.id} onClick={() => selectSite(s.id)} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} aria-current={s.id === siteId}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center justify-between gap-2 hover:bg-white/8 ${s.id === siteId ? 'bg-solar/12 text-white' : 'text-white/85'}`}>
                  <span className="truncate">{s.name}</span>
                  <span className={`num text-[10px] shrink-0 ${STATUS[s.status]}`}>{fmtLat(s.lat)} {fmtLon(s.lon)}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <form className="p-3 border-t border-white/10 grid grid-cols-[1fr_1fr_auto] gap-2 items-end" onSubmit={(e) => { e.preventDefault(); const a = +lat, b = +lon; if (Math.abs(a) <= 90 && Math.abs(b) <= 360) setCustom({ lat: a, lon: b }); }}>
        <label className="flex flex-col"><span className="label">Lat °</span><input aria-label="Custom latitude" className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={lat} onChange={(e) => setLat(e.target.value)} /></label>
        <label className="flex flex-col"><span className="label">Lon °E</span><input aria-label="Custom longitude" className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={lon} onChange={(e) => setLon(e.target.value)} /></label>
        <button className="btn btn-on h-8" type="submit">Pin</button>
        <div className="col-span-3 label normal-case tracking-normal text-white/50">or click anywhere on the Moon to drop a pin</div>
      </form>
    </aside>
  );
}
