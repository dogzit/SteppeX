/** Node-side loaders producing DemSamplers from cached LOLA products. */
import { existsSync } from 'node:fs';
import { readDem } from './pds';
import { composite, cylindricalProject, makeRasterSampler, polarProject, type DemSampler } from '../../src/astro/horizonCompute';

export function loadGlobal(base = '.cache/ldem_16'): DemSampler {
  const d = readDem(base); const ppd = +d.label.MAP_RESOLUTION;
  return makeRasterSampler(d.data, d.width, d.height, d.scale, cylindricalProject(ppd, d.width, d.height), 1000 * 1737.4 * Math.PI / 180 / ppd, `LOLA LDEM ${ppd} px/deg (${(1737.4 * Math.PI / 180 / ppd).toFixed(1)} km/px)`, true);
}
export function loadPolar(base: string, flipY = false): DemSampler | null {
  if (!existsSync(`${base}.img`)) return null;
  const d = readDem(base); const scale = +d.label.MAP_SCALE, center = +d.label.CENTER_LATITUDE as -90 | 90;
  // PDS LOLA polar products: 1-based I = x/MAP_SCALE + N/2 + 0.5 (dsmap_polar.cat), so the 0-based index of the pole is
  // (N-1)/2, which is exactly *_PROJECTION_OFFSET (e.g. 1905.5 for N = 3812). The earlier '- 0.5' shifted terrain by half a pixel.
  const proj = polarProject(center, scale, +d.label.LINE_PROJECTION_OFFSET, +d.label.SAMPLE_PROJECTION_OFFSET);
  const p = flipY ? (lat: number, lon: number) => { const r = proj(lat, lon); return r && ([r[0], d.height - 1 - r[1]] as [number, number]); } : proj;
  return makeRasterSampler(d.data, d.width, d.height, d.scale, p, scale, `LOLA LDEM polar ${scale} m/px`);
}
export function loadAll(): { dem: DemSampler; parts: string[] } {
  const parts: DemSampler[] = [], names: string[] = [];
  for (const b of ['.cache/ldem_85s_40m', '.cache/ldem_75s_240m', '.cache/ldem_75n_240m']) { const s = loadPolar(b); if (s) { parts.push(s); names.push(b.split('/').pop()!); } }
  const g = loadGlobal(); parts.push(g); names.push('ldem_16');
  return { dem: composite(parts, 'LOLA composite'), parts: names };
}
