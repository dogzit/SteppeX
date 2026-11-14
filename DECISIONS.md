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
| 12 | Eye height 2 m for all horizons; 250 km sweep; 1° azimuth step | Matches Gläser's lander/rover panel height; 250 km covers 5 km massifs after curvature |
| 13 | Planets included (astronomy-engine), 60-day rise/set search at 2 h steps | Cheap, delightful, and shows the no-atmosphere daylight visibility point |
| 14 | Find-a-window core is pure geometry over Window[] (no astronomy), driven by a thin wrapper that reuses the existing siteSeries/visibility/windows/refine pipeline at a 15-min coarse grid + bisection refinement | Deterministically testable edge cases; agrees with the dashboard/lander view to ~1 s like every other event in the app |
| 15 | Only a single continuous Earth-visible window may satisfy the Earth requirement (no summing disjoint windows) | Matches "continuous Earth visibility" in the user story; verified by the two-separate-1h-windows test |
| 16 | Selecting/copying a result moves the mission clock to its start (same as existing DTE-window rows), which re-anchors the live 90-day search; the Timeline highlight and shared link instead persist the exact chosen window independently of the live list | Keeps "search from the scenario time" live and reactive without breaking "reopen the exact selected window" |
| 17 | fw_sun/fw_earth/fw_start/fw_end URL params are omitted at their defaults / when unset | Existing shared links keep their current shape; only sessions that touch the finder gain new params |
| 18 | Minimal `max-w-[calc(100vw-2rem)]` safety clamp added to the Dashboard and SitePanel asides | Without it the finder (now inside Dashboard) is clipped off-screen on phone widths; full mobile/kiosk layout remains out of scope (LIMITATIONS.md #12) |
