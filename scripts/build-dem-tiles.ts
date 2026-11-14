/** Downsampled DEM tiles for in-browser custom-pin horizons -> public/data/dem_*.bin + dem_tiles.json */
import { writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { readDem } from './lib/pds';

function downsample(src: Int16Array, w: number, h: number, f: number) {
  const W = Math.floor(w / f), H = Math.floor(h / f), out = new Int16Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let yy = 0; yy < f; yy++) for (let xx = 0; xx < f; xx++) s += src[(y * f + yy) * w + x * f + xx]; out[y * W + x] = Math.round(s / (f * f)); }
  return { out, W, H };
}
const tiles: Record<string, unknown>[] = [];
for (const [base, f, name] of [['.cache/ldem_75s_240m', 3, 'south'], ['.cache/ldem_75n_240m', 3, 'north']] as const) {
  if (!existsSync(`${base}.img`)) continue;
  const d = readDem(base); const { out, W, H } = downsample(d.data, d.width, d.height, f);
  const scaleM = +d.label.MAP_SCALE * f;
  writeFileSync(`public/data/dem_${name}.bin`, Buffer.from(out.buffer));
  tiles.push({ name, file: `dem_${name}.bin`, proj: 'polar', centerLat: +d.label.CENTER_LATITUDE, width: W, height: H, scale: d.scale, scaleM, lineOffset: (+d.label.LINE_PROJECTION_OFFSET - 0.5) / f, sampleOffset: (+d.label.SAMPLE_PROJECTION_OFFSET - 0.5) / f, label: `LOLA DEM ${scaleM} m/px (downsampled polar tile)` });
  console.log(name, W, H, (out.byteLength / 1e6).toFixed(1), 'MB');
}
{
  const d = readDem('.cache/ldem_16'); const { out, W, H } = downsample(d.data, d.width, d.height, 4);
  writeFileSync('public/data/dem_global.bin', Buffer.from(out.buffer));
  tiles.push({ name: 'global', file: 'dem_global.bin', proj: 'cyl', ppd: 4, width: W, height: H, scale: d.scale, label: 'LOLA DEM 4 px/deg (7.6 km/px, coarse global grid)' });
  console.log('global', W, H, (out.byteLength / 1e6).toFixed(1), 'MB');
}
writeFileSync('public/data/dem_tiles.json', JSON.stringify(tiles));
