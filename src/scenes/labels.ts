/** Shared registry: React decides WHICH labels exist; the render loop positions them (no per-frame React work). */
import * as THREE from 'three';
export interface LabelEntry { pos: THREE.Vector3; el: HTMLElement | null; occlude: boolean }
export const labelRegistry = new Map<string, LabelEntry>();
const tmp = new THREE.Vector3(), toCam = new THREE.Vector3();
export function updateLabels(camera: THREE.Camera, width: number, height: number) {
  const blocked = [...document.querySelectorAll('header, aside, footer, [aria-label="Look direction"]')].map((el) => el.getBoundingClientRect());
  const placed: { left: number; top: number; right: number; bottom: number }[] = [];
  for (const e of labelRegistry.values()) {
    if (!e.el) continue;
    toCam.copy(camera.position).sub(e.pos);
    const facing = e.occlude ? e.pos.clone().normalize().dot(toCam.normalize()) : 1;
    tmp.copy(e.pos).project(camera);
    const behind = tmp.z > 1;
    const x = (tmp.x * 0.5 + 0.5) * width, y = (-tmp.y * 0.5 + 0.5) * height;
    let a = behind ? 0 : THREE.MathUtils.smoothstep(facing, 0.02, 0.18);
    const box = e.el.firstElementChild?.getBoundingClientRect();
    if (box && a > 0) {
      const rect = { left: x + 10, top: y - box.height / 2, right: x + 10 + box.width, bottom: y + box.height / 2 };
      const overlaps = (r: { left: number; top: number; right: number; bottom: number }) => rect.left < r.right + 6 && rect.right > r.left - 6 && rect.top < r.bottom + 6 && rect.bottom > r.top - 6;
      if (rect.right > width - 8 || rect.left < 8 || rect.top < 8 || rect.bottom > height - 8 || blocked.some(overlaps) || placed.some(overlaps)) a = 0;
      else placed.push(rect);
    }
    e.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    e.el.style.opacity = a.toFixed(3);
  }
}
