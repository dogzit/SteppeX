import { useEffect, useRef, useState } from 'react';
import { useStore, useActiveSite } from '@/state/store';
import { useMetrics } from '@/state/useMetrics';
import { useNotice } from './notice';
import { fmtDateTime } from './format';

/** Event log: announces sunrise/sunset/Earthrise/Earthset as the mission clock crosses them (polite live region). */
export function Toasts() {
  const notice = useNotice((s) => s.text);
  const site = useActiveSite(); const timeMs = useStore((s) => s.timeMs); const { stats } = useMetrics();
  const [log, setLog] = useState<{ id: number; text: string }[]>([]);
  const last = useRef(timeMs); const seq = useRef(0);
  useEffect(() => {
    const a = last.current, b = timeMs; last.current = b;
    if (Math.abs(b - a) > 3 * 86400_000) return; // jumps, not playback
    const ev: [string, number | null][] = [['☀ Sunset', stats.next.sunset], ['☀ Sunrise', stats.next.sunrise], ['⊕ Earth goes out of view', stats.next.earthset], ['⊕ Earth comes into view', stats.next.earthrise]];
    for (const [name, t] of ev) if (t !== null && ((a < t && t <= b) || (b < t && t <= a))) { const id = ++seq.current; setLog((l) => [...l.slice(-3), { id, text: `${name} · ${site.name.split(' · ')[0]} · ${fmtDateTime(t)}` }]); setTimeout(() => setLog((l) => l.filter((x) => x.id !== id)), 6000); }
  }, [timeMs, stats, site.name]);
  return <div className="app-notices absolute left-1/2 -translate-x-1/2 bottom-40 z-50 space-y-1 pointer-events-none" aria-live="polite">{notice && <p role="status" className="glass rounded-xl p-3 text-sm">{notice}</p>}{log.map((l) => <div key={l.id} className="glass rounded-md px-3 py-1.5 text-xs num">{l.text}</div>)}</div>;
}
