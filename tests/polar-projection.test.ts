import { expect, it } from 'vitest';
import { polarPoint, polarLocation } from '../src/scenes/polarProjection';
it('projects and unprojects polar map clicks without a longitude seam', () => {
  for (const [lat, lon] of [[-89.017, 126.273], [-89.534, -150.052], [-88, 179.9], [-88, -179.9]]) {
    const p = polarPoint(lat, lon, 3), restored = polarLocation(p.x, p.y, 3);
    expect(restored.lat).toBeCloseTo(lat, 8); expect(restored.lon).toBeCloseTo(lon, 8);
  }
  expect(polarPoint(-90, 0, 3)).toEqual({ x: .5, y: .5 });
});
