import { lazy, Suspense, useEffect, useState } from 'react';
import { Hud } from './ui/Hud';
import { SitePanel } from './ui/SitePanel';
import { Dashboard } from './ui/Dashboard';
import { Timeline } from './ui/Timeline';
import { useStore } from './state/store';
import { loadEphemTable } from './state/ephemLoader';
import { loadHorizons } from './state/useHorizon';
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

export default function App() {
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => { setGl(hasWebGL()); void loadEphemTable(); void loadHorizons(); }, []);
  usePlayback();
  const view = useStore((s) => s.view);
  return (
    <div className="relative h-full w-full hud-grid">
      {gl === false ? (
        <div className="absolute inset-0 grid place-items-center text-center p-8"><div className="glass rounded-xl p-6 max-w-md"><div className="label">WebGL unavailable</div><p className="mt-2 text-sm text-white/80">The 3D globe needs WebGL. The dashboard and timeline still work: pick a site on the left.</p></div></div>
      ) : (
        <Suspense fallback={<div className="absolute inset-0 grid place-items-center"><div className="label animate-pulse">Loading lunar surface…</div></div>}>{gl && (view === 'horizon' ? <HorizonDome /> : <Globe />)}</Suspense>
      )}
      <Hud />
      <SitePanel />
      <Dashboard />
      <Timeline />
      <div className="grain" aria-hidden />
    </div>
  );
}
