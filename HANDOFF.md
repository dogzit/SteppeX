# Lunar Navigator handoff — 2026-11-14

The project now offers two experiences sharing one scenario:
- Simple (default): everyday exploration, plain-language summary, score, sunlight, Earth view and sunny-time finder.
- Expert: full measurements, score breakdown, daily start-date comparisons, a monthly year score map for 31 sites, night/battery estimates, visibility settings, sky table and comparison exports.

Implementation and evidence are in docs/REVIEW.md, including the full judging checklist and optional features deferred with reasons. Six phased commits follow starting commit d1c4d1c; application changes are committed locally, not pushed/deployed. The live steppex.vercel.app site will retain its deployed state until a deployment is made.

## Correctness
Mission statistics use refined terrain crossings and exact start/end clipping. Hour buckets are no longer substituted for the selected start minute. Validated sky-position, Moon frame and ephemeris functions are unchanged. The default Earth radio clearance is now 5°; use margin=0 to reproduce the reviewer's original 0° reference examples. Score weights remain 40/30/15/15 with explanations. Battery checks compare hours only, not a thermal/electrical spacecraft model.

The south-pole view uses a genuine polar-stereographic LOLA hillshade. Build display assets with node --import tsx scripts/build-polar-hillshade.ts using existing cached PDS sources. Hillshade illumination is explicitly cartographic, separate from Sun visibility.

## Checks
- npm test: 53 tests across 13 files pass, including JPL fixtures, exact mission spans, battery, ties, projection, contrast and date sampling.
- npm run build: passes.
- Full Playwright run: 30 tests passed; an additional positive-coordinate regression passed separately. Four focused summary/mode/screenshot/coordinate checks also passed after the final no-sunset wording guard.
- Phone 390px/375px, tablet 880px, desktop 1440×900 and both themes checked.
- Build before npx playwright test --workers=1. Rebuilding during a browser run invalidates lazy-chunk URLs.

The year score map samples monthly; daily date comparisons are also sampled. Neither claims to find the best minute globally. Dense polar score shading and DSN station coverage were deferred pending appropriate modeling/data. No Mongolian translation is invented: English navigation/glossary strings have a translation source structure under src/i18n and the layout/fonts allow Cyrillic.
