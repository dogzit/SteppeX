import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { EphemTable, generateEphem, type EphemMeta } from '../src/astro/ephemTable';
import { moonState, unit, norm, dot, DEG } from '../src/astro/moonFrame';

const angle = (a: number[], b: number[]) => Math.acos(Math.min(1, dot(unit(a as never), unit(b as never)))) / DEG;

describe('ephemeris table', () => {
  const startMs = Date.UTC(2026, 5, 1), stepMs = 3600_000, count = 72;
  const meta: EphemMeta = { version: 1, startMs, stepMs, count, frame: 'test' };
  const table = EphemTable.fromBuffer(meta, generateEphem(startMs, stepMs, count).buffer as ArrayBuffer);
  it('interpolates within 0.003° / 2 km of the exact ephemeris', () => {
    const out = { sun: [0, 0, 0] as [number, number, number], earth: [0, 0, 0] as [number, number, number] };
    for (let k = 0; k < 50; k++) {
      const ms = startMs + Math.random() * (count - 1) * stepMs;
      expect(table.sample(ms, out)).toBe(true);
      const ex = moonState(new Date(ms));
      expect(angle(out.sun, ex.sun)).toBeLessThan(0.003);
      expect(angle(out.earth, ex.earth)).toBeLessThan(0.003);
      expect(Math.abs(norm(out.earth) - norm(ex.earth))).toBeLessThan(2);
    }
  });
  it('rejects out-of-range times', () => {
    const out = { sun: [0, 0, 0] as [number, number, number], earth: [0, 0, 0] as [number, number, number] };
    expect(table.sample(startMs - 1, out)).toBe(false);
    expect(table.sample(startMs + count * stepMs, out)).toBe(false);
  });
  it('shipped public/data/ephem.bin matches exact ephemeris (if built)', () => {
    if (!existsSync('public/data/ephem.bin')) return;
    const m = JSON.parse(readFileSync('public/data/ephem.json', 'utf8')) as EphemMeta;
    const buf = readFileSync('public/data/ephem.bin');
    const t = EphemTable.fromBuffer(m, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    const out = { sun: [0, 0, 0] as [number, number, number], earth: [0, 0, 0] as [number, number, number] };
    for (const iso of ['2024-02-22T23:23:00Z', '2027-07-04T12:00:00Z', '2030-12-31T23:00:00Z']) {
      const ms = Date.parse(iso);
      expect(t.sample(ms, out)).toBe(true);
      const ex = moonState(new Date(ms));
      expect(angle(out.sun, ex.sun)).toBeLessThan(0.003);
      expect(angle(out.earth, ex.earth)).toBeLessThan(0.003);
    }
  });
});
