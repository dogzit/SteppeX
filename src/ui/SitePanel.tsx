import { useEffect, useState } from 'react';
import { SITES, GROUP_LABEL, GROUP_ORDER, COORD_DECIMALS, fmtLat, fmtLon } from '@/data/sites';
import { useActiveSite, useStore } from '@/state/store';

const STATUS: Record<string, string> = { landed: 'text-emerald-300', planned: 'text-sky-300', failed: 'text-rose-300', region: 'text-solar', reference: 'text-haze' };

export function SitePanel({ compact = false, onClose }: { compact?: boolean; onClose?: () => void }) {
  const { siteId, selectSite, setCustom, setHover } = useStore();
  const active = useActiveSite();
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [lat, setLat] = useState(active.lat.toFixed(COORD_DECIMALS));
  const [lon, setLon] = useState(active.lon.toFixed(COORD_DECIMALS));
  // Keep the displayed text in step with the committed value (a globe click, a URL-loaded pin, or this
  // form's own submit) at the same precision as the header, without touching full precision in the store
  // or fighting the user's own in-progress keystrokes (which only change local state, not `custom`).
  useEffect(() => {
    setLat(active.lat.toFixed(COORD_DECIMALS)); setLon(active.lon.toFixed(COORD_DECIMALS));
  }, [active.lat, active.lon]);
  const filtered = SITES.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <aside className={compact ? 'compact-drawer absolute inset-x-4 top-28 bottom-36 z-30 glass rounded-xl flex flex-col overflow-hidden' : 'absolute left-4 top-28 bottom-36 z-20 w-80 max-w-[calc(100vw-2rem)] glass rounded-xl flex flex-col overflow-hidden'} aria-label="Choose a site">
      <div className="p-3 border-b border-white/10 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="label mb-1">Choose a site · {SITES.length} sites</div>
          <input aria-label="Search sites" placeholder="Search by name, such as Apollo…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm outline-none focus:border-solar/60" />
        </div>
        {onClose && <button className="btn shrink-0" onClick={onClose} aria-label="Close site list">✕</button>}
      </div>
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {filtered.length === 0 && <div className="p-3 text-sm" role="status"><p>No sites match “{q}”. Try a shorter name or choose a place on the Moon.</p><button className="btn mt-2" onClick={() => setQ('')}>Clear search</button></div>}
        {GROUP_ORDER.map((g) => {
          const items = filtered.filter((s) => s.group === g); if (!items.length) return null;
          return (
            <div key={g} className="mb-2">
              <div className="label px-2 pt-2 pb-1">{GROUP_LABEL[g]}</div>
              {items.map((s) => (
                <button key={s.id} onClick={() => selectSite(s.id)} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} aria-current={s.id === siteId}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex flex-col gap-0.5 hover:bg-white/8 ${s.id === siteId ? 'bg-solar/12 text-white' : 'text-white/85'}`}>
                  <span className="leading-snug break-words">{s.name}</span>
                  <span className={`num text-[10px] leading-tight ${STATUS[s.status]}`}>{fmtLat(s.lat)} {fmtLon(s.lon)}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <form className="p-3 border-t border-white/10 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end" onSubmit={(e) => { e.preventDefault(); const a = +lat, b = +lon; if (!lat.trim() || !lon.trim() || !Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 360) { setError('Enter a latitude from −90 to 90 and a longitude from −360 to 360. For example: −89.5 and 0.'); return; } setError(''); setCustom({ lat: a, lon: b }); }}>
        <label className="flex min-w-0 flex-col"><span className="label">Latitude °</span><input aria-label="Custom latitude" inputMode="decimal" aria-invalid={!!error} aria-describedby={error ? 'coordinate-error' : undefined} className="num min-w-0 w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={lat} onChange={(e) => setLat(e.target.value)} /></label>
        <label className="flex min-w-0 flex-col"><span className="label">Longitude °E</span><input aria-label="Custom longitude" inputMode="decimal" aria-invalid={!!error} aria-describedby={error ? 'coordinate-error' : undefined} className="num min-w-0 w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={lon} onChange={(e) => setLon(e.target.value)} /></label>
        <button className="btn btn-on h-8" type="submit">Add pin</button>
        {error && <p id="coordinate-error" role="alert" className="col-span-3 text-xs text-rose-300">{error}</p>}
        <div className="col-span-3 label normal-case tracking-normal text-white/50">Or tap the Moon to choose a location.</div>
      </form>
    </aside>
  );
}
