import { useEffect, useState } from 'react';

/** Below this width the site library and dashboard become toggleable drawers and the view switcher
 *  collapses into a "More views" menu; at or above it the original always-visible desktop layout is used
 *  unchanged (this is also comfortably above the 1440px width Playwright's default viewport uses). */
export const COMPACT_BREAKPOINT_PX = 1280;

/** Reactive viewport width (resize + orientation change), SSR-safe (this app has no SSR, but avoids a
 *  window reference crash if it were ever prerendered). */
export function useViewportWidth(): number {
  const [w, setW] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return w;
}

export function useCompact(): boolean {
  return useViewportWidth() < COMPACT_BREAKPOINT_PX;
}
