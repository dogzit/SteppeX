import { useState } from 'react';
import { useStore } from '@/state/store';
import { useCompare } from '@/state/compare';
import { ViewsMenu } from './ViewsMenu';

interface HudProps {
  onPalette: () => void;
  onMethodology: () => void;
  onTour: () => void;
  compact?: boolean;
  siteDrawerOpen?: boolean;
  onToggleSiteDrawer?: () => void;
  detailsDrawerOpen?: boolean;
  onToggleDetailsDrawer?: () => void;
}

export function Hud({ onPalette, onMethodology, onTour, compact = false, siteDrawerOpen, onToggleSiteDrawer, detailsDrawerOpen, onToggleDetailsDrawer }: HudProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const { timeMs, setTime, view, setView, showGrid, toggleGrid, mode, setMode } = useStore();
  const compareOpen = useCompare((s) => s.open), setCompareOpen = useCompare((s) => s.setOpen);
  const d = new Date(timeMs);
  const utcLocal = d.toISOString().slice(0, 16);
  const seg = (on: boolean) => `px-2.5 py-1.5 text-xs transition-colors ${on ? 'bg-solar/20 text-solar' : 'bg-white/5 text-white/75 hover:bg-white/10'}`;
  return (
    <header data-tools-open={toolsOpen} className="app-hud absolute top-0 inset-x-0 z-40 flex flex-wrap items-stretch justify-between p-4 gap-3 pointer-events-none">
      <div className="glass rounded-xl px-4 py-2.5 pointer-events-auto shrink-0 flex flex-col justify-center">
        <div className="label">NASA Space Apps 2026 · CLPS</div>
        <h1 className="text-lg font-semibold tracking-tight leading-tight whitespace-nowrap">LUNAR <span className="text-solar">NAVIGATOR</span></h1>
      </div>
      <div className="glass rounded-xl px-4 py-2 pointer-events-auto flex items-center gap-4 shrink-0">
        <div>
          <div className="label">Mission time · UTC</div>
          <div className="num text-lg leading-tight whitespace-nowrap" aria-live="off">{d.toISOString().slice(0, 19).replace('T', ' ')}</div>
        </div>
        <input aria-label="Set date and time (UTC)" title="Set date and time (UTC)" type="datetime-local" className="num bg-transparent text-xs border-b border-white/15 focus:border-solar outline-none" value={utcLocal} onChange={(e) => { const t = Date.parse(e.target.value + ':00Z'); if (!Number.isNaN(t)) setTime(t); }} />
        <button className="btn" onClick={() => setTime(Date.now())}>Now</button>
      </div>
      <div className="glass rounded-xl px-2.5 py-2 pointer-events-auto flex items-center gap-2 shrink-0 flex-wrap">
        {(
          <div className="flex items-center gap-2" role="group" aria-label="Panels">
            <button className={`btn ${siteDrawerOpen ? 'btn-on' : ''}`} onClick={onToggleSiteDrawer} aria-expanded={siteDrawerOpen} title="Site library">Sites</button>
            <button className={`btn ${detailsDrawerOpen ? 'btn-on' : ''}`} onClick={onToggleDetailsDrawer} aria-expanded={detailsDrawerOpen} title="Selected site details">Details</button>
          </div>
        )}
        {compact ? (
          <ViewsMenu view={view} setView={setView} />
        ) : (
          <div className="flex rounded-md overflow-hidden border border-white/10" role="group" aria-label="View">
            <button className={seg(view === 'globe')} onClick={() => setView('globe')} aria-pressed={view === 'globe'} title="Globe (1)">Globe</button>
            <button className={seg(view === 'polar')} onClick={() => setView('polar')} aria-pressed={view === 'polar'} title="South pole (2)">South pole</button>
            <button className={seg(view === 'horizon')} onClick={() => setView('horizon')} aria-pressed={view === 'horizon'} title="Lander view (3)">Lander view</button>
          </div>
        )}
        <button className={`btn ${showGrid ? 'btn-on' : ''}`} onClick={toggleGrid} aria-pressed={showGrid} title="Selenographic grid (G)">Grid</button>
        <button className={`btn ${compareOpen ? 'btn-on' : ''}`} onClick={() => setCompareOpen(!compareOpen)} aria-pressed={compareOpen} title="Compare scenarios (C)">Compare</button>
        <span className="w-px h-5 bg-white/10" />
        <div className="flex rounded-md overflow-hidden border border-white/10" role="group" aria-label="Audience mode">
          <button className={seg(mode === 'planner')} aria-pressed={mode === 'planner'} onClick={() => setMode('planner')} title="Planner mode (M)">Planner</button>
          <button className={`px-2.5 py-1.5 text-xs transition-colors ${mode === 'explorer' ? 'bg-earth/20 text-earth' : 'bg-white/5 text-white/75 hover:bg-white/10'}`} aria-pressed={mode === 'explorer'} onClick={() => setMode('explorer')} title="Explorer mode (M)">Explorer</button>
        </div>
        {mode === 'explorer' && <button className="btn" onClick={onTour} title="Guided tour (T)">Tour</button>}
        <button className="btn" onClick={onMethodology} title="Methodology & limitations (?)" aria-label="Methodology and limitations">?</button>
        <button className="btn num" onClick={onPalette} title="Command palette (Ctrl/⌘ K)" aria-label="Command palette">⌘K</button>
      </div>
      <div className="phone-toolbar glass rounded-xl pointer-events-auto">
        <h1 className="text-xs font-semibold leading-tight">LUNAR<br /><span className="text-solar">NAVIGATOR</span></h1>
        <button className={`btn ${siteDrawerOpen ? 'btn-on' : ''}`} onClick={() => { setToolsOpen(false); onToggleSiteDrawer?.(); }} aria-expanded={siteDrawerOpen}>Sites</button>
        <button className={`btn ${detailsDrawerOpen ? 'btn-on' : ''}`} onClick={() => { setToolsOpen(false); onToggleDetailsDrawer?.(); }} aria-expanded={detailsDrawerOpen}>Details</button>
        <button className="btn" onClick={() => setToolsOpen((v) => !v)} aria-expanded={toolsOpen} aria-label={toolsOpen ? 'Close controls' : 'Open controls'}>{toolsOpen ? '✕' : '•••'}</button>
      </div>
    </header>
  );
}
