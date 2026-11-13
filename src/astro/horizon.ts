/** Terrain horizon profile: elevation of the local horizon (deg) vs azimuth (deg from north, clockwise). */
export interface HorizonProfile {
  /** Azimuth step in degrees; el[i] is the horizon elevation at azimuth i*stepDeg. */
  stepDeg: number;
  el: Float32Array;
  source: 'sphere' | 'lola';
  /** Human-readable provenance, e.g. "LOLA LDEM 240 m/px, 250 km sweep". */
  label: string;
  resolutionM?: number;
}
/** Smooth-sphere fallback: local terrain assumed level with the site, horizon at 0° in every direction. */
export const SPHERE_HORIZON: HorizonProfile = { stepDeg: 1, el: new Float32Array(360), source: 'sphere', label: 'Smooth sphere (no terrain data): horizon at 0° in all directions' };
export function horizonAt(p: HorizonProfile, azDeg: number): number {
  const n = p.el.length, f = (((azDeg % 360) + 360) % 360) / p.stepDeg, i = Math.floor(f) % n, j = (i + 1) % n, t = f - Math.floor(f);
  return p.el[i] + (p.el[j] - p.el[i]) * t;
}
