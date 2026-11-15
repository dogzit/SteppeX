import { useEffect, useMemo, useRef, useState } from 'react';
import { useDialogFocus } from './useDialogFocus';
import { SITES, fmtLat, fmtLon } from '@/data/sites';
import { useStore } from '@/state/store';
import { useCompare } from '@/state/compare';

export interface Command { id: string; title: string; hint?: string; run: () => void | Promise<void> }
export function useCommands(openMethodology: () => void): Command[] {
  const s = useStore(); const c = useCompare();
  return useMemo(() => {
    const dates: [string, string][] = [['Now', new Date().toISOString()], ['Apollo 11 landing', '1969-07-20T20:17:40Z'], ['Chandrayaan-3 landing', '2023-08-23T12:32:00Z'], ['IM-1 landing', '2024-02-22T23:23:00Z'], ['Blue Ghost M1 landing', '2025-03-02T08:34:00Z'], ['Blue Ghost M1 sunset', '2025-03-16T00:00:00Z'], ['Artemis IV example landing date (not confirmed)', '2028-02-01T00:00:00Z']];
    const cmds: Command[] = [
      { id: 'v-globe', title: 'View: Globe', hint: '1', run: () => s.setView('globe') },
      { id: 'v-polar', title: 'View: South pole', hint: '2', run: () => s.setView('polar') },
      { id: 'v-horizon', title: 'View: Lander view', hint: '3', run: () => s.setView('horizon') },
      { id: 'play', title: s.playing ? 'Pause' : 'Play', hint: 'Space', run: s.togglePlay },
      { id: 'grid', title: 'Show or hide map lines', hint: 'G', run: s.toggleGrid },
      { id: 'compare', title: c.open ? 'Close compare' : 'Open compare', hint: 'C', run: () => c.setOpen(!c.open) },
      { id: 'nearby', title: 'Compare: same date, nearby sites', run: c.nearby },
      { id: 'mode', title: s.mode === 'planner' ? 'Switch to Simple mode' : 'Switch to Expert mode', hint: 'M', run: () => s.setMode(s.mode === 'planner' ? 'explorer' : 'planner') },
      { id: 'meth', title: 'Help and glossary', hint: '?', run: openMethodology },
      { id: 'share', title: 'Copy shareable link', run: async () => { if (!navigator.clipboard) throw new Error('clipboard unavailable'); await navigator.clipboard.writeText(window.location.href); } },
      ...SITES.map((x) => ({ id: `s-${x.id}`, title: `Go to: ${x.name}`, hint: `${fmtLat(x.lat)} ${fmtLon(x.lon)}`, run: () => { s.selectSite(x.id); } })),
      ...dates.map(([t, iso]) => ({ id: `d-${t}`, title: `Jump to: ${t}`, hint: iso.slice(0, 16).replace('T', ' ') + 'Z', run: () => s.setTime(Date.parse(iso)) })),
    ];
    return cmds;
  }, [s, c, openMethodology]);
}

export function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const dialog = useDialogFocus();
  const [feedback, setFeedback] = useState('');
  const [q, setQ] = useState(''); const [i, setI] = useState(0); const input = useRef<HTMLInputElement>(null);
  const list = useMemo(() => { const n = q.trim().toLowerCase(); return (n ? commands.filter((c) => (c.title + ' ' + (c.hint ?? '')).toLowerCase().includes(n)) : commands).slice(0, 14); }, [q, commands]);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => setI(0), [q]);
  const run = async (c: Command) => { try { await c.run(); if (c.id === 'share') setFeedback('Link copied. You can share this site and date.'); else onClose(); } catch { setFeedback('The link could not be copied. Copy the address from your browser’s address bar instead.'); } };
  return (
    <div className="absolute inset-0 z-50 scrim flex items-start justify-center pt-[12vh]" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search sites and actions" ref={dialog} tabIndex={-1}>
      <div className="glass rounded-xl w-[34rem] max-w-[92vw] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-4 pt-3"><h2 className="font-semibold">Find a site or action</h2><button className="btn" onClick={onClose}>Close search</button></div>
        <input ref={input} role="combobox" aria-expanded={true} aria-controls="search-results" aria-autocomplete="list" aria-activedescendant={list[i] ? `command-${list[i].id}` : undefined} aria-label="Search sites and actions" className="w-full bg-transparent px-4 py-3 text-base outline-none border-b border-white/10" placeholder="Jump to a site, a date, a view…" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(list.length - 1, v + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(0, v - 1)); } else if (e.key === 'Enter' && list[i]) run(list[i]); else if (e.key === 'Escape') onClose(); }} />
        <p role="status" className="px-4 text-sm text-haze">{feedback}</p>
        <ul id="search-results" aria-label="Matching sites and actions" role="listbox" className="max-h-[50vh] overflow-y-auto py-1">
          {list.map((c, k) => <li key={c.id} id={`command-${c.id}`} role="option" aria-selected={k === i}><button className={`w-full text-left px-4 py-2 text-sm flex justify-between gap-3 ${k === i ? 'bg-solar/15 text-white' : 'text-white/85 hover:bg-white/6'}`} onMouseEnter={() => setI(k)} onClick={() => run(c)}><span>{c.title}</span><span className="num text-[10px] text-white/45">{c.hint}</span></button></li>)}
          {list.length === 0 && <li className="px-4 py-3 text-sm text-white/50">No matches yet. Try a shorter site name, a mission name, or “Help”.</li>}
        </ul>
        <div className="px-4 py-2 label normal-case tracking-normal text-white/40 border-t border-white/10">Use ↑ and ↓ to choose, Enter to open, or Escape to close. Choosing a site keeps your selected date.</div>
      </div>
    </div>
  );
}
