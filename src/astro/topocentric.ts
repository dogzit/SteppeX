/** Site-local (east/north/up) view of Moon-centred body-fixed vectors. No refraction (no atmosphere). */
import type { FlexibleDateTime } from 'astronomy-engine';
import { DEG, EARTH_RADIUS_KM, MOON_RADIUS_KM, SUN_RADIUS_KM, dot, moonState, sub, type Vec3 } from './moonFrame';

export interface Site {
  /** Selenographic latitude, degrees (+N). */
  lat: number;
  /** Selenographic longitude, degrees, east-positive. */
  lon: number;
  /** Height above the 1737.4 km reference sphere, km (LOLA convention). */
  heightKm?: number;
}
export interface Basis { pos: Vec3; east: Vec3; north: Vec3; up: Vec3 }

/** Local vertical = radial direction on the reference sphere (matches Horizons' zero-flattening geodetic frame). */
export function siteBasis(s: Site): Basis {
  const la = s.lat * DEG, lo = s.lon * DEG, r = MOON_RADIUS_KM + (s.heightKm ?? 0);
  const up: Vec3 = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const east: Vec3 = [-Math.sin(lo), Math.cos(lo), 0];
  const north: Vec3 = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  return { pos: [up[0] * r, up[1] * r, up[2] * r], east, north, up };
}

export interface Apparent {
  /** Azimuth from north through east, degrees [0,360). */
  az: number;
  /** Elevation of the body's centre above the local horizontal plane, degrees. */
  el: number;
  distKm: number;
  /** Apparent angular radius of the disc, degrees. */
  radiusDeg: number;
}

export function toAzEl(b: Basis, targetKm: Vec3, bodyRadiusKm: number): Apparent {
  const d = sub(targetKm, b.pos);
  const e = dot(d, b.east), n = dot(d, b.north), u = dot(d, b.up);
  const dist = Math.hypot(e, n, u);
  let az = Math.atan2(e, n) / DEG; if (az < 0) az += 360;
  return { az, el: Math.asin(u / dist) / DEG, distKm: dist, radiusDeg: Math.asin(bodyRadiusKm / dist) / DEG };
}

/** Topocentric Sun and Earth for a site at a date (exact ephemeris path). */
export function skyAt(site: Site, date: FlexibleDateTime) {
  const st = moonState(date);
  const b = siteBasis(site);
  return { time: st.time, sun: toAzEl(b, st.sun, SUN_RADIUS_KM), earth: toAzEl(b, st.earth, EARTH_RADIUS_KM) };
}

/** Great-circle separation between two (az, el) directions, degrees. */
export function angularSeparation(a: { az: number; el: number }, b: { az: number; el: number }): number {
  const toV = (p: { az: number; el: number }): Vec3 => {
    const az = p.az * DEG, el = p.el * DEG;
    return [Math.cos(el) * Math.sin(az), Math.cos(el) * Math.cos(az), Math.sin(el)];
  };
  const c = Math.min(1, Math.max(-1, dot(toV(a), toV(b))));
  return Math.acos(c) / DEG;
}
