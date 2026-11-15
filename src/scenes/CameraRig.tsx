import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OC } from 'three-stdlib';
import { useStore, resolveSite } from '@/state/store';
import { latLonToThree, bodyToThree } from './convert';
import { moonState, unit } from '@/astro';
import { measureSceneFrame, type SceneFrame } from './sceneFrame';

const prefersStill = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** How much of the free area the Moon fills: 1 would touch the edges. */
const FIT_MARGIN = 1.06;
const MEASURE_MS = 150;

/** OrbitControls + a fly-to that the viewer can always interrupt. */
export function CameraRig() {
  const near = useRef(false);
  const controls = useRef<OC>(null);
  const { camera, size } = useThree();
  /** Where to look from. The fly-to owns direction only; distance is framed continuously below. */
  const target = useRef<{ dir: THREE.Vector3; up: THREE.Vector3; rate: number } | null>(null);
  /** Distance the viewer chose by zooming. Once set, automatic framing stops touching it. */
  const userDist = useRef<number | null>(null);
  const grabLen = useRef(0);
  const frame = useRef<SceneFrame>({ x: 0, y: 0, w: size.width, h: size.height });
  const measured = useRef<SceneFrame>(frame.current);
  const lastMeasure = useRef(0);
  const flyToken = useStore((s) => s.flyToken), introDone = useStore((s) => s.introDone);
  const introDoneRef = useRef(introDone); introDoneRef.current = introDone;

  /** Distance at which the Moon fills the free area without touching its edges. */
  const fitDistance = (f: SceneFrame) => {
    const half = Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360);
    return (size.height * FIT_MARGIN) / (half * Math.max(1, Math.min(f.w, f.h)));
  };

  // A drag, a wheel or a pinch cancels the flight in progress, so the camera never pulls against
  // the viewer's hand. Where they leave it is then where a later fly-to starts from.
  useEffect(() => {
    const c = controls.current; if (!c) return;
    const onStart = () => { target.current = null; grabLen.current = camera.position.length(); };
    // Only a zoom pins the distance. Rotating leaves the framing free to follow the panels.
    const onEnd = () => { const len = camera.position.length(); if (Math.abs(len - grabLen.current) > 0.02) userDist.current = len; };
    c.addEventListener('start', onStart); c.addEventListener('end', onEnd);
    return () => { c.removeEventListener('start', onStart); c.removeEventListener('end', onEnd); };
  }, [camera]);

  useEffect(() => {
    const { siteId, custom, view, cinematic, timeMs } = useStore.getState();
    if (!introDone) { // parked far out on the Earth side until the boot sequence ends
      const dir = bodyToThree(unit(moonState(new Date(timeMs)).earth)).normalize();
      camera.position.copy(dir.multiplyScalar(9)); camera.up.set(0, 1, 0); controls.current?.update(); return;
    }
    const site = resolveSite(siteId, custom);
    let dir: THREE.Vector3, up: THREE.Vector3;
    if (view === 'polar') { dir = new THREE.Vector3(0, -1, 0); up = new THREE.Vector3(1, 0, 0); }
    else if (view === 'horizon') return;
    else {
      dir = latLonToThree(site.lat, site.lon, 1);
      // keep polar sites readable: tilt the camera 25° toward the equator so the limb is visible
      if (Math.abs(site.lat) > 80) dir.add(latLonToThree(site.lat > 0 ? 62 : -62, site.lon, 1).multiplyScalar(0.8)).normalize();
      up = new THREE.Vector3(0, 1, 0);
    }
    target.current = { dir: dir.normalize(), up, rate: cinematic ? 1.0 : 3.2 };
    if (cinematic) useStore.setState({ cinematic: false });
    if (prefersStill) { camera.position.copy(dir.multiplyScalar(camera.position.length())); camera.up.copy(up); controls.current?.update(); target.current = null; }
  }, [flyToken, introDone, camera]);

  useFrame((state, dt) => {
    // Re-measure the free area a few times a second: panels open and close, phones rotate.
    const now = state.clock.elapsedTime * 1000;
    if (now - lastMeasure.current > MEASURE_MS) { lastMeasure.current = now; measured.current = measureSceneFrame(size.width, size.height); }
    const m = measured.current, f = frame.current, k = prefersStill ? 1 : 1 - Math.exp(-dt * 6);
    f.x += (m.x - f.x) * k; f.y += (m.y - f.y) * k; f.w += (m.w - f.w) * k; f.h += (m.h - f.h) * k;

    // Shift the projection so the Moon sits in the middle of the free area rather than the window.
    const cam = camera as THREE.PerspectiveCamera;
    const dx = f.x + f.w / 2 - size.width / 2, dy = f.y + f.h / 2 - size.height / 2;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) cam.setViewOffset(size.width, size.height, -dx, -dy, size.width, size.height);
    else if (cam.view?.enabled) cam.clearViewOffset();

    if (!introDoneRef.current) { controls.current?.update(); return; } // parked for the boot fly-in

    // Direction: ease toward the selected site, and stop as soon as it is there.
    let dir = camera.position.clone().normalize();
    const tg = target.current;
    if (tg) {
      const t = prefersStill ? 1 : 1 - Math.exp(-dt * tg.rate);
      dir = dir.lerp(tg.dir, t).normalize();
      camera.up.lerp(tg.up, t).normalize();
      if (dir.distanceTo(tg.dir) < 0.0015 && camera.up.distanceTo(tg.up) < 0.0015) { dir.copy(tg.dir); camera.up.copy(tg.up); target.current = null; }
    }
    // Distance: always the framing of the free area, unless the viewer has zoomed themselves.
    const want = THREE.MathUtils.clamp(userDist.current ?? fitDistance(f), 1.3, 9);
    const len = camera.position.length();
    const next = Math.abs(want - len) < 0.002 ? want : THREE.MathUtils.lerp(len, want, prefersStill ? 1 : 1 - Math.exp(-dt * 5));
    camera.position.copy(dir.multiplyScalar(next));
    controls.current?.update();
    const n = camera.position.length() < 2.4; if (n !== near.current) { near.current = n; useStore.setState({ zoomNear: n }); }
  });
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={1.25} maxDistance={9} rotateSpeed={0.55} zoomSpeed={0.7} />;
}
