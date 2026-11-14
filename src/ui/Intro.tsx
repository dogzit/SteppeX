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
  const lines = [[2, 'Ephemeris · astronomy-engine + IAU 2009 Moon frame', ephem], [8, 'Terrain · LRO LOLA horizons', hz], [14, 'Sites · 31 verified coordinates', true], [19, 'Validation · JPL Horizons Δ ≤ 0.009°', true]] as const;
  return (
    <div className="absolute inset-0 z-[60] bg-ink grid place-items-center cursor-pointer" onClick={onDone} role="status" aria-live="polite">
      <div className="text-center">
        <div className="label mb-2">NASA Space Apps 2026 · CLPS</div>
        <div className="text-5xl font-semibold tracking-tight">LUNAR <span className="text-solar">NAVIGATOR</span></div>
        <div className="mt-6 space-y-1 text-left inline-block">
          {lines.map(([at, text, ok]) => <div key={text} className={`num text-xs transition-opacity duration-300 ${t >= at ? 'opacity-100' : 'opacity-0'}`}><span className={ok ? 'text-emerald-300' : 'text-solar'}>{ok ? '●' : '○'}</span> <span className="text-white/75">{text}</span></div>)}
        </div>
        <div className="mt-6 h-px w-64 mx-auto bg-white/10 overflow-hidden"><div className="h-full bg-solar transition-all duration-100" style={{ width: `${Math.min(100, (t / 26) * 100)}%` }} /></div>
        <div className="label mt-3 text-white/35">click to skip</div>
      </div>
    </div>
  );
}
