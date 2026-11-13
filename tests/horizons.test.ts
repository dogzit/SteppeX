import { describe, expect, it } from 'vitest';
import { compareFixture, loadFixtures, TOLERANCE_DEG } from '../scripts/lib/compare';




describe('Sun/Earth az-el vs JPL Horizons', () => {
  const fixtures = loadFixtures();
  it('has fixtures for at least 3 sites x 2 targets', () => {
    expect(new Set(fixtures.map((f) => f.site.id)).size).toBeGreaterThanOrEqual(3);
    expect(fixtures.length).toBeGreaterThanOrEqual(6);
  });
  for (const fx of fixtures) {
    it(`${fx.site.id} / ${fx.target}: max separation <= ${TOLERANCE_DEG}° over ${fx.rows.length} epochs`, () => {
      const s = compareFixture(fx);
      expect(s.n).toBeGreaterThan(100);
      expect(s.maxSep).toBeLessThanOrEqual(TOLERANCE_DEG);
    });
  }
});
