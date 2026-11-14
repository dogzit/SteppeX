import { useEffect, useMemo, useState } from 'react';
import { SPHERE_HORIZON, type HorizonProfile } from '@/astro';
import { useStore, type ActiveSite } from './store';

interface StoredProfile { stepDeg: number; el: number[]; label: string; resolutionM: number; siteHeightM: number }
const library = new Map<string, HorizonProfile & { siteHeightM: number }>();
let libraryLoaded = false;

/** Loads precomputed LOLA horizon profiles for the site library (75 KB). */
export async function loadHorizons() {
  try {
    const data = await fetch(`${import.meta.env.BASE_URL}data/horizons.json`).then((r) => r.json() as Promise<Record<string, StoredProfile>>);
    for (const [id, p] of Object.entries(data)) library.set(id, { stepDeg: p.stepDeg, el: Float32Array.from(p.el), source: 'lola', label: p.label, resolutionM: p.resolutionM, siteHeightM: p.siteHeightM });
    libraryLoaded = true;
    useStore.setState({ horizonsReady: true });
  } catch (e) { console.warn('horizon profiles unavailable; using smooth sphere', e); }
}
export const getLibraryHorizon = (id: string) => library.get(id);

// Custom-pin horizons via a Web Worker (lazy tiles).
let worker: Worker | null = null, seq = 0;
const pending = new Map<number, (p: HorizonProfile) => void>();
const customCache = new Map<string, HorizonProfile>();
export function requestCustomHorizon(lat: number, lon: number): Promise<HorizonProfile> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const hit = customCache.get(key); if (hit) return Promise.resolve(hit);
  if (!worker) {
    worker = new Worker(new URL('../workers/horizon.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; el?: Float32Array; label?: string; error?: string }>) => {
      const cb = pending.get(e.data.id); pending.delete(e.data.id); if (!cb) return;
      if (e.data.el) cb({ stepDeg: 1, el: e.data.el, source: 'lola', label: e.data.label! }); else cb({ ...SPHERE_HORIZON, label: `Smooth sphere (terrain tiles unavailable: ${e.data.error})` });
    };
  }
  return new Promise((resolve) => { const id = ++seq; pending.set(id, (p) => { customCache.set(key, p); resolve(p); }); worker!.postMessage({ id, lat, lon, base: import.meta.env.BASE_URL }); });
}

/** Terrain horizon for the active site: library profile, or a worker-computed one for custom pins (smooth sphere while computing). */
export function useHorizon(site: ActiveSite): HorizonProfile {
  const ready = useStore((s) => s.horizonsReady);
  const [custom, setCustom] = useState<{ key: string; p: HorizonProfile } | null>(null);
  const key = `${site.lat.toFixed(4)},${site.lon.toFixed(4)}`;
  useEffect(() => {
    if (site.id !== 'custom') return;
    let alive = true;
    requestCustomHorizon(site.lat, site.lon).then((p) => { if (alive) setCustom({ key, p }); });
    return () => { alive = false; };
  }, [site.id, site.lat, site.lon, key]);
  return useMemo(() => {
    if (site.id === 'custom') return custom?.key === key ? custom.p : { ...SPHERE_HORIZON, label: 'Computing terrain horizon from LOLA tiles…' };
    return (ready && libraryLoaded && library.get(site.id)) || SPHERE_HORIZON;
  }, [site.id, ready, custom, key]);
}
