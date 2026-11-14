import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OC } from 'three-stdlib';
import { useStore, resolveSite } from '@/state/store';
import { latLonToThree, bodyToThree } from './convert';
import { moonState, unit } from '@/astro';

const prefersStill = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** OrbitControls + smooth great-circle fly-to whenever the selected site or view mode changes. */
export function CameraRig() {
  const near = useRef(false);
  const controls = useRef<OC>(null);
  const { camera, size } = useThree();
  const target = useRef<{ pos: THREE.Vector3; up: THREE.Vector3; t: number; rate: number } | null>(null);
  const flyToken = useStore((s) => s.flyToken), introDone = useStore((s) => s.introDone);

  useEffect(() => {
    const { siteId, custom, view, cinematic, timeMs } = useStore.getState();
    if (!introDone) { // parked far out on the Earth side until the boot sequence ends
      const dir = bodyToThree(unit(moonState(new Date(timeMs)).earth)).normalize();
      camera.position.copy(dir.multiplyScalar(9)); camera.up.set(0, 1, 0); controls.current?.update(); return;
    }
    const site = resolveSite(siteId, custom);
    // Frame the whole disc inside the viewport: at `fit` the Moon (radius 1) clears the narrower
    // screen axis with room to spare, so no edge of it is ever chopped off by the window — tall
    // phone screens simply sit further back than a wide desktop one.
    const half = Math.tan((((camera as THREE.PerspectiveCamera).fov ?? 38) * Math.PI) / 360);
    const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 16 / 9;
    const fit = 1.35 / (half * Math.min(1, aspect));
    // Every fly-to re-frames the disc. A fly-to is a "show me this place" gesture, so it should land
    // on a whole Moon rather than inherit whatever zoom the previous flight was passing through.
    const dist = view === 'polar' ? fit : Math.min(Math.max(camera.position.length(), fit * 0.92), fit * 1.08);
    let dir: THREE.Vector3, up: THREE.Vector3;
    if (view === 'polar') { dir = new THREE.Vector3(0, -1, 0); up = new THREE.Vector3(1, 0, 0); }
    else if (view === 'horizon') return;
    else {
      dir = latLonToThree(site.lat, site.lon, 1);
      // keep polar sites readable: tilt the camera 25° toward the equator so the limb is visible
      if (Math.abs(site.lat) > 80) dir.add(latLonToThree(site.lat > 0 ? 62 : -62, site.lon, 1).multiplyScalar(0.8)).normalize();
      up = new THREE.Vector3(0, 1, 0);
    }
    target.current = { pos: dir.multiplyScalar(dist), up, t: 0, rate: cinematic ? 1.0 : 3.2 };
    if (cinematic) useStore.setState({ cinematic: false });
    if (prefersStill) { camera.position.copy(target.current.pos); camera.up.copy(up); controls.current?.update(); target.current = null; }
  }, [flyToken, introDone, camera, size.width, size.height]);

  useFrame((_, dt) => {
    const tg = target.current;
    if (tg) {
      const k = 1 - Math.exp(-dt * tg.rate);
      const cur = camera.position.clone(); const curLen = cur.length(), tgLen = tg.pos.length();
      const dir = cur.normalize().lerp(tg.pos.clone().normalize(), k).normalize();
      camera.position.copy(dir.multiplyScalar(THREE.MathUtils.lerp(curLen, tgLen, k)));
      camera.up.lerp(tg.up, k).normalize();
      if (camera.position.distanceTo(tg.pos) < 0.002 && camera.up.distanceTo(tg.up) < 0.002) { camera.position.copy(tg.pos); camera.up.copy(tg.up); target.current = null; }
    }
    controls.current?.update();
    const n = camera.position.length() < 2.4; if (n !== near.current) { near.current = n; useStore.setState({ zoomNear: n }); }
  });
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={1.25} maxDistance={9} rotateSpeed={0.55} zoomSpeed={0.7} />;
}
