# Known limitations and next steps

## Limitations (honest list)
1. **DEM resolution bounds everything at the poles.** 40 m/px inside 85°S, 240 m/px elsewhere near the poles, 1.9 km/px globally; custom pins use 720 m/px and 7.6 km/px tiles. A profile describes one pixel: moving 720 m along the Whipple rim changes yearly illumination from 44 % to 77 % (VALIDATION.md). North-pole and custom-pin results are therefore labelled coarse.
2. **Eye height is fixed at 2 m** for horizons; taller masts see more.
3. **Disc model is geometric**: the visible fraction of a flat-edged solar disc against a locally straight horizon. No limb darkening, no scattering (there is none on the Moon), no penumbra from sub-pixel terrain.
4. **Power is geometry only**: no panel orientation/tracking, temperature, dust, battery or thermal survival modelling. "Longest dark" is given so planners can judge night survival themselves.
5. **Comms is line-of-sight only**: Earth above the terrain plus your mask angle. No ground-station visibility on the Earth side, no relay satellites (Chang'e-4/6 are flagged as relay missions), no link budget.
6. **Ephemeris**: analytic series (Moon ≈1′) and the IAU 2009 rotation model rather than DE440/SPICE kernels; light-time and aberration (≈0.006°) are not applied. Validated to 0.009° against Horizons, which is far below terrain-induced uncertainty.
7. **Shape**: the Moon is treated as a 1737.4 km sphere for the local vertical (consistent with LOLA and Horizons conventions); DEM heights are relative to that sphere.
8. **Coordinates**: Artemis III entries are *published candidate points* inside NASA's regions, not NASA's final sites; Griffin-1 is a feature centre; IM-2 is a secondary-source point. Each site carries a confidence flag and its source.
9. **Lander view**: Earth's axial orientation is approximate; the star field is procedural (decorative), not a catalogue.
10. **Time range**: the precomputed table covers 2023–2031; other dates fall back to exact ephemeris (slower, still correct). Event searches stop at 400 days (60 days for planets).
11. **Timeline sampling**: 2 min / 20 min / 2 h for day / month / year views; terrain flicker shorter than the step can be missed in the year view.
12. **The south-pole sunlight map is a 1.2 km grid.** Each cell is one horizon sweep at its centre, computed at 2° azimuth steps rather than the 1° used for sites, so a cell describes its centre point and not the ground around it. Given limitation 1, that is the dominant uncertainty: neighbouring cells on a rim crest can differ by tens of percentage points. The map covers 5° of colatitude, which is the 40 m/px DEM's coverage, and is blank beyond it.
13. **"Peaks of eternal light" is a ranking, not a survey.** It takes the brightest grid cells, keeps them 8 km apart so one ridge cannot fill the list, then recomputes each at the full 1° horizon resolution. A finer grid would find brighter points between the cells sampled here, and the published 20 m/px studies do. The figures are for one reference year; the Moon's 18.6-year nodal cycle shifts them.
14. **Compact layouts** use Sites/Details drawers below 1280 px and have been checked at 390 × 844 and 880 × 900. Dedicated kiosk and short landscape-screen layouts remain unfinished.

## Next steps
- Finer illumination grids near the pole, and a permanently-shadowed-region overlay derived from the same sweep.
- **Higher-resolution tiles on demand** (LOLA 5–20 m/px around the pole) and user-set eye height.
- Panel-geometry power estimates and simple thermal/battery survival margins.
- Ground-station and relay visibility; antenna pattern masks per azimuth.
- Artemis III region polygons when NASA publishes them; CLPS manifest sync.
- Short landscape-screen layout, kiosk/projector mode, narrated tour.
