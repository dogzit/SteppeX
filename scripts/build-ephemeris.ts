/** Build public/data/ephem.bin (+ ephem.json): hourly body-fixed Sun/Earth directions 2023-01-01 .. 2031-01-01. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { generateEphem, type EphemMeta } from '../src/astro/ephemTable';

const startMs = Date.UTC(2023, 0, 1), stepMs = 3600_000, count = Math.round((Date.UTC(2031, 0, 1) - startMs) / stepMs) + 1;
const t0 = Date.now();
const data = generateEphem(startMs, stepMs, count);
const meta: EphemMeta = { version: 1, startMs, stepMs, count, frame: 'Moon ME body-fixed, IAU/WGCCRE 2009 via astronomy-engine' };
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/ephem.bin', Buffer.from(data.buffer));
writeFileSync('public/data/ephem.json', JSON.stringify(meta));
console.log(`ephem.bin: ${count} samples, ${(data.byteLength / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
