# Handoff — 2026-11-14

## Current work
The branch is `main`; responsive UI changes remain uncommitted. README commit e10986a was pushed to origin/main at https://github.com/dogzit/NASA.git. Application changes remain local and uncommitted.

Lunar Navigator is a React/TypeScript/Vite lunar mission planner. The astronomy, terrain, compare, and window-finder implementation is described in README.md, DECISIONS.md, TASKS.md, and VALIDATION.md.

## Responsive changes
- Below 1280 px, Sites and Details are mutually exclusive drawers, closed initially. Changing the selected site/pin opens Details without changing mission time.
- Phones below 640 px start with a slim header (Sites, Details, controls menu) and a small playback/date bar. Extra controls and the timeline expand only on request. Site panels use a dismissible bottom sheet capped at 55% of viewport height. Tablet timeline controls and chart use separate rows; phone tick labels use fewer ticks.
- The More views menu supports arrows, Escape, focus return, and native Space activation. Space on a focused button no longer triggers the global playback shortcut.
- Dashboard labels distinguish the forward mission window from the timeline interval, show weighted score contributions, and distinguish the next sunlight transition from longest darkness.
- Coordinates render to three decimals while stored values retain precision. Event-search and margin constants are shared with UI labels.
- The zero-margin explanation reflects the actual sunlight lead-time formula; there is no battery survival model.

## Checks
- `npm run build` passes.
- `npm test`: 37 tests pass across 7 files.
- Latest phone refinement: build and 37 unit tests pass; all 16 responsive/window-finder browser tests pass, including 390×844 and 375×667 viewport clearance, controls expansion, timeline dismissal, and bottom-sheet height. The older full smoke suite passed before this refinement.
- Responsive screenshots live in docs/screens/r-*.png; the clear phone view is docs/screens/phone-390-clear.png (also phone-375-clear.png). Tracked smoke-test screenshots were restored to their session-start contents.
- `npx playwright test --workers=1` uses the production build via a preview server on port 4173. Build before running it; rebuilding during a browser run can invalidate lazy chunk URLs.

## Remaining scope
Short landscape screens and dedicated kiosk layouts remain unfinished. Original untracked debug scripts in scripts/dev/ were preserved. Repository instructions CLAUDE.md and AGENTS.md were absent when this work began.
