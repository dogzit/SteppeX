import { useMemo } from 'react';
import * as THREE from 'three';
import { SITES } from '@/data/sites';
import { useStore } from '@/state/store';
import { latLonToThree, kmToUnits } from './convert';

const SOLAR = new THREE.Color('#ffb547'), NIGHT = new THREE.Color('#3b5f8a'), WHITE = new THREE.Color('#ffffff');
const prefersStill = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Props { siteSun: Map<string, { el: number; az: number }> }

export function SitePins({ siteSun }: Props) {
  const { siteId, custom, hoverSiteId, selectSite, setHover } = useStore();
  const pins = useMemo(() => SITES.map((s) => ({ s, pos: latLonToThree(s.lat, s.lon, 1 + kmToUnits(s.heightKm ?? 0) + 0.002), normal: latLonToThree(s.lat, s.lon, 1) })), []);
  return (
    <group>
      {pins.map(({ s, pos, normal }) => {
        const sun = siteSun.get(s.id); const lit = (sun?.el ?? 0) > 0;
        const selected = s.id === siteId, hovered = s.id === hoverSiteId;
        const ring = lit ? SOLAR : NIGHT;
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        const scale = selected ? 1.6 : hovered ? 1.3 : 1;
        return (
          <group key={s.id} position={pos} quaternion={q} scale={scale}>
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
