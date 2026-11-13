/** Read LOLA GDR .lbl/.img (LSB int16, metres = DN * SCALING_FACTOR relative to the 1737.4 km sphere). */
import { readFileSync } from 'node:fs';
export interface Dem { width: number; height: number; data: Int16Array; scale: number; label: Record<string, string> }
export function readLabel(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_^][A-Z0-9_^]*)\s*=\s*(.+?)\s*$/); if (m) out[m[1]] = m[2].replace(/<.*>$/, '').trim().replace(/^"|"$/g, '');
  }
  return out;
}
export function readDem(base: string): Dem {
  const label = readLabel(`${base}.lbl`);
  const width = +label.LINE_SAMPLES, height = +label.LINES, scale = +label.SCALING_FACTOR;
  if (label.SAMPLE_TYPE !== 'LSB_INTEGER' || +label.SAMPLE_BITS !== 16) throw new Error('unsupported sample type ' + label.SAMPLE_TYPE);
  const buf = readFileSync(`${base}.img`);
  const data = new Int16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + width * height * 2));
  return { width, height, data, scale, label };
}
