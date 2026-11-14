import { useMemo } from 'react';
import * as THREE from 'three';
import { starsFrag, starsVert } from './shaders/moon';
export function Stars() {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: starsVert, fragmentShader: starsFrag, side: THREE.BackSide, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }), []);
  return <mesh material={mat} renderOrder={-10}><sphereGeometry args={[80, 32, 16]} /></mesh>;
}
