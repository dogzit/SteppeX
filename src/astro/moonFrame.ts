/**
 * Moon-centred geometry in the Moon's body-fixed mean-Earth/polar-axis (ME) frame.
 * Orientation: IAU/WGCCRE 2009 Moon model (pole RA/Dec + prime meridian W incl. the
 * E1..E13 physical-libration terms) as implemented by astronomy-engine's RotationAxis.
 * Positions: astronomy-engine (VSOP87-based Earth; Moon series accurate to ~1 arcmin).
 * Pure TypeScript, no DOM. Units: km, degrees unless noted.
 */
import { AstroTime, Body, GeoMoon, GeoVector, MakeTime, RotationAxis, type FlexibleDateTime } from 'astronomy-engine';

export const MOON_RADIUS_KM = 1737.4;
export const AU_KM = 149597870.7;
export const SUN_RADIUS_KM = 695700;
export const EARTH_RADIUS_KM = 6371.0;
export const DEG = Math.PI / 180;
export const SYNODIC_MONTH_DAYS = 29.530589;

export type Vec3 = [number, number, number];
/** Row-major 3x3. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

/** Passive (frame) rotations, SPICE [θ]_i convention. */
const rz = (t: number): Mat3 => { const c = Math.cos(t), s = Math.sin(t); return [c, s, 0, -s, c, 0, 0, 0, 1]; };
const rx = (t: number): Mat3 => { const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, c, s, 0, -s, c]; };

export function mul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array(9).fill(0) as Mat3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
}
export function apply(m: Mat3, v: Vec3): Vec3 {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}
export function transpose(m: Mat3): Mat3 { return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]; }
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: Vec3): Vec3 => { const n = norm(a); return [a[0] / n, a[1] / n, a[2] / n]; };
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

/** Rotation matrix J2000 equatorial (ICRF) -> Moon body-fixed ME frame: [W]_3 [90°-δ]_1 [90°+α]_3. */
export function moonBodyFixedMatrix(time: AstroTime): Mat3 {
  const ax = RotationAxis(Body.Moon, time);
  const ra = ax.ra * 15 * DEG; // sidereal hours -> rad
  const dec = ax.dec * DEG;
  const w = ax.spin * DEG;
  return mul(rz(w), mul(rx(Math.PI / 2 - dec), rz(Math.PI / 2 + ra)));
}

export interface MoonState {
  time: AstroTime;
  /** Sun position relative to Moon centre, body-fixed, km. */
  sun: Vec3;
  /** Earth position relative to Moon centre, body-fixed, km. */
  earth: Vec3;
  /** Body-fixed <- J2000 rotation (handy for rendering). */
  matrix: Mat3;
}

/** Geometric (no light-time/aberration) Sun and Earth vectors from the Moon's centre in the ME frame. */
export function moonState(date: FlexibleDateTime): MoonState {
  const time = MakeTime(date);
  const m = moonBodyFixedMatrix(time);
  const moon = GeoMoon(time);                     // geocentric Moon, EQJ, AU
  const sun = GeoVector(Body.Sun, time, false);    // geocentric Sun, EQJ, AU
  const earthV: Vec3 = [-moon.x * AU_KM, -moon.y * AU_KM, -moon.z * AU_KM];
  const sunV: Vec3 = [(sun.x - moon.x) * AU_KM, (sun.y - moon.y) * AU_KM, (sun.z - moon.z) * AU_KM];
  return { time, sun: apply(m, sunV), earth: apply(m, earthV), matrix: m };
}

/** Sub-solar and sub-Earth points (selenographic lat/lon, deg, east-positive) — libration readout. */
export function subPoints(date: FlexibleDateTime) {
  const st = moonState(date);
  const ll = (v: Vec3) => {
    const u = unit(v);
    let lon = Math.atan2(u[1], u[0]) / DEG; if (lon > 180) lon -= 360; if (lon < -180) lon += 360;
    return { lat: Math.asin(u[2]) / DEG, lon };
  };
  return { time: st.time, subSolar: ll(st.sun), subEarth: ll(st.earth), earthDistKm: norm(st.earth), sunDistKm: norm(st.sun) };
}
