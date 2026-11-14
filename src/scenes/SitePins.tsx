import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SITES } from '@/data/sites';
import { useStore } from '@/state/store';
import type { SiteSun } from './useEphemeris';
import { latLonToThree, kmToUnits } from './convert';

const SOLAR = new THREE.Color('#ffb547'), NIGHT = new THREE.Color('#3b5f8a'), WHITE = new THREE.Color('#ffffff');
const prefersStill = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Props { siteSun: SiteSun }

export function SitePins({ siteSun }: Props) {
  const groups = useRef(new Map<string, THREE.Group>());
  const { camera, size } = useThree();
  const { siteId, custom, hoverSiteId, selectSite, setHover } = useStore();
  const pins = useMemo(() => SITES.map((s) => ({ s, pos: latLonToThree(s.lat, s.lon, 1 + kmToUnits(s.heightKm ?? 0) + 0.002), normal: latLonToThree(s.lat, s.lon, 1) })), []);
  useFrame(() => {
    const used: { x: number; y: number }[] = [];
    const ordered = [...pins].sort((a, b) => Number(b.s.id === siteId || b.s.id === hoverSiteId) - Number(a.s.id === siteId || a.s.id === hoverSiteId));
    for (const { s, pos, normal } of ordered) {
      const group = groups.current.get(s.id); if (!group) continue;
      const p = pos.clone().project(camera), x = p.x * size.width / 2, y = p.y * size.height / 2;
      group.visible = normal.dot(camera.position.clone().sub(pos)) > 0 && p.z < 1 && !used.some((q) => Math.hypot(x - q.x, y - q.y) < 15);
      if (group.visible) used.push({ x, y });
      const pixel = camera.position.distanceTo(pos) * 2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) / size.height;
      group.scale.setScalar(pixel * (s.id === siteId ? 5 : 3) / .012);
    }
  });
  return (
    <group>
      {pins.map(({ s, pos, normal }) => {
        const sun = siteSun.get(s.id); const lit = (sun?.fraction ?? 0) > 0;
        const selected = s.id === siteId, hovered = s.id === hoverSiteId;
        const ring = lit ? SOLAR : NIGHT;
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        const scale = selected ? 1.6 : hovered ? 1.3 : 1;
        return (
          <group key={s.id} ref={(g) => { if (g) groups.current.set(s.id, g); else groups.current.delete(s.id); }} position={pos} quaternion={q} scale={scale}>
            <mesh onClick={(e) => { e.stopPropagation(); selectSite(s.id); }} onPointerOver={(e) => { e.stopPropagation(); setHover(s.id); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { setHover(null); document.body.style.cursor = ''; }}>
              <circleGeometry args={[0.012, 24]} /><meshBasicMaterial color={selected ? WHITE : ring} transparent opacity={selected ? 1 : 0.9} depthTest={false} />
            </mesh>
            <mesh raycast={() => null}><ringGeometry args={[0.018, 0.021, 48]} /><meshBasicMaterial color={ring} transparent opacity={selected ? 0.95 : 0.55} depthTest={false} /></mesh>
            {selected && !prefersStill && <mesh raycast={() => null}><ringGeometry args={[0.03, 0.032, 48]} /><meshBasicMaterial color={WHITE} transparent opacity={0.35} depthTest={false} /></mesh>}
          </group>
        );
      })}
      {custom && siteId === 'custom' && (() => {
        const pos = latLonToThree(custom.lat, custom.lon, 1.003), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
        return (
          <group position={pos} quaternion={q} scale={1.6}>
            <mesh><circleGeometry args={[0.012, 24]} /><meshBasicMaterial color={WHITE} depthTest={false} /></mesh>
            <mesh><ringGeometry args={[0.018, 0.021, 48]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthTest={false} /></mesh>
          </group>
        );
      })()}
    </group>
  );
}
