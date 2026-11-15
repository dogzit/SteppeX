/**
 * Terrain horizon by great-circle ray sweep on a sphere-referenced DEM. Pure TS: runs in Node (build) and in a Web Worker (custom pins).
 * For each azimuth, march outward and keep the maximum elevation angle of the terrain as seen from the site (eye height above ground).
 * Elevation angle is exact for the sphere: atan2(Rp cos δ − Rs, Rp sin δ), so curvature drop is inherent (no refraction).
 */
import { DEG, MOON_RADIUS_KM } from './moonFrame';

export interface DemSampler {
  /** Height in metres above the 1737.4 km sphere, or NaN when outside coverage. */
  heightAt(latDeg: number, lonDeg: number): number;
  resolutionM: number;
  label: string;
}
export interface HorizonOptions { eyeHeightM?: number; maxDistKm?: number; azStepDeg?: number; stepFraction?: number }
export interface HorizonResult { el: Float32Array; stepDeg: number; siteHeightM: number; maxDistKm: number; eyeHeightM: number; samples: number }

const R_M = MOON_RADIUS_KM * 1000;

export function computeHorizon(lat: number, lon: number, dem: DemSampler, o: HorizonOptions = {}): HorizonResult {
  const eye = o.eyeHeightM ?? 2, maxDist = (o.maxDistKm ?? 250) * 1000, azStep = o.azStepDeg ?? 1, grow = o.stepFraction ?? 0.005;
  const n = Math.round(360 / azStep), el = new Float32Array(n);
  const h0 = dem.heightAt(lat, lon);
  const siteH = Number.isNaN(h0) ? 0 : h0;
  const Rs = R_M + siteH + eye;
  // At exactly ±90° cos(lat) is ~6e-17 and every azimuth collapses onto two meridians (the shipped south-pole profile
  // had three distinct values). Step a hair off the pole: 1e-4° is 3 m, far below any DEM pixel.
  const latC = Math.max(-89.9999, Math.min(89.9999, lat));
  const la0 = latC * DEG, lo0 = lon * DEG, sLa0 = Math.sin(la0), cLa0 = Math.cos(la0);
  const step0 = Math.max(dem.resolutionM * 0.5, 20);
  let samples = 0;
  for (let i = 0; i < n; i++) {
    const az = i * azStep * DEG, sAz = Math.sin(az), cAz = Math.cos(az);
    let best = -90 * DEG;
    for (let d = step0; d <= maxDist; d += Math.max(step0, d * grow)) {
      const delta = d / R_M, sD = Math.sin(delta), cD = Math.cos(delta);
      const sLa = sLa0 * cD + cLa0 * sD * cAz;
      const la = Math.asin(sLa);
      const lo = lo0 + Math.atan2(sAz * sD * cLa0, cD - sLa0 * sLa);
      const h = dem.heightAt(la / DEG, lo / DEG); samples++;
      if (Number.isNaN(h)) continue;
      const Rp = R_M + h;
      const e = Math.atan2(Rp * cD - Rs, Rp * sD);
      if (e > best) best = e;
    }
    el[i] = best / DEG;
  }
  return { el, stepDeg: azStep, siteHeightM: siteH, maxDistKm: maxDist / 1000, eyeHeightM: eye, samples };
}

/** Bilinear sampler over a raster given a (lat, lon) -> (x, y) pixel mapping. Returns NaN outside the raster. */
export function makeRasterSampler(data: Int16Array | Float32Array, width: number, height: number, scale: number, project: (lat: number, lon: number) => [number, number] | null, resolutionM: number, label: string, wrapX = false): DemSampler {
  return {
    resolutionM, label,
    heightAt(lat, lon) {
      const p = project(lat, lon); if (!p) return NaN;
      let [x, y] = p;
      if (wrapX) x = ((x % width) + width) % width; else if (x < 0 || x > width - 1) return NaN;
      if (y < 0 || y > height - 1) return NaN;
      const x0 = Math.floor(x), y0 = Math.floor(y), x1 = wrapX ? (x0 + 1) % width : Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1), fx = x - x0, fy = y - y0;
      const a = data[y0 * width + x0], b = data[y0 * width + x1], c = data[y1 * width + x0], d = data[y1 * width + x1];
      return ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy) * scale;
    },
  };
}
/** Composite: first sampler with coverage wins. */
export function composite(samplers: DemSampler[], label: string): DemSampler {
  return { resolutionM: Math.min(...samplers.map((s) => s.resolutionM)), label, heightAt(lat, lon) { for (const s of samplers) { const h = s.heightAt(lat, lon); if (!Number.isNaN(h)) return h; } return NaN; } };
}
/** LOLA GDR cylindrical projection (pixel centres; lon 0..360 east, line 0 at +90°). */
export const cylindricalProject = (ppd: number, _width: number, height: number) => (lat: number, lon: number): [number, number] => [(((lon % 360) + 360) % 360) * ppd - 0.5, Math.min(height - 1, Math.max(0, (90 - lat) * ppd - 0.5))] as [number, number];
/** LOLA GDR polar stereographic (spherical) for a pole tile: south (centerLat -90) or north (+90). PDS convention: ρ = 2R tan(π/4 ± φ/2). */
export function polarProject(centerLat: -90 | 90, scaleM: number, lineOffset: number, sampleOffset: number) {
  const R = R_M;
  return (lat: number, lon: number): [number, number] | null => {
    const phi = lat * DEG, lam = lon * DEG;
    const rho = centerLat < 0 ? 2 * R * Math.tan(Math.PI / 4 + phi / 2) : 2 * R * Math.tan(Math.PI / 4 - phi / 2);
    const x = rho * Math.sin(lam), y = centerLat < 0 ? rho * Math.cos(lam) : -rho * Math.cos(lam);
    return [sampleOffset + x / scaleM, lineOffset - y / scaleM];
  };
}
