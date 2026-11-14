/** Cartographic display projection only; matches build-polar-hillshade.ts. */
const DEG = Math.PI / 180;
export function polarPoint(lat: number, lon: number, radiusDeg: number) {
  const r = Math.tan((90 + lat) * DEG / 2) / Math.tan(radiusDeg * DEG / 2);
  return { x: .5 + r * Math.cos(lon * DEG) / 2, y: .5 - r * Math.sin(lon * DEG) / 2 };
}
export function polarLocation(x: number, y: number, radiusDeg: number) {
  const dx = (x - .5) * 2, dy = (.5 - y) * 2;
  return { lat: -90 + 2 * Math.atan(Math.hypot(dx, dy) * Math.tan(radiusDeg * DEG / 2)) / DEG, lon: Math.atan2(dy, dx) / DEG };
}
