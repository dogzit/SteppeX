import { useEffect, useRef, useState } from 'react';
import type { ViewMode } from '@/state/store';

const ITEMS: { v: ViewMode; label: string; key: string }[] = [
  { v: 'globe', label: 'Globe', key: '1' },
  { v: 'polar', label: 'South pole', key: '2' },
  { v: 'horizon', label: 'Lander view', key: '3' },
];

/** Keyboard-accessible overflow menu for the view switcher, used once the three segmented buttons no
 *  longer fit the header (compact layouts). Button + role="menu" popup, Escape/outside-click to close,
 *  arrow keys to move between items, Enter/Space to pick one — every item is also a focusable <button>,
 *  so it stays fully operable even without the arrow-key affordance. */
export function ViewsMenu({ view, setView }: { view: ViewMode; setView: (v: ViewMode) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = ITEMS.find((i) => i.v === view) ?? ITEMS[0];

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus();
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const buttons = root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    if (!buttons) return;
    const idx = Array.from(buttons).findIndex((button) => button === document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(idx + 1) % ITEMS.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(idx - 1 + ITEMS.length) % ITEMS.length]?.focus(); }
  };

  return (
    <div className="relative" ref={root}>
      <button ref={trigger} className="btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} title="More views">
        More views: {current.label} ▾
      </button>
      {open && (
        <div role="menu" aria-label="More views" className="absolute left-0 top-full mt-1 glass rounded-lg overflow-hidden min-w-[10rem] z-30 py-1" onKeyDown={onMenuKeyDown}>
          {ITEMS.map((i) => (
            <button key={i.v} role="menuitem" aria-current={i.v === view} title={`${i.label} (${i.key})`}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${i.v === view ? 'bg-solar/15 text-solar' : 'text-white/80 hover:bg-white/8'}`}
              onClick={() => { setView(i.v); setOpen(false); trigger.current?.focus(); }}>
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
