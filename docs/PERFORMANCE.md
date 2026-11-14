# Cold load

Measured on the production build with an empty cache and Chrome DevTools "Slow 4G"
throttling: 400 kB/s down, 400 ms round trip, 390 × 844 viewport.

Reproduce with:

```bash
npm run build && npm run preview -- --port 4173 --strictPort
node scripts/dev/cold-load-audit.mjs      # AUDIT_URL=... to point it elsewhere
```

| Milestone | Time |
|---|---|
| First contentful paint | 1 368 ms |
| Largest contentful paint | 1 368 ms |
| Interactive, first control tappable | 1 367 ms |
| Scene canvas present | 3 355 ms |
| DOMContentLoaded | 1 230 ms |
| Total transferred | 2 579 kB over 19 requests |

## What the first paint waits for

Six requests, about 1 kB of payload after compression: the document, the stylesheet, the
runtime chunk, two application chunks and the Google Fonts stylesheet. No data file and no
texture is on that path.

The heavy payloads all arrive afterwards, behind the boot screen, which shows its own progress
for the ephemeris table and the terrain profiles:

| Asset | Size | Arrives |
|---|---|---|
| `data/ephem.bin` | 1 096 kB | 1.8 s |
| `textures/moon_color_4k.jpg` | 1 251 kB | 3.9 s |
| `textures/polar-south.png` | 1 011 kB | 3.9 s |
| `textures/polar-north.png` | 1 005 kB | 3.9 s |
| `textures/moon_normal_2k.jpg` | 772 kB | 3.9 s |
| `textures/earth_2k.jpg` | 285 kB | 4.2 s |

## The 9.3 MB of elevation data does not load

`public/data` holds 9.3 MB, but 8.2 MB of that is the three DEM tile files used to build a
horizon for a *custom* pin. They are fetched by the Web Worker, only when someone drops a pin
off the site library, and never during boot. A cold load touches `ephem.bin` and the 74 kB
`horizons.json` and nothing else from that folder. The site library's own horizon profiles are
precomputed into that 74 kB file.

Both boot fetches degrade gracefully. Without `ephem.bin` the app falls back to the exact
ephemeris path, slower but identical in result. Without `horizons.json` sites fall back to a
smooth sphere horizon, which the interface labels.
