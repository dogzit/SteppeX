import { useStore } from '@/state/store';
import { subPoints } from '@/astro';
import { useMemo } from 'react';
import { useCompare } from '@/state/compare';

export function Hud() {
  const { timeMs, setTime, view, setView, showGrid, toggleGrid } = useStore();
  const compareOpen = useCompare((s) => s.open), setCompareOpen = useCompare((s) => s.setOpen);
  const d = new Date(timeMs);
  const lib = useMemo(() => subPoints(d), [timeMs]); // eslint-disable-line react-hooks/exhaustive-deps
  const utcLocal = d.toISOString().slice(0, 16);
  return (
    <header className="absolute top-0 inset-x-0 z-20 flex items-start justify-between p-4 gap-4 pointer-events-none">
      <div className="glass rounded-xl px-4 py-3 pointer-events-auto">
        <div className="label">NASA Space Apps 2026 · CLPS</div>
        <h1 className="text-xl font-semibold tracking-tight leading-tight">LUNAR <span className="text-solar">NAVIGATOR</span></h1>
      </div>
      <div className="glass rounded-xl px-4 py-3 pointer-events-auto flex items-center gap-5">
        <div>
          <div className="label">Mission time · UTC</div>
          <div className="num text-lg leading-tight">{d.toISOString().slice(0, 19).replace('T', ' ')}</div>
        </div>
        <label className="flex flex-col"><span className="label">Set · UTC</span>
          <input aria-label="Set date and time" type="datetime-local" className="num bg-transparent text-xs border-b border-white/15 focus:border-solar outline-none" value={utcLocal} onChange={(e) => { const t = Date.parse(e.target.value + ':00Z'); if (!Number.isNaN(t)) setTime(t); }} />
        </label>
        <button className="btn" onClick={() => setTime(Date.now())}>Now</button>
        <div className="hidden md:block border-l border-white/10 pl-5">
          <div className="label">Libration · sub-Earth</div>
          <div className="num text-xs text-earth">{lib.subEarth.lat.toFixed(2)}° {lib.subEarth.lon.toFixed(2)}°</div>
        </div>
      </div>
      <div className="glass rounded-xl px-3 py-3 pointer-events-auto flex items-center gap-2" role="group" aria-label="View">
        <button className={`btn ${view === 'globe' ? 'btn-on' : ''}`} onClick={() => setView('globe')} aria-pressed={view === 'globe'}>Globe</button>
        <button className={`btn ${view === 'polar' ? 'btn-on' : ''}`} onClick={() => setView('polar')} aria-pressed={view === 'polar'}>South pole</button>
        <button className={`btn ${view === 'horizon' ? 'btn-on' : ''}`} onClick={() => setView('horizon')} aria-pressed={view === 'horizon'}>Lander view</button>
        <button className={`btn ${showGrid ? 'btn-on' : ''}`} onClick={toggleGrid} aria-pressed={showGrid}>Grid</button>
        <span className="w-px h-5 bg-white/10 mx-1" />
        <button className={`btn ${compareOpen ? 'btn-on' : ''}`} onClick={() => setCompareOpen(!compareOpen)} aria-pressed={compareOpen}>Compare</button>
      </div>
    </header>
  );
}
