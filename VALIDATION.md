# Validation against JPL Horizons

**Result: maximum angular separation 0.0090° across 1208 epochs; tolerance 0.1° — PASS.**
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
| apollo11 | Apollo 11, equatorial | sun | 151 | 0.0090 | 0.0050 | 0.0086 | 0.0045 | 2024-12-12T06:43Z |
| chandrayaan3 | Chandrayaan-3, high southern latitude | earth | 151 | 0.0036 | 0.0016 | 0.0033 | 0.0035 | 2025-01-17T19:40Z |
| chandrayaan3 | Chandrayaan-3, high southern latitude | sun | 151 | 0.0090 | 0.0050 | 0.0036 | 0.0088 | 2024-12-12T06:43Z |
| malapert | Malapert massif area, 5 km height | earth | 151 | 0.0036 | 0.0016 | 0.0035 | 0.0034 | 2025-01-17T19:40Z |
| malapert | Malapert massif area, 5 km height | sun | 151 | 0.0090 | 0.0050 | 0.0029 | 0.0088 | 2024-12-12T06:43Z |
| shackleton-rim | Shackleton rim, 0.1° from the pole | earth | 151 | 0.0036 | 0.0016 | 0.0035 | 0.0034 | 2025-01-17T19:40Z |
| shackleton-rim | Shackleton rim, 0.1° from the pole | sun | 151 | 0.0090 | 0.0050 | 0.0027 | 0.0089 | 2024-12-12T06:43Z |

## Interpretation
- Earth residual (~0.004°) is the accuracy of the analytic Moon-position series relative to DE441 — well below the 1.9° Earth disc.
- Sun residual (~0.009°) is dominated by light-time + stellar aberration, which Horizons includes and we do not (expected magnitude ≈ v/c ≈ 0.006°). It shifts sunrise/sunset timing at the south pole by well under a minute, far smaller than DEM-induced horizon uncertainty.
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
