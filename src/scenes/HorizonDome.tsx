import { terrainSummary } from '@/ui/terrainCopy';
import { useTheme } from '@/ui/theme';
import { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Stars } from './Stars';
import { useStore, useActiveSite } from '@/state/store';
import { useHorizon } from '@/state/useHorizon';
import { useMetrics } from '@/state/useMetrics';
import { buildSeries, siteSeries, horizonAt, DEG, SYNODIC_MONTH_DAYS, PLANETS, planetAzEl, type HorizonProfile } from '@/astro';
import { labelRegistry, updateLabels } from './labels';
import { fmtDateTime } from '@/ui/format';

/** Dome frame: +X east, +Y up, −Z north. */
export const dirOf = (az: number, el: number, r = 1) => new THREE.Vector3(r * Math.cos(el * DEG) * Math.sin(az * DEG), r * Math.sin(el * DEG), -r * Math.cos(el * DEG) * Math.cos(az * DEG));
const R_SKY = 50, R_BODY = 60;

function Terrain({ hz }: { hz: HorizonProfile }) {
  const geo = useMemo(() => {
    const n = hz.el.length, pos: number[] = [], col: number[] = [], idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const az = (i % n) * hz.stepDeg, e = hz.el[i % n];
      const top = dirOf(az, e, R_SKY), bot = dirOf(az, -20, R_SKY);
      pos.push(top.x, top.y, top.z, bot.x, bot.y, bot.z);
      const shade = 0.11 + 0.09 * THREE.MathUtils.clamp((e + 3) / 12, 0, 1);
      col.push(shade, shade * 1.02, shade * 1.1, 0.012, 0.013, 0.018);
      if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
  }, [hz]);
  const line = useMemo(() => { const n = hz.el.length, pts: THREE.Vector3[] = []; for (let i = 0; i <= n; i++) pts.push(dirOf((i % n) * hz.stepDeg, hz.el[i % n], R_SKY - 0.2)); return new THREE.BufferGeometry().setFromPoints(pts); }, [hz]);
  return (
    <group>
      <mesh geometry={geo}><meshBasicMaterial vertexColors side={THREE.DoubleSide} /></mesh>
      <lineLoop geometry={line}><lineBasicMaterial color="#d8dee8" transparent opacity={0.9} /></lineLoop>
    </group>
  );
}
function Grid() {
  const g = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (const el of [0, 10, 20, 30, 45, 60]) for (let a = 0; a < 360; a += 2) { pts.push(dirOf(a, el, R_SKY - 0.5), dirOf(a + 2, el, R_SKY - 0.5)); }
    for (let a = 0; a < 360; a += 30) for (let e = -5; e < 80; e += 2) pts.push(dirOf(a, e, R_SKY - 0.5), dirOf(a, e + 2, R_SKY - 0.5));
    for (let a = 0; a < 360; a += 5) pts.push(dirOf(a, 0, R_SKY - 0.5), dirOf(a, a % 30 === 0 ? 2.5 : 1, R_SKY - 0.5));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  return <lineSegments geometry={g}><lineBasicMaterial color="#8ea0b8" transparent opacity={0.16} depthTest={false} /></lineSegments>;
}
function Track({ pts, color }: { pts: THREE.Vector3[]; color: string }) {
  const g = useMemo(() => new THREE.BufferGeometry().setFromPoints(pts), [pts]);
  return <points geometry={g}><pointsMaterial color={color} size={2.2} sizeAttenuation={false} transparent opacity={0.75} depthTest={false} /></points>;
}
function Sun({ az, el, radiusDeg }: { az: number; el: number; radiusDeg: number }) {
  const pos = dirOf(az, el, R_BODY), r = R_BODY * Math.tan(radiusDeg * DEG);
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize().negate()), [pos]);
  return (
    <group position={pos} quaternion={q}>
      <mesh><circleGeometry args={[r, 48]} /><meshBasicMaterial color="#fff6e0" /></mesh>
      <mesh><circleGeometry args={[r * 7, 48]} /><meshBasicMaterial color="#ffb547" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      <mesh><ringGeometry args={[r * 3.2, r * 3.6, 64]} /><meshBasicMaterial color="#ffb547" transparent opacity={0.9} depthTest={false} /></mesh>
    </group>
  );
}
function Earth({ az, el, radiusDeg, sunDir, axis }: { az: number; el: number; radiusDeg: number; sunDir: THREE.Vector3; axis: THREE.Vector3 }) {
  const tex = useTexture(`${import.meta.env.BASE_URL}textures/earth_2k.jpg`); tex.colorSpace = THREE.SRGBColorSpace;
  const pos = dirOf(az, el, R_BODY), r = R_BODY * Math.tan(radiusDeg * DEG);
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize()), [axis]);
  return (
    <group position={pos}>
      <mesh quaternion={q}><sphereGeometry args={[r, 48, 24]} /><meshStandardMaterial map={tex} roughness={1} metalness={0} /></mesh>
      <directionalLight position={sunDir.clone().multiplyScalar(10)} intensity={3} />
      <mesh quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize().negate())}><ringGeometry args={[r * 1.6, r * 1.75, 64]} /><meshBasicMaterial color="#5fc3ff" transparent opacity={0.9} depthTest={false} /></mesh>
    </group>
  );
}
function Planets({ items }: { items: { az: number; el: number; mag: number }[] }) {
  const geo = useMemo(() => { const pts = items.map((p) => dirOf(p.az, p.el, R_SKY + 1)); return new THREE.BufferGeometry().setFromPoints(pts); }, [items]);
  return <points geometry={geo}><pointsMaterial color="#ffffff" size={4} sizeAttenuation={false} /></points>;
}
function Look({ yaw, pitch, fov }: { yaw: React.MutableRefObject<number>; pitch: React.MutableRefObject<number>; fov: React.MutableRefObject<number> }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const c = camera as THREE.PerspectiveCamera;
    c.position.set(0, 0, 0); c.up.set(0, 1, 0); c.lookAt(dirOf(yaw.current, pitch.current, 10));
    if (Math.abs(c.fov - fov.current) > 0.01) { c.fov = fov.current; c.updateProjectionMatrix(); }
    updateLabels(camera, size.width, size.height);
  });
  return null;
}

