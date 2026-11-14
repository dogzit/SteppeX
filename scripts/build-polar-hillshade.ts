/** Display-only polar-stereographic hillshades from the same cited NASA LOLA PDS DEMs. */
import { writeFileSync } from 'node:fs';
import { loadPolar } from './lib/dem';
import { encodePng } from './lib/png';
const size = 1024, extent = Math.tan(7.5 * Math.PI / 180), R = 1737400;
for (const pole of ['south', 'north'] as const) {
  const sampler = loadPolar(`.cache/ldem_75${pole === 'south' ? 's' : 'n'}_240m`)!;
  const h = new Float32Array(size * size), pixels = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = ((x + .5) / size * 2 - 1) * extent, py = (1 - (y + .5) / size * 2) * extent;
    const lat = (pole === 'south' ? -1 : 1) * (90 - 2 * Math.atan(Math.hypot(px, py)) * 180 / Math.PI);
    h[y * size + x] = sampler.heightAt(lat, Math.atan2(py, px) * 180 / Math.PI) || 0;
  }
  const spacing = 4 * R * extent / size;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (h[y * size + Math.min(size - 1, x + 1)] - h[y * size + Math.max(0, x - 1)]) / (2 * spacing);
    const dy = (h[Math.min(size - 1, y + 1) * size + x] - h[Math.max(0, y - 1) * size + x]) / (2 * spacing);
    const shade = Math.max(.12, (-dx * -.5 - dy * -.5 + .707) / Math.hypot(dx, dy, 1));
    const v = Math.round(55 + 190 * shade);
    pixels.set([v, v, v], (y * size + x) * 3);
  }
  writeFileSync(`public/textures/polar-${pole}.png`, encodePng(size, size, pixels, 3));
  console.log(`Built ${pole} polar-stereographic LOLA hillshade (${size}px, display lighting only).`);
}
