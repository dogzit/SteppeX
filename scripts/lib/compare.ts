/** Compare our topocentric Sun/Earth az/el with Horizons fixtures. Shared by the Vitest test and VALIDATION.md writer. */
import { readdirSync, readFileSync } from 'node:fs';
import { angularSeparation, skyAt } from '../../src/astro/topocentric';
import type { Fixture } from './horizons';

/** Agreement tolerance with JPL Horizons apparent (airless) az/el for a Moon-surface observer, degrees. */
export const TOLERANCE_DEG = 0.1;

export interface Stats { id: string; target: string; note: string; n: number; maxSep: number; meanSep: number; maxDEl: number; maxDAz: number; worstJd: number }

export const jdToDate = (jd: number) => new Date((jd - 2440587.5) * 86400000);

export function compareFixture(fx: Fixture): Stats {
  let maxSep = 0, sum = 0, maxDEl = 0, maxDAz = 0, worstJd = 0;
  for (const [jd, az, el] of fx.rows) {
    const sky = skyAt({ lat: fx.site.lat, lon: fx.site.lon, heightKm: fx.site.alt }, jdToDate(jd));
    const ours = fx.target === 'sun' ? sky.sun : sky.earth;
    const sep = angularSeparation(ours, { az, el });
    let dAz = Math.abs(ours.az - az); if (dAz > 180) dAz = 360 - dAz;
    sum += sep;
    if (sep > maxSep) { maxSep = sep; worstJd = jd; }
    maxDEl = Math.max(maxDEl, Math.abs(ours.el - el));
    maxDAz = Math.max(maxDAz, dAz * Math.cos(el * Math.PI / 180));
  }
  return { id: fx.site.id, target: fx.target, note: fx.site.note, n: fx.rows.length, maxSep, meanSep: sum / fx.rows.length, maxDEl, maxDAz, worstJd };
}

export function loadFixtures(dir = 'tests/fixtures/horizons'): Fixture[] {
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as Fixture);
}
