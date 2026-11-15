import { create } from 'zustand';
import { SITES } from '@/data/sites';
import { DEG } from '@/astro';
import { useStore, resolveSite, type CustomSite } from './store';
import { readUrlState, writeUrlState, registerCompareSnapshot } from './url';

export interface Scenario { key: string; siteId: string; custom: CustomSite | null; offsetDays: number }
interface CompareState {
  open: boolean; scenarios: Scenario[]; slipDays: number;
  setOpen: (v: boolean) => void; setSlip: (d: number) => void;
  addCurrent: () => void; remove: (key: string) => void; update: (key: string, patch: Partial<Scenario>) => void;
  nearby: () => void; reset: () => void;
}
let seq = 0;
const fromCurrent = (): Scenario => { const s = useStore.getState(); return { key: `s${++seq}`, siteId: s.siteId, custom: s.custom, offsetDays: 0 }; };

/** Scenarios from a shared link, keeping only ids this build actually knows about. */
function fromUrl() {
  const c = readUrlState().compare;
  if (!c) return null;
  const scenarios = c.scenarios
    .filter((s) => s.siteId === 'custom' || SITES.some((x) => x.id === s.siteId))
    .map((s) => ({ key: `s${++seq}`, siteId: s.siteId, custom: s.custom, offsetDays: s.offsetDays }));
  return scenarios.length ? { scenarios, slipDays: c.slipDays } : null;
}
const initial = fromUrl();

export const useCompare = create<CompareState>((set, get) => ({
  open: !!initial, scenarios: initial?.scenarios ?? [], slipDays: initial?.slipDays ?? 0,
  setOpen: (open) => set((st) => ({ open, scenarios: open && st.scenarios.length === 0 ? [fromCurrent()] : st.scenarios })),
  setSlip: (slipDays) => set({ slipDays }),
  addCurrent: () => set((st) => (st.scenarios.length >= 4 ? st : { scenarios: [...st.scenarios, fromCurrent()] })),
  remove: (key) => set((st) => ({ scenarios: st.scenarios.filter((s) => s.key !== key) })),
  update: (key, patch) => set((st) => ({ scenarios: st.scenarios.map((s) => (s.key === key ? { ...s, ...patch } : s)) })),
  /** Same date, nearby sites: the current site plus its 3 nearest library sites (terrain-backed). */
  nearby: () => {
    const cur = fromCurrent(); const a = resolveSite(cur.siteId, cur.custom);
    const dist = (lat: number, lon: number) => Math.acos(Math.min(1, Math.sin(a.lat * DEG) * Math.sin(lat * DEG) + Math.cos(a.lat * DEG) * Math.cos(lat * DEG) * Math.cos((lon - a.lon) * DEG))) * 1737.4;
    const near = SITES.filter((s) => s.id !== a.id).map((s) => ({ s, d: dist(s.lat, s.lon) })).sort((x, y) => x.d - y.d).slice(0, 3);
    set({ scenarios: [cur, ...near.map((n) => ({ key: `s${++seq}`, siteId: n.s.id, custom: null, offsetDays: 0 }))], open: true });
    void get;
  },
  reset: () => set({ scenarios: [fromCurrent()], slipDays: 0 }),
}));

// A link carries the comparison only while the panel is open, so an untouched session keeps the
// link shape it has always had.
registerCompareSnapshot(() => {
  const c = useCompare.getState();
  return c.open && c.scenarios.length ? { slipDays: c.slipDays, scenarios: c.scenarios.map(({ siteId, custom, offsetDays }) => ({ siteId, custom, offsetDays })) } : undefined;
});
if (typeof window !== 'undefined') {
  let timer = 0;
  useCompare.subscribe(() => { window.clearTimeout(timer); timer = window.setTimeout(() => writeUrlState(useStore.getState()), 400); });
}