export default function HorizonDome() {
  const theme = useTheme((s) => s.theme);
  const site = useActiveSite(); const hz = useHorizon(site); const timeMs = useStore((s) => s.timeMs);
  const { live } = useMetrics();
  const yaw = useRef(live.sun.az), pitch = useRef(8), fov = useRef(70);
  const [, force] = useState(0);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const trackStart = Math.floor(timeMs / 3600_000) * 3600_000;
  const tracks = useMemo(() => {
    const dt = 1800_000, n = Math.round((SYNODIC_MONTH_DAYS * 86400_000) / dt);
    const ss = siteSeries(buildSeries(trackStart, dt, n), { lat: site.lat, lon: site.lon, heightKm: site.heightKm });
    const sun: THREE.Vector3[] = [], earth: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) { sun.push(dirOf(ss.sunAz[i], ss.sunEl[i], R_SKY + 2)); if (i % 2 === 0) earth.push(dirOf(ss.earthAz[i], ss.earthEl[i], R_SKY + 2)); }
    return { sun, earth };
  }, [site, trackStart]);
  const sunDir = useMemo(() => dirOf(live.sun.az, live.sun.el), [live.sun.az, live.sun.el]);
  const planets = useMemo(() => PLANETS.map((b) => { const a = planetAzEl({ lat: site.lat, lon: site.lon, heightKm: site.heightKm }, b, new Date(timeMs)); return { name: b as string, az: a.az, el: a.el, mag: a.mag, up: a.el - horizonAt(hz, a.az) > 0 }; }).filter((p) => p.up), [site, timeMs, hz]);
  const lunarNorth = useMemo(() => new THREE.Vector3(0, Math.sin(site.lat * DEG) * (site.lat < 0 ? -1 : 1), -Math.cos(site.lat * DEG)).normalize(), [site.lat]);
  // Labels (compass + bodies) through the shared overlay registry
  const items = useMemo(() => {
    const out: { id: string; text: string; pos: THREE.Vector3; color?: string }[] = [];
    for (let a = 0; a < 360; a += 30) out.push({ id: `az${a}`, text: a === 0 ? 'N' : a === 90 ? 'E' : a === 180 ? 'S' : a === 270 ? 'W' : `${a}°`, pos: dirOf(a, -2.2, R_SKY - 1) });
    out.push({ id: 'sun', text: `Sun ${live.sunClear.toFixed(2)}° above terrain${live.sunUp ? '' : ' · in shadow'}`, pos: dirOf(live.sun.az, live.sun.el + 2.4, R_SKY), color: '#ffb547' });
    out.push({ id: 'earth', text: `Earth ${(live.earth.el - live.earthHorizon).toFixed(2)}° above terrain${live.earthUp ? '' : ' · no direct radio view'}`, pos: dirOf(live.earth.az, live.earth.el + 3.2, R_SKY), color: '#5fc3ff' });
    return out;
  }, [live, planets]);
  const lookAt = (az: number, el: number) => { yaw.current = az; pitch.current = Math.max(-10, Math.min(60, el + 4)); force((v) => v + 1); };
  return (
    <div className="absolute inset-0 select-none" style={{ cursor: drag.current ? 'grabbing' : 'grab' }}
      onPointerDown={(e) => { if ((e.target as HTMLElement).tagName !== 'CANVAS') return; drag.current = { x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { if (!drag.current) return; const k = fov.current / 900; yaw.current += (drag.current.x - e.clientX) * -k * -1; pitch.current = Math.max(-25, Math.min(85, pitch.current + (e.clientY - drag.current.y) * k)); drag.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}
      onWheel={(e) => { fov.current = Math.max(25, Math.min(100, fov.current + e.deltaY * 0.05)); }}>
      <Canvas camera={{ fov: 70, near: 0.1, far: 400, position: [0, 0, 0] }} dpr={[1, 2]} gl={{ antialias: true }} style={{ position: 'absolute', inset: 0 }}>
        <color attach="background" args={[theme === 'light' ? '#dcebf0' : '#071827']} />
        {theme === 'dark' && <Stars />}
        <ambientLight intensity={0.05} />
        <Terrain hz={hz} />
        <Grid />
        <Track pts={tracks.sun} color="#ffb547" />
        <Track pts={tracks.earth} color="#5fc3ff" />
        <Planets items={planets} />
        <Sun az={live.sun.az} el={live.sun.el} radiusDeg={live.sun.radiusDeg} />
        <Suspense fallback={null}><Earth az={live.earth.az} el={live.earth.el} radiusDeg={live.earth.radiusDeg} sunDir={sunDir} axis={lunarNorth} /></Suspense>
        <Look yaw={yaw} pitch={pitch} fov={fov} />
      </Canvas>
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {items.map((it) => <div key={it.id} className="absolute top-0 left-0" style={{ opacity: 0 }} ref={(el) => { if (el) labelRegistry.set(it.id, { pos: it.pos, el, occlude: false }); else labelRegistry.delete(it.id); }}><div className="pin-label" style={{ color: it.color, transform: 'translate(-50%, -50%)', background: it.color ? 'rgba(5,7,11,.75)' : 'transparent', border: it.color ? undefined : 'none', fontSize: it.color ? 11 : 10, letterSpacing: '.1em' }}>{it.text}</div></div>)}
      </div>
      <div className="lander-toolbar absolute left-1/2 -translate-x-1/2 top-24 z-20 glass rounded-xl px-3 py-2 flex items-center gap-2 pointer-events-auto" role="group" aria-label="Look direction">
        <span className="label sr-only">Lander view · {fmtDateTime(timeMs)}</span>
        <button className="btn" onClick={() => lookAt(live.sun.az, live.sun.el)}>Look at Sun</button>
        <button className="btn" onClick={() => lookAt(live.earth.az, live.earth.el)}>Look at Earth</button>
        <button className="btn" onClick={() => lookAt(0, 8)}>North</button>
        <span className="label normal-case tracking-normal text-white/50 hidden lg:block">drag to look · wheel to zoom · dots = next lunar day's Sun/Earth paths</span>
      </div>
      <div className="lander-source absolute left-1/2 -translate-x-1/2 bottom-40 z-20 label normal-case tracking-normal text-white/60 pointer-events-none">{terrainSummary(hz)}</div>
    </div>
  );
}
export { horizonAt };
