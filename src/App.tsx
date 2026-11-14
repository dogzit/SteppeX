import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Hud } from './ui/Hud';
import { SitePanel } from './ui/SitePanel';
import { Dashboard } from './ui/Dashboard';
import { Timeline } from './ui/Timeline';
import { Compare } from './ui/Compare';
import { Methodology } from './ui/Methodology';
import { CommandPalette, useCommands } from './ui/CommandPalette';
import { Intro, shouldIntro } from './ui/Intro';
import { Tour } from './ui/Tour';
import { Toasts } from './ui/Toasts';
import { useStore, SYNODIC_MONTH_DAYS_MS } from './state/store';
import { useCompare } from './state/compare';
import { loadEphemTable } from './state/ephemLoader';
import { loadHorizons } from './state/useHorizon';
import { useCompact } from './ui/useViewport';
const Globe = lazy(() => import('./scenes/Globe'));
const HorizonDome = lazy(() => import('./scenes/HorizonDome'));

function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

/** Advances simulated time while playing (sim seconds per real second = speed). */
function usePlayback() {
  const playing = useStore((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now(), raf = 0;
    const tick = (now: number) => { const { speed, stepTime } = useStore.getState(); stepTime((now - last) * speed); last = now; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}
const typing = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };

export default function App() {
  const [gl, setGl] = useState<boolean | null>(null);
  const [intro, setIntro] = useState(shouldIntro);
  const [palette, setPalette] = useState(false);
  const [meth, setMeth] = useState(false);
  const [tour, setTour] = useState<number | null>(null);
  useEffect(() => { setGl(hasWebGL()); void loadEphemTable(); void loadHorizons(); if (!shouldIntro()) useStore.setState({ introDone: true }); }, []);
  usePlayback();
  const view = useStore((s) => s.view), mode = useStore((s) => s.mode);
  const compareOpen = useCompare((s) => s.open);
  const openMeth = useCallback(() => setMeth(true), []);
  const commands = useCommands(openMeth);
  const onIntroDone = useCallback(() => { setIntro(false); useStore.setState((s) => ({ introDone: true, flyToken: s.flyToken + 1, cinematic: true })); }, []);

  // Below 1280px the site library and dashboard become toggleable drawers (both start closed, so the
  // globe is the first thing a user sees) instead of always-visible asides; at 1280px+ nothing here
  // changes the original layout. Opening one drawer closes the other — there's only room for one at a time.
  const compact = useCompact();
  const [siteDrawerOpen, setSiteDrawerOpenRaw] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpenRaw] = useState(false);
  const setSiteDrawerOpen = useCallback((open: boolean) => { setSiteDrawerOpenRaw(open); if (open) setDetailsDrawerOpenRaw(false); }, []);
  const setDetailsDrawerOpen = useCallback((open: boolean) => { setDetailsDrawerOpenRaw(open); if (open) setSiteDrawerOpenRaw(false); }, []);
  const siteId = useStore((s) => s.siteId), custom = useStore((s) => s.custom);
  const lastPinKey = useRef(`${siteId}|${custom?.lat}|${custom?.lon}`);
  useEffect(() => {
    // Placing a pin (globe click, library pick, or the custom-coordinate form) should surface its details
    // without the user having to open anything manually — but only react to an actual selection change,
    // never to the initial mount or to a resize crossing the compact breakpoint (the mission clock is
    // never touched by any of this, by construction).
    const key = `${siteId}|${custom?.lat}|${custom?.lon}`;
    if (key !== lastPinKey.current) {
      lastPinKey.current = key;
      if (compact) setDetailsDrawerOpen(true);
    }
  }, [siteId, custom, compact, setDetailsDrawerOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); return; }
      if (e.key === 'Escape') { setPalette(false); setMeth(false); useCompare.getState().setOpen(false); return; }
      if (e.key === ' ' && (e.target as HTMLElement | null)?.closest('button')) return;
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useStore.getState();
      switch (e.key) {
        case ' ': e.preventDefault(); s.togglePlay(); break;
        case 'ArrowRight': s.stepTime(e.shiftKey ? SYNODIC_MONTH_DAYS_MS : 86400_000); break;
        case 'ArrowLeft': s.stepTime(e.shiftKey ? -SYNODIC_MONTH_DAYS_MS : -86400_000); break;
        case '1': s.setView('globe'); break; case '2': s.setView('polar'); break; case '3': s.setView('horizon'); break;
        case 'g': case 'G': s.toggleGrid(); break;
        case 'c': case 'C': useCompare.getState().setOpen(!useCompare.getState().open); break;
        case 'm': case 'M': s.setMode(s.mode === 'planner' ? 'explorer' : 'planner'); break;
        case '?': setMeth(true); break;
        case 't': case 'T': setTour(0); break;
      }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative h-full w-full hud-grid">
      {gl === false ? (
        <div className="absolute inset-0 grid place-items-center text-center p-8"><div className="glass rounded-xl p-6 max-w-md"><div className="label">WebGL unavailable</div><p className="mt-2 text-sm text-white/80">The 3D views need WebGL. The dashboard, sky table, timeline and compare mode still work: pick a site on the left.</p></div></div>
      ) : (
        <Suspense fallback={<div className="absolute inset-0 grid place-items-center"><div className="label animate-pulse">Loading lunar surface…</div></div>}>{gl && (view === 'horizon' ? <HorizonDome /> : <Globe />)}</Suspense>
      )}
      <Hud onPalette={() => setPalette(true)} onMethodology={openMeth} onTour={() => setTour(0)}
        compact={compact} siteDrawerOpen={siteDrawerOpen} onToggleSiteDrawer={() => setSiteDrawerOpen(!siteDrawerOpen)}
        detailsDrawerOpen={detailsDrawerOpen} onToggleDetailsDrawer={() => setDetailsDrawerOpen(!detailsDrawerOpen)} />
      {!compareOpen && (compact
        ? <>
            {siteDrawerOpen && <SitePanel compact onClose={() => setSiteDrawerOpen(false)} />}
            {detailsDrawerOpen && <Dashboard compact explorer={mode === 'explorer'} onClose={() => setDetailsDrawerOpen(false)} />}
          </>
        : <><SitePanel /><Dashboard explorer={mode === 'explorer'} /></>)}
      <Timeline />
      <Compare />
      <Toasts />
      {tour !== null && <Tour step={tour} setStep={setTour} />}
      {meth && <Methodology onClose={() => setMeth(false)} />}
      {palette && <CommandPalette commands={commands} onClose={() => setPalette(false)} />}
      {intro && <Intro onDone={onIntroDone} />}
      <div className="grain" aria-hidden />
    </div>
  );
}
