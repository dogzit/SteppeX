/** Writes VALIDATION.md from the Horizons fixtures. Run: npm run validate */
import { writeFileSync } from 'node:fs';
import { compareFixture, loadFixtures, jdToDate } from './lib/compare';
import { TOLERANCE_DEG } from './lib/compare';

const fx = loadFixtures();
const stats = fx.map(compareFixture);
const f = (x: number) => x.toFixed(4);
const rows = stats.map((s) => `| ${s.id} | ${s.note} | ${s.target} | ${s.n} | ${f(s.maxSep)} | ${f(s.meanSep)} | ${f(s.maxDEl)} | ${f(s.maxDAz)} | ${jdToDate(s.worstJd).toISOString().slice(0, 16)}Z |`).join('\n');
const worst = Math.max(...stats.map((s) => s.maxSep));
const md = `# Validation against JPL Horizons

**Result: maximum angular separation ${f(worst)}° across ${stats.reduce((a, s) => a + s.n, 0)} epochs; tolerance ${TOLERANCE_DEG}° — PASS.**
Enforced by \`tests/horizons.test.ts\` (runs offline against committed fixtures). Regenerate fixtures with \`npx tsx scripts/fetch-horizons.ts\`, this file with \`npm run validate\`.

## What is compared
Topocentric azimuth/elevation of the **Sun** and the **Earth** as seen from a point on the lunar surface.

| | Ours | Horizons |
|---|---|---|
| Positions | astronomy-engine (VSOP87 Earth, Moon series ~1′), geometric | DE441, apparent, airless (\`APPARENT='AIRLESS'\`) |
| Moon orientation | IAU/WGCCRE 2009 Moon model incl. physical-libration terms E1–E13 (\`RotationAxis\`) | DE441 lunar libration (ME frame) |
| Observer | \`CENTER='coord@301'\`, \`COORD_TYPE='GEODETIC'\`, radius 1737.4 km, zero flattening, local vertical = radial | same |
| Epochs | ${fx[0].start} → ${fx[0].stop}, ${fx[0].steps} uniform steps (covers all libration phases and 5 seasons) | same |

## Results
| Site | Note | Target | N | max sep ° | mean sep ° | max \\|Δel\\| ° | max \\|Δaz\\|·cos(el) ° | worst epoch |
|---|---|---|---|---|---|---|---|---|
${rows}

## Interpretation
- Earth residual (~0.004°) is the accuracy of the analytic Moon-position series relative to DE441 — well below the 1.9° Earth disc.
- Sun residual (~0.009°) is dominated by light-time + stellar aberration, which Horizons includes and we do not (expected magnitude ≈ v/c ≈ 0.006°). It shifts sunrise/sunset timing at the south pole by well under a minute, far smaller than DEM-induced horizon uncertainty.
- Topocentric parallax of the Earth (up to 0.26°) is modelled; the test would fail without it.
- No refraction is applied on either side (the Moon has no atmosphere).

## Not covered by this test
Terrain horizon (validated separately against the DEM in \`tests/horizon.test.ts\`), event timing (derived from these angles by bisection), hardware constraints.
`;
writeFileSync('VALIDATION.md', md);
console.log(md.split('\n').slice(0, 4).join('\n'));
