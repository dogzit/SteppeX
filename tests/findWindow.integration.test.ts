/** Integration: findWindow() driven by the real engine (astronomy-engine + the shipped ephemeris table). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findWindow } from '../src/astro/findWindow';
import { EphemTable, type EphemMeta } from '../src/astro/ephemTable';
import { setEphemTable } from '../src/astro/series';
import { SPHERE_HORIZON, DEFAULT_OPTIONS } from '../src/astro';
import sitesJson from '../src/data/sites.json';

const DAY = 86400_000;
const meta = JSON.parse(readFileSync('public/data/ephem.json', 'utf8')) as EphemMeta;
const buf = readFileSync('public/data/ephem.bin');
setEphemTable(EphemTable.fromBuffer(meta, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer));
const tableEnd = meta.startMs + (meta.count - 1) * meta.stepMs; // 2031-01-01T00:00:00Z, see scripts/build-ephemeris.ts

const site = sitesJson.sites.find((s) => s.id === 'artemis-cr')!; // a real south-pole candidate site
const siteGeom = { lat: site.lat, lon: site.lon, heightKm: site.heightKm ?? 0 };

function assertWellFormed(out: ReturnType<typeof findWindow>, searchStart: number, searchEnd: number) {
  expect(Array.isArray(out.candidates)).toBe(true);
  expect(Number.isFinite(out.longestSunlitMs)).toBe(true);
  expect(Number.isFinite(out.bestEarthOverlapMs)).toBe(true);
  for (const c of out.candidates) {
    expect(c.start).toBeGreaterThanOrEqual(searchStart);
    expect(c.end).toBeLessThanOrEqual(searchEnd);
    expect(c.end - c.start).toBeCloseTo(48 * 3600_000, 0);
    if (c.earthInterval) expect(c.earthInterval.end).toBeGreaterThanOrEqual(c.earthInterval.start);
  }
}

describe('findWindow — ephemeris boundary stays within available data', () => {
  it('fully inside the precomputed table (2030-06-01 .. +90d): uses the table, no throw', () => {
    const searchStart = Date.UTC(2030, 5, 1), searchEnd = searchStart + 90 * DAY;
    expect(searchEnd).toBeLessThan(tableEnd);
    const out = findWindow({ site: siteGeom, horizon: SPHERE_HORIZON, searchStart, searchEnd, requiredSunMs: 48 * 3600_000, requiredEarthMs: 2 * 3600_000, options: DEFAULT_OPTIONS });
    assertWellFormed(out, searchStart, searchEnd);
  });

  it('a search window that overruns the table boundary (2030-12-20 .. +90d) still runs and stays correct', () => {
    const searchStart = Date.UTC(2030, 11, 20), searchEnd = searchStart + 90 * DAY; // crosses 2031-01-01
    expect(searchEnd).toBeGreaterThan(tableEnd); // this request genuinely exceeds the table
    expect(() => findWindow({ site: siteGeom, horizon: SPHERE_HORIZON, searchStart, searchEnd, requiredSunMs: 48 * 3600_000, requiredEarthMs: 2 * 3600_000, options: DEFAULT_OPTIONS })).not.toThrow();
    const out = findWindow({ site: siteGeom, horizon: SPHERE_HORIZON, searchStart, searchEnd, requiredSunMs: 48 * 3600_000, requiredEarthMs: 2 * 3600_000, options: DEFAULT_OPTIONS });
    assertWellFormed(out, searchStart, searchEnd);
  });

  it('entirely past the table (2031-02-01 .. +90d) falls back to exact ephemeris and still returns sane results', () => {
    const searchStart = Date.UTC(2031, 1, 1), searchEnd = searchStart + 90 * DAY;
    expect(searchStart).toBeGreaterThan(tableEnd);
    const out = findWindow({ site: siteGeom, horizon: SPHERE_HORIZON, searchStart, searchEnd, requiredSunMs: 48 * 3600_000, requiredEarthMs: 2 * 3600_000, options: DEFAULT_OPTIONS });
    assertWellFormed(out, searchStart, searchEnd);
  });
});
