import { useEffect, useState } from 'react';
import { useStore } from '@/state/store';
const prefersStill = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export function shouldIntro() { try { return !prefersStill && !new URLSearchParams(location.search).has('nointro') && !sessionStorage.getItem('ln-intro'); } catch { return !prefersStill; } }
/** Boot sequence: wordmark + status lines while data loads, then hands off to the camera fly-in. ~2.5 s, skippable. */
export function Intro({ onDone }: { onDone: () => void }) {
  const ephem = useStore((s) => s.ephemReady), hz = useStore((s) => s.horizonsReady);
  const [t, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT((v) => v + 1), 100); return () => clearInterval(id); }, []);
  useEffect(() => { if (t >= 26) { try { sessionStorage.setItem('ln-intro', '1'); } catch { /* ignore */ } onDone(); } }, [t, onDone]);
  const lines = [[2, 'Finding the Sun and Earth', ephem], [8, 'Loading mountains and craters', hz], [14, 'Loading places to explore', true], [19, 'Positions checked against NASA reference data', true]] as const;
  return (
    <div className="intro-screen absolute inset-0 z-[60] grid place-items-center cursor-pointer" onClick={onDone} role="status" aria-live="polite">
      <div className="intro-glow" aria-hidden />
      <div className="text-center relative">
        <div className="label mb-2">NASA Space Apps 2026 · CLPS</div>
        <div className="text-5xl font-semibold tracking-tight">LUNAR <span className="text-solar">NAVIGATOR</span></div>
        <div className="label normal-case mt-3 text-sm">Sunlight, terrain and Earth contact for every landing site</div>
        <div className="mt-6 space-y-1 text-left inline-block">
          {lines.map(([at, text, ok]) => <div key={text} className={`num text-xs transition-opacity duration-300 ${t >= at ? 'opacity-100' : 'opacity-0'}`}><span className={ok ? 'text-emerald-300' : 'text-solar'}>{ok ? '●' : '○'}</span> <span className="text-white/75">{text}</span></div>)}
        </div>
        <div className="mt-6 h-px w-64 mx-auto bg-white/10 overflow-hidden"><div className="h-full bg-solar transition-all duration-100" style={{ width: `${Math.min(100, (t / 26) * 100)}%` }} /></div>
        <button className="btn mt-3" onClick={(e) => { e.stopPropagation(); onDone(); }}>Skip introduction</button>
      </div>
    </div>
  );
}
