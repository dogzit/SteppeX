import { chromium } from '@playwright/test';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 880, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
p.on('console', (m) => { if (m.type()==='error') console.log('[consoleerr]', m.text().slice(0,200)); });
await p.goto('http://localhost:4173/?site=artemis-cr&t=2026-11-20T12:00Z&nointro');
await p.waitForTimeout(1500);

async function step(label, fn) {
  console.log('START', label);
  const t0 = Date.now();
  try { await fn(); console.log('OK', label, Date.now()-t0, 'ms'); }
  catch (e) { console.log('FAIL', label, e.message.slice(0,200)); throw e; }
}

await step('open menu -> south pole', async () => {
  await p.getByRole('button', { name: 'More views: Globe' }).click();
  await p.getByRole('menuitem', { name: 'South pole' }).click();
  await p.getByRole('button', { name: 'More views: South pole' }).waitFor({ timeout: 5000 });
});
await step('open menu -> lander view', async () => {
  await p.getByRole('button', { name: 'More views: South pole' }).click();
  await p.getByRole('menuitem', { name: 'Lander view' }).click();
  await p.getByRole('button', { name: 'More views: Lander view' }).waitFor({ timeout: 5000 });
});
await step('open menu -> globe', async () => {
  await p.getByRole('button', { name: 'More views: Lander view' }).click();
  await p.getByRole('menuitem', { name: 'Globe' }).click();
  await p.getByRole('button', { name: 'More views: Globe' }).waitFor({ timeout: 5000 });
});
await step('click Sites', async () => {
  await p.getByRole('button', { name: 'Sites' }).click();
  await p.locator('aside[aria-label="Site library"]').waitFor({ timeout: 5000 });
});
await step('click Details', async () => {
  await p.getByRole('button', { name: 'Details' }).click();
  await p.locator('aside[aria-label="Power and communications dashboard"]').waitFor({ timeout: 5000 });
});
console.log('ALL DONE');
await b.close();
