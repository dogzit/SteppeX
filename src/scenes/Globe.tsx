import { useTheme } from '@/ui/theme';
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
  const theme = useTheme((s) => s.theme);
  const timeMs = useStore((s) => s.timeMs);
  const eph = useEphemeris(timeMs);
  return (
    <>
      {theme === 'dark' && <Stars />}
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
  const theme = useTheme((s) => s.theme);
  const timeMs = useStore((s) => s.timeMs);
  const eph = useEphemeris(timeMs);
  const view = useStore((s) => s.view);
  if (view === 'polar') return <PolarMap />;
  return (
    <div className="absolute inset-0">
    <Canvas className="absolute inset-0" camera={{ position: [2.2, 0.6, 2.4], fov: 38, near: 0.05, far: 200 }} dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }} style={{ position: 'absolute', inset: 0 }}>
      <color attach="background" args={[theme === 'light' ? '#dcebf0' : '#071827']} />
      <Scene />
    </Canvas>
    <div className="absolute left-1/2 -translate-x-1/2 bottom-36 text-xs text-haze pointer-events-none">Polar relief: NASA LRO LOLA / PDS · fixed map lighting</div>
    <LabelLayer siteSun={eph.siteSun} earthPos={eph.earthPos} />
    </div>
  );
}
