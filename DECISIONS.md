# Decisions & assumptions
| # | Decision | Why |
|---|---|---|
| 1 | astronomy-engine + its WGCCRE 2009 Moon rotation model instead of SPICE | No WASM SPICE needed; model is the IAU standard incl. physical libration; validated vs Horizons |
| 2 | Site-independent body-fixed Sun/Earth vector table (hourly, 2023–2031) + per-site rotation | Makes compare/slip/timeline sub-ms; exact ephemeris only for live readout + event bisection |
| 3 | Sunset = Sun disc centre crossing terrain horizon (toggle: upper limb); also report illuminated-disc % | Unambiguous default; disc fraction captures penumbral sunsets for power |
| 4 | Local vertical = radial on 1737.4 km sphere; heights = LOLA DEM above that sphere | Matches Horizons and LOLA conventions |
| 5 | Polar DEM at 120–240 m/px, ray-march 250 km, 1° azimuth steps | Resolves Malapert/Shackleton-scale relief at budget cost; limits documented |
| 6 | Viability weights 40/30/15/15 (sun, Earth, continuity, margin), 14-day window | Transparent, editable in Planner mode |
| 7 | All times UTC; default date = now, presets for IM-1, Blue Ghost, Chandrayaan-3, Artemis III (2027) | Presets double as sanity checks |
| 8 | Vercel default, GH Pages via BASE_PATH | Both static; zero config |
| 9 | Window stats + event search recomputed per simulated hour (or when an event passes); instantaneous values every frame | Keeps playback at 60 fps; bisection refinement costs ~8 ms per site |
| 10 | Spherical fallback horizon = 0° everywhere (no dip for elevated sites) | A plateau site sees level terrain nearby; the true dip/obstruction comes from the DEM in slice 4 |
| 11 | Timeline sampling: day 2 min, lunar month 20 min, year 2 h; window stats 10 min; event search 1 h grid + bisection to 1 s | Resolution vs. instant response; sub-step terrain flicker in the year view is documented |
