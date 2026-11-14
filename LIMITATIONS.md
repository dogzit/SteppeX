# Known limitations and next steps

## Limitations (honest list)
1. **DEM resolution bounds everything at the poles.** 40 m/px inside 85°S, 240 m/px elsewhere near the poles, 1.9 km/px globally; custom pins use 720 m/px and 7.6 km/px tiles. A profile describes one pixel: moving 720 m along the Whipple rim changes yearly illumination from 44 % to 77 % (VALIDATION.md). North-pole and custom-pin results are therefore labelled coarse.
2. **Eye height is fixed at 2 m** for horizons; taller masts see more.
3. **Disc model is geometric**: the visible fraction of a flat-edged solar disc against a locally straight horizon. No limb darkening, no scattering (there is none on the Moon), no penumbra from sub-pixel terrain.
4. **Power is geometry only**: no panel orientation/tracking, temperature, dust, battery or thermal survival modelling. "Longest dark" is given so planners can judge night survival themselves.
5. **Comms is line-of-sight only**: Earth above the terrain plus your mask angle. No ground-station visibility on the Earth side, no relay satellites (Chang'e-4/6 are flagged as relay missions), no link budget.
6. **Ephemeris**: analytic series (Moon ≈1′) and the IAU 2009 rotation model rather than DE440/SPICE kernels; light-time and annual aberration are applied (aberration for the geocentre, ≈0.0007° residual). Validated to 0.0045° (Sun) and 0.0036° (Earth) against JPL Horizons. Near the poles this small angle error still moves sunrise/sunset times by minutes, and DEM resolution moves them more; see VALIDATION.md.
7. **Shape**: the Moon is treated as a 1737.4 km sphere for the local vertical (consistent with LOLA and Horizons conventions); DEM heights are relative to that sphere.
8. **Coordinates**: the Artemis entries are *published candidate points* inside two of NASA's 2022 candidate regions (Connecting Ridge, Peak Near Shackleton), not NASA's final sites; neither region is on NASA's refined 2024 list of nine, and the first crewed landing is now planned for Artemis IV; Griffin-1 is a feature centre; IM-2 is a secondary-source point. Each site carries a confidence flag and its source.
9. **Lander view**: Earth's axial orientation is approximate; the star field is procedural (decorative), not a catalogue.
10. **Time range**: the precomputed table covers 2023–2031; other dates fall back to exact ephemeris (slower, still correct). Event searches stop at 400 days (60 days for planets).
11. **Timeline sampling**: 2 min / 20 min / 2 h for day / month / year views; terrain flicker shorter than the step can be missed in the year view.
12. **Compact layouts** use Sites/Details drawers below 1280 px and have been checked at 390 × 844 and 880 × 900. Dedicated kiosk and short landscape-screen layouts remain unfinished.

## Next steps
- South-pole **illumination heatmap** (fraction of a chosen month in sunlight / Earth view) from a build-time horizon grid, PSR overlay and a "peak of eternal light" finder.
- **Higher-resolution tiles on demand** (LOLA 5–20 m/px around the pole) and user-set eye height.
- Panel-geometry power estimates and simple thermal/battery survival margins.
- Ground-station and relay visibility; antenna pattern masks per azimuth.
- NASA's nine refined (2024) Artemis candidate regions as polygons when NASA publishes them; CLPS manifest sync.
- Short landscape-screen layout, kiosk/projector mode, narrated tour.
