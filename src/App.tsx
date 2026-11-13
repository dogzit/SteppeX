import { lazy, Suspense, useEffect, useState } from 'react';
import { Hud } from './ui/Hud';
import { SitePanel } from './ui/SitePanel';
import { SiteCard } from './ui/SiteCard';
const Globe = lazy(() => import('./scenes/Globe'));

function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

export default function App() {
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => setGl(hasWebGL()), []);
  return (
    <div className="relative h-full w-full hud-grid">
      {gl === false ? (
        <div className="absolute inset-0 grid place-items-center text-center p-8"><div className="glass rounded-xl p-6 max-w-md"><div className="label">WebGL unavailable</div><p className="mt-2 text-sm text-white/80">The 3D globe needs WebGL. The dashboard and timeline still work: pick a site on the left.</p></div></div>
      ) : (
        <Suspense fallback={<div className="absolute inset-0 grid place-items-center"><div className="label animate-pulse">Loading lunar surface…</div></div>}>{gl && <Globe />}</Suspense>
      )}
      <Hud />
      <SitePanel />
      <SiteCard />
      <div className="grain" aria-hidden />
    </div>
  );
}
