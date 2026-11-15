/**
 * Loader and colour ramp for the precomputed south-polar illumination grid.
 *
 * The grid is built offline by scripts/build-polar-illumination.ts and fetched only when someone
 * opens the sunlight map or the peak list, so it never touches the cold-load path.
 */
export interface Peak {
  lat: number; lon: number;
  sunlitPct: number; meanSunPct: number; earthPct: number; longestDarkH: number; siteHeightM: number;
  /** Full-fidelity 1° horizon profile, so opening a peak shows the precise figure, not a coarse one. */
  el: number[];
}
export interface IlluminationMeta {
  grid: number; halfAngleDeg: number; year: number; noData: number; cellKm: number;
  sweep: { azStepDeg: number; maxDistKm: number; eyeHeightM: number };
  dem: string; peaks: Peak[];
}
export interface Illumination {
  meta: IlluminationMeta;
  year: Uint8Array;
  months: Uint8Array[];
  earth: Uint8Array;
  darkH: Uint16Array;
}

let pending: Promise<Illumination | null> | null = null;
export function loadIllumination(): Promise<Illumination | null> {
  if (!pending) {
    const base = import.meta.env.BASE_URL;
    pending = Promise.all([
      fetch(`${base}data/polar-illumination.json`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<IlluminationMeta>; }),
      fetch(`${base}data/polar-illumination.bin`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); }),
    ]).then(([meta, buf]) => {
      const n = meta.grid * meta.grid;
      const u8 = new Uint8Array(buf);
      const year = u8.subarray(0, n);
      const months = Array.from({ length: 12 }, (_, m) => u8.subarray(n * (m + 1), n * (m + 2)));
      const earth = u8.subarray(n * 13, n * 14);
      const darkH = new Uint16Array(buf.slice(n * 14, n * 14 + n * 2));
      return { meta, year, months, earth, darkH };
    }).catch((e) => { console.warn('illumination grid unavailable', e); return null; });
  }
  return pending;
}

/**
 * Sequential ramp, one hue, monotone in lightness: deep shadow to full sun.
 * Validated for a dark surface; the near-zero end recedes on purpose, so a permanently shadowed
 * floor reads as shadow rather than as a colour.
 */
export const SUN_RAMP = ['#231a0d', '#4a3410', '#7a5512', '#a87a15', '#d2a33c', '#f0c96a', '#ffe6a8'] as const;

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const;
const STOPS = SUN_RAMP.map(hex);

/** Colour for a 0..1 magnitude, interpolated between ramp stops. */
export function sunColour(f: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, f)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x)), t = x - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

/** Paints one layer into a canvas the size of the grid; cells with no data stay transparent. */
export function paintLayer(data: Illumination, layer: Uint8Array): HTMLCanvasElement {
  const n = data.meta.grid, c = document.createElement('canvas');
  c.width = n; c.height = n;
  const ctx = c.getContext('2d')!, img = ctx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = layer[i];
    if (v === data.meta.noData) { img.data[i * 4 + 3] = 0; continue; }
    const [r, g, b] = sunColour(v / 100);
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Grid index for a lat/lon, or -1 when the point is outside the grid. */
export function cellAt(meta: IlluminationMeta, lat: number, lon: number): number {
  const colat = 90 + lat; // southern hemisphere: lat is negative
  if (colat < 0 || colat > 2 * meta.halfAngleDeg) return -1;
  const extent = Math.tan((meta.halfAngleDeg * Math.PI) / 180);
  const rho = Math.tan(((colat / 2) * Math.PI) / 180);
  const px = rho * Math.cos((lon * Math.PI) / 180), py = rho * Math.sin((lon * Math.PI) / 180);
  const x = Math.floor(((px / extent + 1) / 2) * meta.grid), y = Math.floor(((1 - py / extent) / 2) * meta.grid);
  if (x < 0 || y < 0 || x >= meta.grid || y >= meta.grid) return -1;
  return y * meta.grid + x;
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
