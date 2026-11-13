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
