/** Fetch JPL Horizons az/el fixtures for Moon-surface observers. Run: npx tsx scripts/fetch-horizons.ts */
import { mkdirSync, writeFileSync } from 'node:fs';
import { horizonsUrl, parseRows, type Fixture, type HSite } from './lib/horizons';

const SITES: HSite[] = [
  { id: 'apollo11', lat: 0.67408, lon: 23.47297, alt: 0, note: 'Apollo 11, equatorial' },
  { id: 'chandrayaan3', lat: -69.373, lon: 32.319, alt: 0, note: 'Chandrayaan-3, high southern latitude' },
  { id: 'malapert', lat: -86.0, lon: 0.0, alt: 5, note: 'Malapert massif area, 5 km height' },
  { id: 'shackleton-rim', lat: -89.9, lon: 0.0, alt: 0, note: 'Shackleton rim, 0.1° from the pole' },
];
const START = '2023-06-01', STOP = '2028-06-01', STEPS = 150;
const DIR = 'tests/fixtures/horizons';
mkdirSync(`${DIR}/raw`, { recursive: true });

for (const site of SITES) for (const target of ['sun', 'earth'] as const) {
  const url = horizonsUrl(site, target, START, STOP, STEPS);
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${site.id}/${target}\n${text.slice(0, 800)}`);
  writeFileSync(`${DIR}/raw/${site.id}-${target}.txt`, text);
  const rows = parseRows(text);
  const fx: Fixture = { site, target, start: START, stop: STOP, steps: STEPS, url, fetchedAt: new Date().toISOString(), rows };
  writeFileSync(`${DIR}/${site.id}-${target}.json`, JSON.stringify(fx));
  console.log(`${site.id}/${target}: ${rows.length} rows`);
  await new Promise((r) => setTimeout(r, 1500));
}
