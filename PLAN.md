# LUNAR NAVIGATOR — Plan
NASA Space Apps 2026 · "Lunar Landing Site Navigator" (CLPS)
One-line pitch: *Pick a site and a date; in <10 s know if it has power and Earth contact, and what a launch slip costs.*

## 1. Architecture
Static SPA (Vite + React 18 + TS). No backend. All heavy data precomputed at build time; all interaction is client-side math.

Key design idea — **split site-independent from site-dependent work**:
- **Site-independent (precomputed once):** unit vectors of the Sun and Earth in the Moon body-fixed (mean-Earth/polar-axis) frame at 1-hour steps, 2023-01-01 → 2031-01-01 (~70k samples, Int16-quantized ≈ 850 KB gzip'd). Shipped as a binary; a Web Worker regenerates it for dates outside the range.
- **Site-dependent (cheap at runtime):** rotate those vectors into the site's local ENU frame (3 dot products) → azimuth/elevation. Compare the elevation with the cached terrain horizon profile at that azimuth. A one-year timeline at 10-min resolution for 4 scenarios is sub-millisecond; the "launch slip" slider is just an index offset. This is what makes compare mode feel instant.
- Exact (non-interpolated) ephemeris is used for the live readout and to bisect event times (sunrise/sunset/Earthrise/Earthset) to ±1 s.

```
scripts/            build-time Node: fetch LOLA DEM → downsample → horizon profiles; ephemeris table; Horizons fixtures
src/astro/          pure TS, DOM-free: moonFrame, topocentric, events, horizon, illumination, score
src/data/           sites.json (lat, lon, source URL, confidence flag), horizons fixtures
src/state/          Zustand store, URL <-> state serializer (shareable links)
src/scenes/         R3F: Globe (shaders: terminator, limb glow, relief), HorizonDome (sky, terrain skirt, Sun/Earth discs, stars)
src/ui/             HUD panels, Dashboard, Timeline (D3), Compare, CommandPalette, Methodology, Explorer/Planner modes
src/workers/        horizon.worker (custom-pin horizon from DEM tile), ephemeris.worker
public/data/        DEM tiles (small, downsampled), horizon cache, textures
tests/              Vitest (astro core + Horizons agreement), Playwright (screenshots, smoke)
```

## 2. Science approach
| Need | Approach |
|---|---|
| Sun/Earth vectors | `astronomy-engine` (VSOP87-based Earth, Moon series ~1′) in J2000 equatorial |
| Moon orientation + physical libration | `astronomy-engine` `RotationAxis(Moon)` = IAU/WGCCRE 2009 Moon model (pole RA/Dec + prime meridian W incl. E1–E13 trig terms). Optical libration falls out of the geometry; physical libration comes from the series. Verified in slice 1 — fallback is to implement the WGCCRE series myself (~40 lines). |
| Topocentric az/el | Site on 1737.4 km sphere + DEM height; local vertical = radial (matches Horizons' zero-flattening geodetic convention). No refraction. |
| Terrain horizon | LOLA GDR polar-stereographic DEM (PDS Geosciences `ldem_80s_*` / `ldem_75s_*`; exact product chosen in slice 4 by size vs. resolution, target 120–240 m/px, kept out of git). Sweep 360 azimuths × ray-march to 250 km, true 3D curvature. Profiles cached per library site; custom pins compute in a worker from a tile; outside the polar tile → spherical horizon (labelled). Global fallback `ldem_16` if polar fetch fails. |
| Sun as a disc | Compute fraction of the 0.53° solar disc above the local horizon line → "illumination %" (penumbral sunsets become visible). Sunset defaults to disc-centre crossing; toggle for upper limb. Earth 1.9° disc, centre used for visibility. |
| Earth phase | From Sun–Earth–Moon geometry (cheap, shown on the Earth disc in the horizon view). |
| Validation | JPL Horizons API, observer `coord@301` (geodetic lon/lat/alt on Moon), targets Sun (10) and Earth (399), quantity 4 (az/el). ≥3 sites (incl. 89.9°S Shackleton rim, Chandrayaan-3, Apollo 11) × ≥3 dates. Fixtures committed; Vitest asserts \|Δaz\|,\|Δel\| ≤ 0.1° (expected ≈0.02°). Results in VALIDATION.md. Qualitative anchors: Chandrayaan-3 (landed 2023-08-23, local morning), Blue Ghost M1 (sunset ≈ 2025-03-16), IM-1. |
| Viability score 0–100 | Over a planner-set window (default 14 d from landing): 40 % sunlit fraction · 30 % Earth-visible fraction · 15 % longest continuous sunlight / window · 15 % margin to first sunset (capped at 72 h). Weights editable in Planner mode; formula shown in-app. |

Known unmodelled (stated in Methodology panel): refraction (none, correctly), solar penumbra beyond the flat-horizon disc model, DEM resolution limits, regolith/thermal/hardware, Earth-station visibility on the Earth side, relay satellites.

## 3. Data sources
- Ephemeris: astronomy-engine (MIT); validation: JPL Horizons (ssd.jpl.nasa.gov/api/horizons.api).
- Terrain: LRO LOLA GDR (PDS Geosciences Node, NASA/GSFC/ASU). Reference radius 1737.4 km.
- Globe textures: NASA SVS "CGI Moon Kit" (LROC WAC color + LOLA displacement, 4k). Public domain.
- Sites: NASA/LROC Apollo coordinates; ISRO (Chandrayaan-3); CNSA/published papers (Chang'e-3/4/5/6); JAXA (SLIM); Intuitive Machines/NASA (IM-1, IM-2); Firefly (Blue Ghost M1); NASA Artemis III candidate regions (2024 list, region *centres*, flagged approximate); Luna-25 and Peregrine as *planned/failed* targets, flagged. Each entry carries `source` + `confidence`. Nothing unverifiable goes in without a flag.

## 4. Milestones (vertical slices; each runs end-to-end, then commit)
0. Scaffold: Vite/React/TS, Tailwind, Zustand, R3F, Vitest, Playwright, git init, CI-less static build.
1. **Ephemeris + validation**: astro core, Horizons fixtures, VALIDATION.md, ephemeris table script.
2. **Globe + sites**: textured globe, terminator/Sun light, Earth marker, pins, fly-to, polar view, click-to-drop pin, sites.json verified. Screenshot review.
3. **Dashboard + timeline**: date scrubber/picker, play/speed, lunar-day jump, metrics, viability score, D3 bands (day/month/year), URL state. Screenshot review.
4. **Horizon view + terrain**: DEM pipeline, horizon profiles, sky dome with silhouette, Sun/Earth discs, stars. Terrain feeds all metrics. Screenshot review.
5. **Compare mode**: 2–4 scenarios, slip slider with deltas, nearby-sites mode, CSV/JSON export.
6. **Polish + audiences**: Planner/Explorer, boot intro, Earth→pole fly-through, Cmd+K, shortcuts, event log, Methodology panel, a11y (AA, keyboard, reduced-motion), WebGL fallback, README/screenshots, demo script, pitch outline, limitations.
7. Stretch (only if 0–6 are solid): south-pole heatmap (build-time horizon grid ~2 km), PSR overlay / eternal-light finder, real stars (HYG mag<5), narrated tour, kiosk mode, mobile.

Definition of done per slice: `npm run typecheck && npm test && npm run build` green, screenshots reviewed, commit.

## 5. Risks → mitigations
- **Frame/sign errors** (east-longitude, W angle, pole axis) → caught by Horizons test in slice 1 before anything visual depends on it.
- **DEM download size/slow PDS** → pick the smallest polar product that gives ≤240 m/px; cache in `.cache/`; pure-Node IMG parser (int16 LSB + PDS label), no GDAL. Fallback to `ldem_16` global (~33 MB) with honest "coarse terrain" label.
- **Horizons API down/rate-limited** → fixtures committed once; tests run offline.
- **Perf** (globe + dome + D3 in one page) → one R3F canvas, lazy-load dome, precomputed tables, workers for any loop > 5 ms, frame budget checked in Playwright trace.
- **Scope** → cut order below; core features 1–8 are not negotiable, stretch is.
- **Coordinate provenance** (Artemis regions, IM-2 exact point) → flagged `approximate`, source linked; never silently invented.

## 6. Cut order if time runs out
heatmap/PSR → narration/sonification → kiosk & mobile → real stars → Earth phase → custom-pin terrain horizon (spherical fallback) → compare 4→2 → guided tour (static callouts remain).

## 7. Deviations from your tech list (and why)
- Horizon/ephemeris in **Web Workers with plain postMessage** (no Comlink) — fewer deps.
- URL state via a **small hand-written serializer** (not a lib) — tight control of short shareable links.
- **No Python/GDAL** in the pipeline — Node-only so `npm run data` works on any machine.
- Deployment: **Vercel** zero-config default, plus `BASE_PATH` env for GitHub Pages. Both static.
Everything else as you specified (Vite, React, TS, R3F/drei, Zustand, Tailwind, Framer Motion, D3, Vitest, Playwright).
