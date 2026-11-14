import { useEffect, useRef } from 'react';
/** Trap Tab in a modal and restore the invoking control on close. */
export function useDialogFocus() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const container = ref.current;
    const controls = () => [...(container?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select, summary, a[href], [tabindex="0"]') ?? [])].filter((el) => el.getClientRects().length > 0);
    (controls()[0] ?? container)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = controls(), first = list[0], last = list.at(-1);
      if (!first) { e.preventDefault(); container?.focus(); return; }
      if (e.shiftKey && (document.activeElement === first || !container?.contains(document.activeElement))) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    container?.addEventListener('keydown', onKey);
    return () => { container?.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus(); };
  }, []);
  return ref;
}
