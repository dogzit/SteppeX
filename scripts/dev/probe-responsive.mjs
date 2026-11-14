import { chromium } from '@playwright/test';
const b = await chromium.launch();
async function shot(width, height, name, actions) {
  const ctx = await b.newContext({ viewport: { width, height } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:4173/?site=artemis-cr&t=2026-11-20T12:00Z&nointro');
  await p.waitForTimeout(2500);
  if (actions) await actions(p);
  await p.screenshot({ path: `docs/screens/${name}.png`, fullPage: false });
  if (errs.length) console.log(`[${name}] ERRORS:`, errs.slice(0, 5));
  await ctx.close();
}
await shot(1440, 900, 'r-1440-initial');
await shot(880, 900, 'r-880-initial');
await shot(390, 844, 'r-390-initial');
await b.close();
