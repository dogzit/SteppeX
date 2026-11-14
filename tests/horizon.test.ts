import { describe, expect, it } from 'vitest';
import { computeHorizon, type DemSampler } from '../src/astro/horizonCompute';
import { DEG, MOON_RADIUS_KM } from '../src/astro/moonFrame';

const flat: DemSampler = { resolutionM: 240, label: 'flat', heightAt: () => 0 };
describe('terrain horizon sweep', () => {
  it('flat sphere: horizon ≈ 0° (just below, from curvature at the first sample)', () => {
    const r = computeHorizon(-85, 10, flat, { eyeHeightM: 0 });
    for (const v of r.el) { expect(v).toBeLessThanOrEqual(0); expect(v).toBeGreaterThan(-0.02); }
  });
  it('a 1000 m wall 10 km due north subtends atan(1000/10000) minus the curvature drop', () => {
    const site = { lat: 0, lon: 0 };
    const wall: DemSampler = { resolutionM: 240, label: 'wall', heightAt: (lat, lon) => (Math.abs(lon) < 0.3 && lat * DEG * MOON_RADIUS_KM * 1000 >= 9900 && lat * DEG * MOON_RADIUS_KM * 1000 <= 10100 ? 1000 : 0) };
    const r = computeHorizon(site.lat, site.lon, wall, { eyeHeightM: 0, azStepDeg: 1 });
    const expected = Math.atan2(1000 - (10000 ** 2) / (2 * MOON_RADIUS_KM * 1000), 10000) / DEG; // 5.71° − 0.165°
    expect(r.el[0]).toBeCloseTo(expected, 1);
    expect(r.el[180]).toBeLessThan(0); // nothing to the south
  });
  it('eye height lowers the apparent horizon of nearby terrain', () => {
    const bump: DemSampler = { resolutionM: 240, label: 'bump', heightAt: (lat) => (lat > 0.01 && lat < 0.03 ? 50 : 0) };
    const a = computeHorizon(0, 0, bump, { eyeHeightM: 0 }).el[0], b = computeHorizon(0, 0, bump, { eyeHeightM: 10 }).el[0];
    expect(b).toBeLessThan(a);
  });
});
