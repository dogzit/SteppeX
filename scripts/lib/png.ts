/** Minimal PNG encoder (8-bit grayscale or RGB), zero dependencies. */
import { deflateSync } from 'node:zlib';
const T = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c; }
const crc = (b: Uint8Array) => { let c = -1; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type: string, data: Uint8Array) => {
  const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); out.set(data, 8);
  out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length); return out;
};
export function encodePng(width: number, height: number, pixels: Uint8Array, channels: 1 | 3): Buffer {
  const row = width * channels, raw = Buffer.alloc((row + 1) * height);
  for (let y = 0; y < height; y++) raw.set(pixels.subarray(y * row, (y + 1) * row), y * (row + 1) + 1);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = channels === 1 ? 0 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))]);
}
