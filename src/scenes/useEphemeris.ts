import { useMemo } from 'react';
import * as THREE from 'three';
import { moonState, siteBasis, toAzEl, SUN_RADIUS_KM, EARTH_RADIUS_KM, unit, dot } from '@/astro';
import { bodyToThree } from './convert';
import { SITES } from '@/data/sites';

export type SiteSun = Map<string, { el: number; az: number }>;
/** Per-frame-cheap geometry derived from the time: body-fixed Sun/Earth, scene-space directions, per-site Sun elevations. */
export function useEphemeris(timeMs: number) {
  return useMemo(() => {
    const st = moonState(new Date(timeMs));
    const sunDir = bodyToThree(unit(st.sun)).normalize();
    const earthDir = bodyToThree(unit(st.earth)).normalize();
    // Earth phase as seen from the Moon: fraction of the Earth disc that is lit = (1 + cos(Sun-Earth-Moon angle)) / 2
    const cosPhase = dot(unit(st.sun), unit(st.earth));
    const earthPhase = (1 - cosPhase) / 2; // cosPhase=1 -> Earth between Moon and Sun -> "new Earth"
    const siteSun = new Map<string, { el: number; az: number }>();
    for (const s of SITES) { const a = toAzEl(siteBasis({ lat: s.lat, lon: s.lon, heightKm: s.heightKm }), st.sun, SUN_RADIUS_KM); siteSun.set(s.id, { el: a.el, az: a.az }); }
    const earthForSite = (lat: number, lon: number, h = 0) => toAzEl(siteBasis({ lat, lon, heightKm: h }), st.earth, EARTH_RADIUS_KM);
    const sunForSite = (lat: number, lon: number, h = 0) => toAzEl(siteBasis({ lat, lon, heightKm: h }), st.sun, SUN_RADIUS_KM);
    return { state: st, sunDir, earthDir, earthPhase, siteSun, earthForSite, sunForSite, sunPos: sunDir.clone().multiplyScalar(60), earthPos: earthDir.clone().multiplyScalar(4.6) as THREE.Vector3 };
  }, [timeMs]);
}
