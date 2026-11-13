import { create } from 'zustand';
import { useMemo } from 'react';
import { SITE_BY_ID, type SiteRecord } from '@/data/sites';

export interface CustomSite { lat: number; lon: number; heightKm?: number }
export type ViewMode = 'globe' | 'polar';
export interface ActiveSite { id: string; name: string; lat: number; lon: number; heightKm: number; record?: SiteRecord }

interface State {
  timeMs: number; setTime: (ms: number) => void;
  siteId: string; custom: CustomSite | null;
  selectSite: (id: string) => void; setCustom: (c: CustomSite) => void;
  view: ViewMode; setView: (v: ViewMode) => void;
  showGrid: boolean; toggleGrid: () => void;
  hoverSiteId: string | null; setHover: (id: string | null) => void;
  flyToken: number; // bumps to request a camera fly-to
  zoomNear: boolean; // camera close enough to show all labels
}

export const useStore = create<State>((set) => ({
  timeMs: Date.now(), setTime: (timeMs) => set({ timeMs }),
  siteId: 'artemis-cr', custom: null,
  selectSite: (siteId) => set((s) => ({ siteId, flyToken: s.flyToken + 1 })),
  setCustom: (custom) => set((s) => ({ custom, siteId: 'custom', flyToken: s.flyToken + 1 })),
  view: 'globe', setView: (view) => set((s) => ({ view, flyToken: s.flyToken + 1 })),
  showGrid: false, toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  hoverSiteId: null, setHover: (hoverSiteId) => set({ hoverSiteId }),
  flyToken: 0, zoomNear: false,
}));

export function resolveSite(siteId: string, custom: CustomSite | null): ActiveSite {
  if (siteId === 'custom' && custom) return { id: 'custom', name: 'Custom site', lat: custom.lat, lon: custom.lon, heightKm: custom.heightKm ?? 0 };
  const r = SITE_BY_ID.get(siteId) ?? SITE_BY_ID.get('artemis-cr')!;
  return { id: r.id, name: r.name, lat: r.lat, lon: r.lon, heightKm: r.heightKm ?? 0, record: r };
}
export function useActiveSite(): ActiveSite {
  const siteId = useStore((s) => s.siteId), custom = useStore((s) => s.custom);
  return useMemo(() => resolveSite(siteId, custom), [siteId, custom]);
}
