/**
 * Checks refine()'s bracket widening (src/astro/events.ts) on real polar terrain. A code review raised two risks:
 *  1. it does not check which way the body crosses, so a sunset search could return a sunrise;
 *  2. the widened bracket can return a time before `now`, or a window edge outside the requested range.
 * 10 polar library sites (|lat| >= 75°) x 200 seeded start times across 2026-2028. For each start time:
 *  - nextEvents: every event is after the start time; the body is up just before a set and down just after
 *    (the reverse for a rise);
 *  - refinedWindows (Sun, Earth) and the windows derived from them: positive length, inside [start, start + 14 d].
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clearanceAt, complementWindows, DEFAULT_OPTIONS, intersectWindows, nextEvents, refinedWindows, type HorizonProfile, type Window } from '../src/astro';
import { EphemTable, type EphemMeta } from '../src/astro/ephemTable';
import { setEphemTable } from '../src/astro/series';
import sitesJson from '../src/data/sites.json';

const meta = JSON.parse(readFileSync('public/data/ephem.json', 'utf8')) as EphemMeta;
const buf = readFileSync('public/data/ephem.bin');
setEphemTable(EphemTable.fromBuffer(meta, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer));
const horizons = JSON.parse(readFileSync('public/data/horizons.json', 'utf8')) as Record<string, { el: number[]; stepDeg: number; siteHeightM: number; source: 'lola'; label: string }>;
const profile = (id: string): HorizonProfile => ({ ...horizons[id], el: Float32Array.from(horizons[id].el) });
const siteOf = (id: string) => { const s = sitesJson.sites.find((x) => x.id === id)!; return { lat: s.lat, lon: s.lon, heightKm: horizons[id].siteHeightM / 1000 }; };

const DAY = 86400_000, o = DEFAULT_OPTIONS;
const RANGE_START = Date.UTC(2026, 0, 1), RANGE_END = Date.UTC(2029, 0, 1), TIMES = 200, WINDOW_MS = 14 * DAY;
/** refine() stops when its bracket is <= 1 s and returns the middle, so the crossing is within 0.5 s of the result. */
const EPS = 2000;
const POLAR = sitesJson.sites.filter((s) => Math.abs(s.lat) >= 75 && horizons[s.id]).map((s) => s.id);

/** mulberry32: a tiny seeded random generator, so every run tests the same start times. */
function seeded(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** One random time in each of TIMES equal slices of 2026-2028, so they are spread out but rarely on a whole hour. */
const startTimes = (seed: number) => { const r = seeded(seed), slice = (RANGE_END - RANGE_START) / TIMES; return Array.from({ length: TIMES }, (_, k) => Math.floor(RANGE_START + (k + r()) * slice)); };
const iso = (t: number) => new Date(t).toISOString();

/*
 * Known bug, not fixed (LIMITATIONS.md item 14): the grazing fallback in nextEvents().
 * Sun centre clearance at the south pole on 2028-11-27, from the exact calculation, with the hourly table's flag:
 *   05:00Z  table down  -0.04911°
 *   06:00Z  table UP    -0.00030°   <- the table (good to ~0.0015°) shows the Sun up for this one hour
 *   07:00Z  table down  -0.08043°
 * nextEvents() takes [05:00, 06:00] as the sunrise bracket. refine() finds no sign change there, widens to 04:00-07:00
 * (-0.10010° / -0.08043°), still finds none, and returns the nearer edge: 06:00:00Z. Clearance 2 s either side of it is
 * -0.00025° / -0.00034°, so the Sun does not rise there. The real sunrise is 10:57:03Z (refinedWindows() gets it right:
 * night 02:27:31Z -> 10:57:03Z), so the reported time is about 5 h early. Seen from 2 of the 2,000 start times below.
 * When nextEvents() is fixed, the it.fails test below starts failing: then remove `.fails` and KNOWN_FAKE_SUNRISE.
 */
const KNOWN_FAKE_SUNRISE = { id: 'south-pole', t: Date.parse('2028-11-27T06:00:00Z') };

describe('refine() widening on polar terrain', () => {
  it.fails('south-pole: the next sunrise after 2028-11-26T02:27:51Z is a real crossing (known grazing-fallback bug)', () => {
    const site = siteOf('south-pole'), hz = profile('south-pole');
    const t = nextEvents(site, hz, Date.parse('2028-11-26T02:27:51.084Z'), o).sunrise!;
    expect(clearanceAt(site, hz, 'sun', t - EPS, o)).toBeLessThanOrEqual(0);
    expect(clearanceAt(site, hz, 'sun', t + EPS, o)).toBeGreaterThan(0);
  });

  it('covers the 10 polar library sites', () => expect(POLAR).toHaveLength(10));

  for (const [n, id] of POLAR.entries()) {
    it(`${id}: events are in the future and cross the right way; windows are positive and in range`, () => {
      const site = siteOf(id), hz = profile(id), failures: string[] = [];
      for (const now of startTimes(1000 + n)) {
        const ev = nextEvents(site, hz, now, o);
        for (const [name, body, rising] of [['sunset', 'sun', false], ['sunrise', 'sun', true], ['earthset', 'earth', false], ['earthrise', 'earth', true]] as const) {
          const t = ev[name]; if (t === null) continue;
          const before = clearanceAt(site, hz, body, t - EPS, o), after = clearanceAt(site, hz, body, t + EPS, o);
          if (!(t > now)) failures.push(`${id} now=${iso(now)} ${name}=${iso(t)} is not after now (${(t - now) / 1000} s)`);
          if (id === KNOWN_FAKE_SUNRISE.id && name === 'sunrise' && t === KNOWN_FAKE_SUNRISE.t) continue; // covered by it.fails above
          if (rising ?!(before <= 0 && after > 0) : !(before > 0 && after <= 0))
            failures.push(`${id} now=${iso(now)} ${name}=${iso(t)} wrong direction: clearance ${before.toFixed(5)}° at -2 s, ${after.toFixed(5)}° at +2 s`);
        }
        const end = now + WINDOW_MS;
        const sun = refinedWindows(site, hz, 'sun', now, end, o), earth = refinedWindows(site, hz, 'earth', now, end, o);
        const sets: [string, Window[]][] = [['sun', sun], ['earth', earth], ['night', complementWindows(sun, now, end)], ['both', intersectWindows(sun, earth, now, end)]];
        for (const [name, ws] of sets) for (const w of ws) {
          if (!(w.end > w.start) || w.start < now || w.end > end)
            failures.push(`${id} range ${iso(now)} → ${iso(end)} ${name} window ${iso(w.start)} → ${iso(w.end)} (length ${(w.end - w.start) / 1000} s)`);
        }
      }
      expect(failures).toEqual([]);
    });
  }
});
