/** Body-fixed Moon frame (X=lon 0, Y=lon 90E, Z=north) <-> three.js scene (x=X, y=Z, z=-Y). Globe radius = 1. */
import * as THREE from 'three';
import { DEG, MOON_RADIUS_KM, type Vec3 } from '@/astro';
export const bodyToThree = (v: Vec3 | ArrayLike<number>, out = new THREE.Vector3()) => out.set(v[0], v[2], -v[1]);
export function latLonToThree(lat: number, lon: number, r = 1, out = new THREE.Vector3()) {
  const la = lat * DEG, lo = lon * DEG;
  return out.set(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
}
export function threeToLatLon(p: THREE.Vector3) {
  const r = p.length();
  return { lat: Math.asin(p.y / r) / DEG, lon: Math.atan2(-p.z, p.x) / DEG };
}
export const kmToUnits = (km: number) => km / MOON_RADIUS_KM;
