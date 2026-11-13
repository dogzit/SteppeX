import { describe, expect, it } from 'vitest';
import { moonBodyFixedMatrix, subPoints, apply, mul, transpose } from '../src/astro/moonFrame';
import { MakeTime } from 'astronomy-engine';

describe('Moon frame sanity', () => {
  it('rotation matrix is orthonormal', () => {
    const m = moonBodyFixedMatrix(MakeTime(new Date('2026-01-01T00:00:00Z')));
    const i = mul(m, transpose(m));
    for (let k = 0; k < 9; k++) expect(i[k]).toBeCloseTo(k % 4 === 0 ? 1 : 0, 10);
  });
  it('sub-Earth point stays within optical libration bounds (|lat| < 7°, |lon| < 9°)', () => {
    for (let d = 0; d < 400; d += 3) {
      const p = subPoints(new Date(Date.UTC(2026, 0, 1 + d)));
      expect(Math.abs(p.subEarth.lat)).toBeLessThan(7);
      expect(Math.abs(p.subEarth.lon)).toBeLessThan(9);
      expect(Math.abs(p.subSolar.lat)).toBeLessThan(1.6);
    }
  });
  it('sub-solar longitude advances ~12.19°/day westward (retrograde in east-lon), consistent with a 29.53 d synodic month', () => {
    const a = subPoints(new Date('2026-03-01T00:00:00Z')).subSolar.lon;
    const b = subPoints(new Date('2026-03-02T00:00:00Z')).subSolar.lon;
    let d = a - b; if (d < -180) d += 360; if (d > 180) d -= 360;
    expect(d).toBeCloseTo(360 / 29.53, 0);
    void apply;
  });
});
