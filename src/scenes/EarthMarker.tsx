import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';

/** Earth shown along its true direction from the Moon's centre (not to scale: Earth is 221 Moon radii away). */
export function EarthMarker({ pos, sunPos }: { pos: THREE.Vector3; sunPos: THREE.Vector3 }) {
  const tex = useTexture(`${import.meta.env.BASE_URL}textures/earth_2k.jpg`); tex.colorSpace = THREE.SRGBColorSpace;
  const line = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]), []);
  const len = pos.length();
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), pos.clone().normalize()), [pos]);
  return (
    <group>
      <group quaternion={q}>
        <lineSegments geometry={line} scale={[len - 0.14, 1, 1]} onUpdate={(self) => self.computeLineDistances()}><lineDashedMaterial color="#5fc3ff" transparent opacity={0.45} dashSize={0.04} gapSize={0.03} /></lineSegments>
      </group>
      <group position={pos}>
        <mesh rotation={[0, Math.PI, 0]}><sphereGeometry args={[0.11, 48, 24]} /><meshStandardMaterial map={tex} roughness={0.9} metalness={0} /></mesh>
        <pointLight position={sunPos.clone().sub(pos).normalize().multiplyScalar(2)} intensity={0} />
      </group>
    </group>
  );
}
