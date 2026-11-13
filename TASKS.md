# Tasks (kept current; ✅ done · 🔄 in progress · ⬜ todo · ❌ cut)
## 0 Scaffold ✅
✅ Vite+React+TS, Tailwind, Zustand, R3F/drei, Framer Motion, D3, Vitest, Playwright · ✅ git init + first commit
## 1 Ephemeris + validation ✅
✅ astronomy-engine RotationAxis(Moon) = WGCCRE 2009 incl. E1–E13 (verified in source) · ✅ moonFrame/topocentric (events → slice 3) · ✅ Horizons fixtures (4 sites × 151 epochs × Sun+Earth) · ✅ Vitest ≤0.1° (actual max 0.009°) · ✅ VALIDATION.md · ✅ ephemeris table (hourly 2023–2031, 1.1 MB) + loader test · ✅ commit
## 2 Globe + sites
⬜ Textures (SVS Moon Kit) · ⬜ Globe shaders (terminator, limb, relief) · ⬜ Earth marker + Sun light · ⬜ sites.json verified w/ sources+flags · ⬜ pins, fly-to, polar toggle, click-to-pin · ⬜ Playwright screenshots reviewed · ⬜ commit
## 3 Dashboard + timeline
⬜ Time controls (scrub, picker, play/speed, lunar-day jump) · ⬜ metrics + T-minus HUD · ⬜ viability score · ⬜ D3 bands day/month/year, hover, click-to-jump · ⬜ URL state · ⬜ screenshots · ⬜ commit
## 4 Horizon view + terrain
⬜ DEM fetch/downsample (Node) · ⬜ horizon sweep + cache · ⬜ worker for custom pins · ⬜ sky dome, silhouette, Sun/Earth discs, stars · ⬜ terrain wired into metrics · ⬜ screenshots · ⬜ commit
## 5 Compare
⬜ 2–4 scenarios · ⬜ slip slider + deltas · ⬜ nearby-sites mode · ⬜ CSV/JSON export · ⬜ commit
## 6 Polish + audiences
⬜ Planner/Explorer · ⬜ intro + fly-through · ⬜ Cmd+K, shortcuts · ⬜ event log · ⬜ Methodology panel · ⬜ a11y + reduced-motion + WebGL fallback · ⬜ README, demo script, pitch outline, limitations · ⬜ commit
## 7 Stretch
⬜ heatmap · ⬜ PSR / eternal-light · ⬜ real stars · ⬜ narrated tour · ⬜ kiosk · ⬜ mobile
