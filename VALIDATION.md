# Validation against JPL Horizons

**Result: maximum angular separation 0.0045° across 1208 epochs; tolerance 0.1° — PASS.**
Enforced by `tests/horizons.test.ts` (runs offline against committed fixtures). Regenerate fixtures with `npx tsx scripts/fetch-horizons.ts`, this file with `npm run validate`.

## What is compared
Topocentric azimuth/elevation of the **Sun** and the **Earth** as seen from a point on the lunar surface.

| | Ours | Horizons |
|---|---|---|
| Positions | astronomy-engine (VSOP87 Earth, Moon series ~1′), geometric | DE441, apparent, airless (`APPARENT='AIRLESS'`) |
| Moon orientation | IAU/WGCCRE 2009 Moon model incl. physical-libration terms E1–E13 (`RotationAxis`) | DE441 lunar libration (ME frame) |
| Observer | `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, radius 1737.4 km, zero flattening, local vertical = radial | same |
| Epochs | 2023-06-01 → 2028-06-01, 150 uniform steps (covers all libration phases and 5 seasons) | same |

## Results
| Site | Note | Target | N | max sep ° | mean sep ° | max \|Δel\| ° | max \|Δaz\|·cos(el) ° | worst epoch |
|---|---|---|---|---|---|---|---|---|
| apollo11 | Apollo 11, equatorial | earth | 151 | 0.0036 | 0.0016 | 0.0035 | 0.0035 | 2025-01-17T19:40Z |
| apollo11 | Apollo 11, equatorial | sun | 151 | 0.0045 | 0.0018 | 0.0042 | 0.0029 | 2026-07-19T22:04Z |
| chandrayaan3 | Chandrayaan-3, high southern latitude | earth | 151 | 0.0036 | 0.0016 | 0.0033 | 0.0035 | 2025-01-17T19:40Z |
| chandrayaan3 | Chandrayaan-3, high southern latitude | sun | 151 | 0.0045 | 0.0018 | 0.0027 | 0.0045 | 2026-07-19T22:04Z |
| malapert | Malapert massif area, 5 km height | earth | 151 | 0.0036 | 0.0016 | 0.0035 | 0.0034 | 2025-01-17T19:40Z |
| malapert | Malapert massif area, 5 km height | sun | 151 | 0.0045 | 0.0018 | 0.0026 | 0.0043 | 2026-07-19T22:04Z |
| shackleton-rim | Shackleton rim, 0.1° from the pole | earth | 151 | 0.0036 | 0.0016 | 0.0035 | 0.0034 | 2025-01-17T19:40Z |
| shackleton-rim | Shackleton rim, 0.1° from the pole | sun | 151 | 0.0045 | 0.0018 | 0.0026 | 0.0042 | 2026-07-19T22:04Z |

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
Terrain horizon (validated separately against the DEM in `tests/horizon.test.ts`), event timing (derived from these angles by bisection), hardware constraints.

## Terrain illumination vs. Gläser et al. (2018)
Our 2024–2025 hourly sweep with the LOLA-derived horizon (eye 2 m) against the 20-year, 20 m/px study (surface level unless noted; Planet. Space Sci., NTRS 20170007365, Table 1). Different DEM resolution, period and eye height, so agreement within a few percentage points is the expectation, not identity.

| Site | Avg illumination % (ours) | published | Solar visibility % (ours) | published | Longest shadow h (ours) | published | DEM used |
|---|---|---|---|---|---|---|---|
| Connecting Ridge C1 | 76.8 | 76 (88 at 2 m) | 82.5 | 81.3 (92.1 at 2 m) | 232 | 268 | LOLA DEM 40 m/px (<85°S), 240 m/px (75–85°S), 1.9 km/px beyond |
| Connecting Ridge C2 | 66.2 | 75.6 | 72.3 | 80.6 | 392 | 166 | LOLA DEM 40 m/px (<85°S), 240 m/px (75–85°S), 1.9 km/px beyond |
| Shackleton rim S | 83.4 | 81 | 88.2 | 85.5 | 155 | 221 | LOLA DEM 40 m/px (<85°S), 240 m/px (75–85°S), 1.9 km/px beyond |
| Whipple rim (north) | 43.9 | 82.9 | 48.9 | 88.5 | 436 | 101 | LOLA DEM 240 m/px polar tile, 1.9 km/px beyond 75° |

Avg illumination = mean visible fraction of the solar disc; solar visibility = fraction of time any part of the disc is above the terrain. Regenerate with `npm run validate:horizon`.

**Whipple (north) note.** At the published point our 240 m/px profile gives 43.9 %, but the best pixel within ±720 m gives 77.0 % (scripts/dev/check-whipple.ts). The published 82.9 % comes from a 20 m/px DEM where the rim crest is resolved. Conclusion: at the poles a few hundred metres of position change illumination by tens of percent, so (a) our south-pole numbers use the 40 m/px tile, (b) coarse-tile results (north pole, custom pins) are labelled as such in the app, and (c) the app's horizon profile should be read as "this pixel", not "this region".
