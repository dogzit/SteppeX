import { test, expect, type Page } from '@playwright/test';

const SITE = 'artemis-cr'; // Artemis III · Connecting Ridge candidate — a real south-pole site
const T = '2026-11-20T12:00Z';

async function openPanel(page: Page) {
  await page.goto(`/?site=${SITE}&t=${T}&nointro`);
  await expect(page.getByRole('heading', { name: 'LUNAR NAVIGATOR' })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1440) < 1280) {
    await page.getByRole('button', { name: 'Details', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Find a window' }).click();
}

test.describe.configure({ mode: 'serial' });

test('default flow: open panel, see 3 opportunities, click one, highlight + lander view', async ({ page, context }) => {
  await openPanel(page);
  await expect(page.getByLabel('Required continuous sunlight, hours')).toHaveValue('48');
  await expect(page.getByLabel('Required continuous Earth visibility, hours')).toHaveValue('2');

  const rows = page.locator('section[aria-label="Find a window"] li');
  await expect(rows).toHaveCount(3);
  await page.screenshot({ path: 'docs/screens/11-find-window.png' });

  // Click the second opportunity (a real "later start" case: the earth window sits at the tail of the
  // 48h mission, not at its start) and confirm the timeline highlights exactly that window and the lander
  // view opens at its start.
  const second = rows.nth(1);
  const selectButton = second.getByRole('button').first();
  const startText = (await selectButton.innerText()).split(' → ')[0]; // e.g. "2026-12-13 09:21Z"
  const startPrefix = startText.replace('Z', ''); // matches the Hud's mission-time readout format
  await selectButton.click();
  await expect(page.getByRole('button', { name: 'Lander view', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('header')).toContainText(startPrefix);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'docs/screens/12-find-window-selected.png' });
  const svgLabel = await page.locator('svg[role="img"]').getAttribute('aria-label');
  expect(svgLabel).toContain('Highlighted mission window');

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test('copy link reopens the same site, search settings and selected window in a fresh page', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openPanel(page);
  const rows = page.locator('section[aria-label="Find a window"] li');
  await expect(rows).toHaveCount(3);
  const target = rows.nth(1);
  // Capture the exact mission window being shared before the click moves the mission clock to its start
  // (selecting a result re-anchors the search to its own time, same as clicking a DTE window elsewhere in
  // the app — the *highlighted* window must still reopen exactly, independent of how the live list reorders).
  const originalRange = (await target.getByRole('button').first().innerText()).trim(); // "2026-12-13 09:21Z → 2026-12-15 09:21Z UTC"
  const [originalStart, originalEnd] = originalRange.replace(' UTC', '').split(' → ');
  await target.getByRole('button', { name: 'Copy link' }).click();
  await page.waitForTimeout(300);
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('site=artemis-cr');
  expect(link).toContain('fwstart=');
  expect(link).toContain('fwend=');
  expect(link).not.toContain('fwsun='); // default 48h is omitted — existing link shape preserved
  expect(link).not.toContain('fwearth='); // default 2h is omitted

  const fresh = await context.newPage();
  await fresh.goto(link + '&nointro'); // skip the boot animation; nointro is a test convenience, not part of the copied link
  await expect(fresh.getByRole('heading', { name: 'LUNAR NAVIGATOR' })).toBeVisible();
  await expect(fresh.getByRole('button', { name: 'Lander view', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // A link carrying a selected window auto-opens the panel — no extra click needed to see the result.
  await expect(fresh.getByLabel('Required continuous sunlight, hours')).toHaveValue('48');
  await expect(fresh.getByLabel('Required continuous Earth visibility, hours')).toHaveValue('2');
  const freshRows = fresh.locator('section[aria-label="Find a window"] li');
  await expect(freshRows).toHaveCount(3);
  // The authoritative check: the *exact* shared window reopens, shown as the timeline highlight —
  // independent of where it now falls in the live (re-anchored) opportunity list.
  const svgLabel = (await fresh.locator('svg[role="img"]').getAttribute('aria-label')) ?? '';
  expect(svgLabel).toContain(originalStart);
  expect(svgLabel).toContain(originalEnd);
  await fresh.waitForTimeout(1200);
  await fresh.screenshot({ path: 'docs/screens/13-find-window-reopened.png' });
  await fresh.close();
});

test('empty search explains which requirement failed with measured values', async ({ page }) => {
  await openPanel(page);
  await page.getByLabel('Required continuous sunlight, hours').fill('100000');
  await page.waitForTimeout(600);
  await expect(page.getByText(/Longest continuous sunlight in the next 90 days was/)).toBeVisible();
  await page.screenshot({ path: 'docs/screens/14-find-window-empty.png' });
});

test('add to calendar downloads a UTC .ics event for the selected window', async ({ page }) => {
  await openPanel(page);
  const rows = page.locator('section[aria-label="Find a window"] li');
  const [download] = await Promise.all([page.waitForEvent('download'), rows.first().getByRole('button', { name: 'Add to calendar' }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
  const path = await download.path();
  const fs = await import('node:fs');
  const body = fs.readFileSync(path!, 'utf8');
  expect(body).toContain('BEGIN:VEVENT');
  expect(body).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  expect(body).toMatch(/DTEND:\d{8}T\d{6}Z/);
});

test('mobile layout: the finder is reachable and usable at a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openPanel(page);
  await expect(page.getByLabel('Required continuous sunlight, hours')).toBeVisible();
  await expect(page.getByLabel('Required continuous Earth visibility, hours')).toBeVisible();
  await page.getByLabel('Required continuous sunlight, hours').fill('36');
  await page.waitForTimeout(600);
  const rows = page.locator('section[aria-label="Find a window"] li');
  await expect(rows.first()).toBeVisible();
  await page.screenshot({ path: 'docs/screens/15-find-window-mobile.png' });
  expect(errors).toEqual([]);
});
