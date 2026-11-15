import { create } from 'zustand';
import { useMemo } from 'react';
import { SITE_BY_ID, type SiteRecord } from '@/data/sites';
import { readUrlState, writeUrlState } from './url';
import { SYNODIC_MONTH_DAYS } from '@/astro';

export interface CustomSite { lat: number; lon: number; heightKm?: number }
export type ViewMode = 'globe' | 'polar' | 'horizon';
export type Span = 'day' | 'month' | 'year';
export type Mode = 'planner' | 'explorer';
export interface ActiveSite { id: string; name: string; lat: number; lon: number; heightKm: number; record?: SiteRecord }
export const SPAN_MS: Record<Span, number> = { day: 86400_000, month: SYNODIC_MONTH_DAYS * 86400_000, year: 365.25 * 86400_000 };
export const SYNODIC_MONTH_DAYS_MS = SYNODIC_MONTH_DAYS * 86400_000;
export const SPEEDS = [60, 600, 3600, 6 * 3600, 86400, 7 * 86400] as const; // simulated seconds per real second

interface State {
  timeMs: number; setTime: (ms: number) => void; stepTime: (deltaMs: number) => void;
  playing: boolean; speed: number; togglePlay: () => void; setSpeed: (s: number) => void;
  siteId: string; custom: CustomSite | null; prevSiteId: string;
  selectSite: (id: string) => void; setCustom: (c: CustomSite) => void; clearCustom: () => void;
  view: ViewMode; setView: (v: ViewMode) => void;
  span: Span; setSpan: (s: Span) => void;
  windowDays: number; setWindowDays: (d: number) => void;
  sunsetDef: 'center' | 'limb'; setSunsetDef: (d: 'center' | 'limb') => void;
  earthMarginDeg: number; setEarthMargin: (d: number) => void;
  mode: Mode; setMode: (m: Mode) => void;
  showGrid: boolean; toggleGrid: () => void;
  hoverSiteId: string | null; setHover: (id: string | null) => void;
  flyToken: number; zoomNear: boolean; ephemReady: boolean; horizonsReady: boolean; introDone: boolean; cinematic: boolean;
  /** Find-a-window: search settings (persisted) and the currently shared/highlighted mission window. */
  fwSunHours: number; fwEarthHours: number; setFwSunHours: (h: number) => void; setFwEarthHours: (h: number) => void;
  fwSelStart: number | null; fwSelEnd: number | null; setFwSelection: (start: number, end: number) => void; clearFwSelection: () => void;
}

const url = readUrlState();
export const useStore = create<State>((set) => ({
  timeMs: url.timeMs ?? Date.now(), setTime: (timeMs) => set({ timeMs }), stepTime: (d) => set((s) => ({ timeMs: s.timeMs + d })),
  playing: false, speed: 3600, togglePlay: () => set((s) => ({ playing: !s.playing })), setSpeed: (speed) => set({ speed }),
  siteId: url.siteId ?? 'artemis-cr', custom: url.custom ?? null, prevSiteId: 'artemis-cr',
  selectSite: (siteId) => set((s) => ({ siteId, flyToken: s.flyToken + 1 })),
  // Dropping a pin remembers where you were, so removing it can put you back.
  setCustom: (custom) => set((s) => ({ custom, siteId: 'custom', prevSiteId: s.siteId === 'custom' ? s.prevSiteId : s.siteId, flyToken: s.flyToken + 1 })),
  clearCustom: () => set((s) => ({ custom: null, siteId: s.prevSiteId, flyToken: s.flyToken + 1 })),
  view: url.view ?? 'globe', setView: (view) => set((s) => ({ view, flyToken: s.flyToken + 1 })),
  span: url.span ?? 'month', setSpan: (span) => set({ span }),
  windowDays: url.windowDays ?? 14, setWindowDays: (windowDays) => set({ windowDays }),
  sunsetDef: url.sunsetDef ?? 'center', setSunsetDef: (sunsetDef) => set({ sunsetDef }),
  earthMarginDeg: url.earthMarginDeg ?? 5, setEarthMargin: (earthMarginDeg) => set({ earthMarginDeg }),
  mode: url.mode ?? 'explorer', setMode: (mode) => set({ mode }),
  showGrid: false, toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  hoverSiteId: null, setHover: (hoverSiteId) => set({ hoverSiteId }),
  flyToken: 0, zoomNear: false, ephemReady: false, horizonsReady: false, introDone: false, cinematic: false,
  fwSunHours: url.fwSunHours ?? 48, fwEarthHours: url.fwEarthHours ?? 2,
  setFwSunHours: (fwSunHours) => set({ fwSunHours }), setFwEarthHours: (fwEarthHours) => set({ fwEarthHours }),
  fwSelStart: url.fwSelStart ?? null, fwSelEnd: url.fwSelEnd ?? null,
  setFwSelection: (fwSelStart, fwSelEnd) => set({ fwSelStart, fwSelEnd }),
  clearFwSelection: () => set({ fwSelStart: null, fwSelEnd: null }),
}));

// URL sync (throttled)
if (typeof window !== 'undefined') {
  let timer: number | undefined;
  useStore.subscribe((s) => { window.clearTimeout(timer); timer = window.setTimeout(() => writeUrlState(s), 400); });
}

export function resolveSite(siteId: string, custom: CustomSite | null): ActiveSite {
  if (siteId === 'custom' && custom) return { id: 'custom', name: 'Custom site', lat: custom.lat, lon: custom.lon, heightKm: custom.heightKm ?? 0 };
  const r = SITE_BY_ID.get(siteId) ?? SITE_BY_ID.get('artemis-cr')!;
  return { id: r.id, name: r.name, lat: r.lat, lon: r.lon, heightKm: r.heightKm ?? 0, record: r };
}
export function useActiveSite(): ActiveSite {
  const siteId = useStore((s) => s.siteId), custom = useStore((s) => s.custom);
  return useMemo(() => resolveSite(siteId, custom), [siteId, custom]);
}
