/** Shared registry: React decides WHICH labels exist; the render loop positions them (no per-frame React work). */
import * as THREE from 'three';
export interface LabelEntry { pos: THREE.Vector3; el: HTMLElement | null; occlude: boolean }
export const labelRegistry = new Map<string, LabelEntry>();
const tmp = new THREE.Vector3(), toCam = new THREE.Vector3();
export function updateLabels(camera: THREE.Camera, width: number, height: number) {
  for (const e of labelRegistry.values()) {
    if (!e.el) continue;
    toCam.copy(camera.position).sub(e.pos);
    const facing = e.occlude ? e.pos.clone().normalize().dot(toCam.normalize()) : 1;
    tmp.copy(e.pos).project(camera);
    const behind = tmp.z > 1;
    const x = (tmp.x * 0.5 + 0.5) * width, y = (-tmp.y * 0.5 + 0.5) * height;
    const a = behind ? 0 : THREE.MathUtils.smoothstep(facing, 0.02, 0.18);
    e.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    e.el.style.opacity = a.toFixed(3);
  }
}
