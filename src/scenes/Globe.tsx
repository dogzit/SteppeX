import PolarMap from './PolarMap';
import { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { LabelLayer } from './LabelLayer';
import { updateLabels } from './labels';
import { Moon } from './Moon';
import { Stars } from './Stars';
import { EarthMarker } from './EarthMarker';
import { SitePins } from './SitePins';
import { CameraRig } from './CameraRig';
import { useEphemeris } from './useEphemeris';
import { useStore } from '@/state/store';

function Labels() {
  const { camera, size } = useThree();
  useFrame(() => updateLabels(camera, size.width, size.height));
  return null;
}
function Scene() {
  const timeMs = useStore((s) => s.timeMs);
  const eph = useEphemeris(timeMs);
  return (
    <>
      <Stars />
      <directionalLight position={eph.sunPos} intensity={3.2} color="#fff4e0" />
      <ambientLight intensity={0.02} />
      <Suspense fallback={null}>
        <Moon sunDir={eph.sunDir} earthDir={eph.earthDir} earthPhase={eph.earthPhase} />
        <EarthMarker pos={eph.earthPos} sunPos={eph.sunPos} />
      </Suspense>
      <SitePins siteSun={eph.siteSun} />
      <CameraRig />
      <Labels />
    </>
  );
}

export default function Globe() {
  const timeMs = useStore((s) => s.timeMs);
  const eph = useEphemeris(timeMs);
  const view = useStore((s) => s.view);
  if (view === 'polar') return <PolarMap />;
  return (
    <div className="absolute inset-0">
    {/* The canvas is transparent: space itself is the page gradient behind it, so the Moon sits in
        one continuous sky instead of a flat fill that stops at the canvas edge. */}
    <Canvas className="absolute inset-0" camera={{ position: [2.79, 0.76, 3.05], fov: 38, near: 0.05, far: 200 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} style={{ position: 'absolute', inset: 0 }}>
      <Scene />
    </Canvas>
    <div className="scene-note absolute left-1/2 -translate-x-1/2 bottom-44 text-xs pointer-events-none">Polar relief: NASA LRO LOLA / PDS · fixed map lighting</div>
    <LabelLayer siteSun={eph.siteSun} earthPos={eph.earthPos} />
    </div>
  );
}
