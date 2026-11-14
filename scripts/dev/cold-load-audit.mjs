/**
 * Cold-load audit on the production build.
 *
 * Starts from an empty cache and a throttled mobile connection, then reports what the
 * first paint actually waits for. Run the preview server first:
 *   npm run build && npm run preview -- --port 4173 --strictPort
 *   node scripts/dev/cold-load-audit.mjs
 */
import { chromium } from '@playwright/test';

const URL_UNDER_TEST = process.env.AUDIT_URL ?? 'http://localhost:4173/?site=artemis-cr&t=2026-11-20T12:00Z&nointro';
// Chrome DevTools "Slow 4G": 400 kB/s down, 400 ms round trip.
const SLOW_4G = { offline: false, downloadThroughput: 400 * 1024, uploadThroughput: 400 * 1024, latency: 400 };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', SLOW_4G);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

const requests = [];
page.on('response', async (r) => {
  const t = Date.now() - t0;
  let size = 0;
  try { size = Number((await r.headerValue('content-length')) ?? 0); } catch { /* streamed */ }
  requests.push({ url: new globalThis.URL(r.url()).pathname, status: r.status(), size, at: t });
});

// LCP is only readable through a buffered observer, so arm it before anything navigates.
await page.addInitScript(() => {
  globalThis.__lcp = 0;
  new PerformanceObserver((list) => { globalThis.__lcp = Math.round(list.getEntries().at(-1).startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
});

const t0 = Date.now();
await page.goto(URL_UNDER_TEST, { waitUntil: 'commit' });

// First moment the interface answers a tap: the Sites control is attached and enabled.
await page.getByRole('button', { name: 'Sites', exact: true }).waitFor({ state: 'visible' });
const interactive = Date.now() - t0;
// First moment the measurements on screen are the real ones: the terrain profiles have landed.
await page.waitForFunction(() => document.querySelector('canvas') !== null);
const canvasAt = Date.now() - t0;
await page.waitForTimeout(12000); // let the scene finish on a slow link

const paint = await page.evaluate(() => {
  const e = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
  const nav = performance.getEntriesByType('navigation')[0];
  const lcp = globalThis.__lcp || null;
  return {
    fcp: e['first-contentful-paint'] ?? null,
    lcp,
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    load: Math.round(nav.loadEventEnd),
    transferred: Math.round(performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
  };
});

const before = (ms) => requests.filter((r) => r.at <= ms);
const kb = (rs) => Math.round(rs.reduce((a, r) => a + r.size, 0) / 1024);
console.log(`\nCold load · Slow 4G (400 kB/s, 400 ms RTT) · 390x844 · cache disabled`);
console.log(`  first contentful paint   ${paint.fcp} ms`);
console.log(`  largest contentful paint ${paint.lcp} ms`);
console.log(`  interactive (Sites tap)  ${interactive} ms`);
console.log(`  canvas present           ${canvasAt} ms`);
console.log(`  DOMContentLoaded         ${paint.domContentLoaded} ms`);
console.log(`  load event               ${paint.load} ms`);
console.log(`  transferred total        ${paint.transferred} kB over ${requests.length} requests`);
console.log(`  bytes before FCP         ${kb(before(paint.fcp))} kB over ${before(paint.fcp).length} requests`);
console.log(`\n  requests before first paint:`);
for (const r of before(paint.fcp)) console.log(`    ${String(r.at).padStart(6)} ms  ${String(Math.round(r.size / 1024)).padStart(5)} kB  ${r.url}`);
const heavy = requests.filter((r) => r.size > 200 * 1024).sort((a, b) => b.size - a.size);
console.log(`\n  payloads over 200 kB (all of them after first paint if the list above is clean):`);
for (const r of heavy) console.log(`    ${String(r.at).padStart(6)} ms  ${String(Math.round(r.size / 1024)).padStart(5)} kB  ${r.url}`);
const dem = requests.filter((r) => /dem_|\.bin$/.test(r.url));
console.log(`\n  elevation-model requests: ${dem.length ? dem.map((d) => d.url).join(', ') : 'none (worker tiles stay unfetched until a custom pin needs them)'}`);

await browser.close();
