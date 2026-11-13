import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { moonFrag, moonVert, rimFrag, rimVert } from './shaders/moon';
import { threeToLatLon } from './convert';
import { useStore } from '@/state/store';

interface Props { sunDir: THREE.Vector3; earthDir: THREE.Vector3; earthPhase: number }

export function Moon({ sunDir, earthDir, earthPhase }: Props) {
  const [color, normal] = useTexture([`${import.meta.env.BASE_URL}textures/moon_color_4k.jpg`, `${import.meta.env.BASE_URL}textures/moon_normal_2k.jpg`]);
  color.colorSpace = THREE.SRGBColorSpace; color.anisotropy = 8; normal.colorSpace = THREE.NoColorSpace; normal.anisotropy = 4;
  const showGrid = useStore((s) => s.showGrid);
  const setCustom = useStore((s) => s.setCustom);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: moonVert, fragmentShader: moonFrag,
    uniforms: { uColor: { value: color }, uNormal: { value: normal }, uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uEarthDir: { value: new THREE.Vector3(1, 0, 0) }, uEarthPhase: { value: 0.5 }, uGrid: { value: 0 }, uNormalStrength: { value: 1.0 }, uExposure: { value: 1.0 } },
  }), [color, normal]);
  const rim = useMemo(() => new THREE.ShaderMaterial({ vertexShader: rimVert, fragmentShader: rimFrag, uniforms: { uSunDir: { value: new THREE.Vector3(1, 0, 0) } }, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending }), []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    mat.uniforms.uSunDir.value.copy(sunDir); mat.uniforms.uEarthDir.value.copy(earthDir); mat.uniforms.uEarthPhase.value = earthPhase; mat.uniforms.uGrid.value = showGrid ? 1 : 0;
    rim.uniforms.uSunDir.value.copy(sunDir);
  });
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return; // it was a drag
    e.stopPropagation();
    const { lat, lon } = threeToLatLon(e.point.clone());
    setCustom({ lat: +lat.toFixed(4), lon: +lon.toFixed(4) });
  };
  return (
    <group>
      <mesh ref={ref} name="moon" material={mat} onClick={onClick}><sphereGeometry args={[1, 192, 96]} /></mesh>
      <mesh material={rim} scale={1.035}><sphereGeometry args={[1, 64, 32]} /></mesh>
    </group>
  );
}
