/**
 * Regression tests for bugs found by the independent accuracy audit (JPL DE421 + NAIF moon_pa_de421 reference,
 * which reproduces the committed Horizons fixtures to 0.00004°).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clearanceAt, computeMetrics, DEFAULT_OPTIONS, nextEvents, type HorizonProfile } from '../src/astro';
import { EphemTable, type EphemMeta } from '../src/astro/ephemTable';
import { setEphemTable } from '../src/astro/series';
import { computeHorizon, type DemSampler } from '../src/astro/horizonCompute';
import sitesJson from '../src/data/sites.json';

const meta = JSON.parse(readFileSync('public/data/ephem.json', 'utf8')) as EphemMeta;
const buf = readFileSync('public/data/ephem.bin');
setEphemTable(EphemTable.fromBuffer(meta, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer));
const horizons = JSON.parse(readFileSync('public/data/horizons.json', 'utf8')) as Record<string, { el: number[]; stepDeg: number; siteHeightM: number; source: 'lola'; label: string }>;
const profile = (id: string): HorizonProfile => ({ ...horizons[id], el: Float32Array.from(horizons[id].el) });
const siteOf = (id: string) => { const s = sitesJson.sites.find((x) => x.id === id)!; return { lat: s.lat, lon: s.lon, heightKm: horizons[id].siteHeightM / 1000 }; };
const DAY = 86400_000;

describe('event times land on a real crossing', () => {
  it('Gläser C1 sunset matches the JPL-based reference (was 65 min late: 07:59:59.56Z)', () => {
    const t = nextEvents(siteOf('glaser-c1'), profile('glaser-c1'), Date.UTC(2026, 0, 3, 7, 13)).sunset!;
    expect(Math.abs(t - Date.parse('2026-03-16T06:55:15Z'))).toBeLessThan(120_000);
  });
  it('every event for every terrain-backed site, 12 lunar months: |clearance| at the event < 0.001°', () => {
    let bad = 0, total = 0;
    for (const id of Object.keys(horizons)) {
      const site = siteOf(id), hz = profile(id);
      for (let k = 0; k < 12; k++) {
        const ev = nextEvents(site, hz, Date.UTC(2026, 0, 3, 7, 13) + k * 29.7 * DAY);
        for (const [name, body] of [['sunset', 'sun'], ['sunrise', 'sun'], ['earthset', 'earth'], ['earthrise', 'earth']] as const) {
          const t = ev[name]; if (t === null) continue; total++;
          if (Math.abs(clearanceAt(site, hz, body, t, DEFAULT_OPTIONS)) > 0.001) bad++;
        }
      }
    }
    expect(total).toBeGreaterThan(500);
    expect(bad).toBe(0);
  });
});

describe('horizon sweep at the exact pole', () => {
  it('a mountain arc covering a quarter of the sky blocks about a quarter of the azimuths (was all-or-half)', () => {
    const arc: DemSampler = { resolutionM: 240, label: 'arc', heightAt: (lat, lon) => (lat > -89.05 && lat < -88.95 && (((lon % 360) + 360) % 360) < 90 ? 1500 : 0) };
    const r = computeHorizon(-90, 0, arc, { eyeHeightM: 2, maxDistKm: 60 });
    const blocked = Array.from(r.el).filter((v) => v > 1).length;
    expect(blocked).toBeGreaterThan(80);
    expect(blocked).toBeLessThan(100);
  });
  it('the shipped south-pole profile is a real profile, not three values', () => {
    expect(new Set(horizons['south-pole'].el).size).toBeGreaterThan(100);
  });
});

describe('window lengths', () => {
  it('longest sun / dark never exceed the window (was 14 d 00 h 10 m for a 14 d window)', () => {
    for (const id of ['glaser-c1', 'artemis-cr', 'apollo11', 'south-pole']) {
      const m = computeMetrics(siteOf(id), profile(id), Date.UTC(2026, 10, 20, 12), 14);
      expect(m.window.longestSunlitMs).toBeLessThanOrEqual(14 * DAY);
      expect(m.window.longestDarkMs).toBeLessThanOrEqual(14 * DAY);
    }
  });
});
