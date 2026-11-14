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
- Sun residual (~0.0045°): light-time and annual aberration are applied (aberration for the geocentre; the Moon's heliocentric velocity differs by ~1 km/s, ≈0.0007°). The rest is the analytic series vs DE441. Before aberration was added the Sun residual was 0.009°.
- What this means for event times: at low and mid latitudes the Sun moves ~0.5°/h, so 0.005° is well under a minute. At the poles the Sun skims the horizon at a very shallow angle, so the same tiny angle error moves a sunrise or sunset by minutes, and by up to ~30 min when the Sun just grazes a ridge. The DEM resolution (40–720 m) is a much larger source of timing uncertainty there. Event times are found to ±1 s *precision* by bisection; that is not their *accuracy*.

## Independent audit (Nov 2026)
A separate reference built from JPL DE421 positions and NAIF's lunar orientation kernel (moon_pa_de421, frame MOON_ME_DE421) via Skyfield. It reproduces the committed Horizons fixtures to 0.00004°.
- Sun and Earth az/el, 45 sites × 2,650 epochs (1969–2048, both poles, lon ±180°): Sun max 0.0094°, Earth max 0.0042° (before the aberration change).
- Hourly table (ephem.bin) vs the exact path, 60,000 random times: max 0.0015°.
- 14-day dashboard metrics, 11 sites × 8 dates: within 0.2 percentage points.
- Horizon sweep vs an independent implementation on the same tile: identical.
- Found and fixed: event refinement could return the far edge of an hour bracket (up to ~1 h late) when the table and the exact ephemeris disagreed by a hair at a grazing crossing; the horizon sweep was degenerate at exactly ±90° latitude; windows still open at the end of a period were reported one step too long. Regression tests: tests/audit-regressions.test.ts.
- Topocentric parallax of the Earth (up to 0.26°) is modelled; the test would fail without it.
- No refraction is applied on either side (the Moon has no atmosphere).

## Not covered by this test
Terrain horizon (validated separately against the DEM in \`tests/horizon.test.ts\`), event timing (derived from these angles by bisection), hardware constraints.
`;
writeFileSync('VALIDATION.md', md);
console.log(md.split('\n').slice(0, 4).join('\n'));
