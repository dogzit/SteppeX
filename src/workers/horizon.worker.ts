/// <reference lib="webworker" />
/** Computes a terrain horizon for an arbitrary point from downsampled LOLA tiles (fetched lazily, cached in the worker). */
import { computeHorizon, composite, cylindricalProject, makeRasterSampler, polarProject, type DemSampler } from '@/astro/horizonCompute';

interface TileMeta { name: string; file: string; proj: 'polar' | 'cyl'; centerLat?: -90 | 90; ppd?: number; width: number; height: number; scale: number; scaleM?: number; lineOffset?: number; sampleOffset?: number; label: string }
const samplers = new Map<string, Promise<DemSampler>>();
let metas: Promise<TileMeta[]> | null = null;

async function tile(base: string, m: TileMeta): Promise<DemSampler> {
  if (!samplers.has(m.name)) samplers.set(m.name, (async () => {
    const buf = await fetch(`${base}data/${m.file}`).then((r) => r.arrayBuffer());
    const data = new Int16Array(buf);
    if (m.proj === 'polar') return makeRasterSampler(data, m.width, m.height, m.scale, polarProject(m.centerLat!, m.scaleM!, m.lineOffset!, m.sampleOffset!), m.scaleM!, m.label);
    return makeRasterSampler(data, m.width, m.height, m.scale, cylindricalProject(m.ppd!, m.width, m.height), 1737400 * Math.PI / 180 / m.ppd!, m.label, true);
  })());
  return samplers.get(m.name)!;
}
self.onmessage = async (e: MessageEvent<{ id: number; lat: number; lon: number; base: string }>) => {
  const { id, lat, lon, base } = e.data;
  try {
    metas ??= fetch(`${base}data/dem_tiles.json`).then((r) => r.json() as Promise<TileMeta[]>);
    const all = await metas;
    const wanted = all.filter((m) => m.proj === 'cyl' || (lat < -75 && m.centerLat === -90) || (lat > 75 && m.centerLat === 90));
    const parts = await Promise.all(wanted.filter((m) => m.proj === 'polar').concat(wanted.filter((m) => m.proj === 'cyl')).map((m) => tile(base, m)));
    const dem = composite(parts, 'LOLA tiles');
    const r = computeHorizon(lat, lon, dem, { eyeHeightM: 2, maxDistKm: 250, azStepDeg: 1 });
    const finest = parts[0].label;
    self.postMessage({ id, el: r.el, siteHeightM: r.siteHeightM, label: `${finest}; 250 km sweep; eye 2 m` }, [r.el.buffer as ArrayBuffer]);
  } catch (err) { self.postMessage({ id, error: String(err) }); }
};
