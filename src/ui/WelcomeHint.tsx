import { useState } from 'react';
import { en } from '@/i18n/en';
import { useStore } from '@/state/store';
export function WelcomeHint() {
  const [open, setOpen] = useState(() => { try { return !localStorage.getItem('ln-welcome-dismissed'); } catch { return true; } });
  const setMode = useStore((s) => s.setMode);
  const dismiss = () => { setOpen(false); try { localStorage.setItem('ln-welcome-dismissed', '1'); } catch { /* works without storage */ } };
  if (!open) return null;
  return <section className="welcome-hint glass absolute z-20 rounded-xl p-3 text-sm" aria-label="Getting started">
    <div className="flex justify-between gap-3"><p className="font-semibold">Your Moon, two ways to explore</p><button className="btn" aria-label="Dismiss getting started" onClick={dismiss}>✕</button></div>
    <p className="my-2 text-haze">{en.firstStep}</p>
    <div className="flex flex-wrap gap-2"><button className="btn btn-on" onClick={() => { setMode('explorer'); dismiss(); }}>Simple · for everyone</button><button className="btn" onClick={() => { setMode('planner'); dismiss(); }}>Expert · advanced planning</button></div>
  </section>;
}
