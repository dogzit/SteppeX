/** LOLA ldem_16 (5760x2880, lon 0..360) -> 2048x1024 tangent-space normal map (PPM, lon -180..180, row 0 = north). */
import { writeFileSync } from 'node:fs';
import { readDem } from './lib/pds';
const dem = readDem('.cache/ldem_16');
const W = 2048, H = 1024, R = 1737400, STRENGTH = 4; // visual exaggeration x4, documented in Methodology
const h = new Float32Array(W * H);
const rx = dem.width / W, ry = dem.height / H, shift = dem.width / 2; // shift so output column 0 = lon -180
for (let y = 0; y < H; y++) {
  const y0 = Math.floor(y * ry), y1 = Math.max(y0 + 1, Math.floor((y + 1) * ry));
  for (let x = 0; x < W; x++) {
    const x0 = Math.floor(x * rx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * rx)); let s = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { s += dem.data[yy * dem.width + ((xx + shift) % dem.width)]; n++; }
    h[y * W + x] = (s / n) * dem.scale;
  }
}
const px = new Uint8Array(W * H * 3);
const dLat = Math.PI / H, dLon = (2 * Math.PI) / W;
for (let y = 0; y < H; y++) {
  const lat = Math.PI / 2 - (y + 0.5) * dLat, dx = R * Math.max(Math.cos(lat), 0.02) * dLon, dy = R * dLat;
  const yn = Math.max(y - 1, 0), ys = Math.min(y + 1, H - 1);
  for (let x = 0; x < W; x++) {
    const xe = (x + 1) % W, xw = (x - 1 + W) % W;
    const gx = (h[y * W + xe] - h[y * W + xw]) / (2 * dx) * STRENGTH; // east slope
    const gy = (h[yn * W + x] - h[ys * W + x]) / (2 * dy) * STRENGTH; // north slope (row 0 = north)
    const l = Math.hypot(gx, gy, 1), o = (y * W + x) * 3;
    px[o] = Math.round((-gx / l * 0.5 + 0.5) * 255); px[o + 1] = Math.round((-gy / l * 0.5 + 0.5) * 255); px[o + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
  }
}
writeFileSync('.cache/moon_normal_2k.ppm', Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), Buffer.from(px)]));
let mn = Infinity, mx = -Infinity; for (const v of h) { if (v < mn) mn = v; if (v > mx) mx = v; }
console.log(`normal map ${W}x${H}; height range ${mn.toFixed(0)}..${mx.toFixed(0)} m`);
