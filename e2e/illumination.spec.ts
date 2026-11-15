import { test, expect } from '@playwright/test';

const start = '/?site=artemis-cr&t=2026-11-20T12:00Z&view=polar&nointro';
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('ln-welcome-dismissed', '1')); });

test('the sunlight map draws over the pole and explains its scale', async ({ page }) => {
  await page.goto(start);
  await expect(page.getByRole('region', { name: 'South pole terrain map' })).toBeVisible();
  // Nothing extra is fetched until it is asked for.
  await expect(page.locator('.polar-heat')).toHaveCount(0);

  await page.getByRole('button', { name: 'Sunlight map' }).click();
  await expect(page.locator('.polar-heat')).toBeVisible();
  await expect(page.getByText(/Share of 20\d\d in sunlight/)).toBeVisible();
  await expect(page.getByRole('img', { name: /Colour scale from dark/ })).toBeVisible();
  await expect(page.getByText(/km cells/)).toBeVisible();
  // Still a projected map, not a 3D canvas.
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.screenshot({ path: 'docs/screens/16-sunlight-map.png' });

  // The period switch names the month it is showing.
  await page.getByRole('button', { name: 'This month' }).click();
  await expect(page.getByText(/Share of November 20\d\d in sunlight/)).toBeVisible();
  await page.getByRole('button', { name: 'Whole year' }).click();
  await expect(page.getByText(/Share of 20\d\d in sunlight/)).toBeVisible();

  await page.getByRole('button', { name: 'Sunlight map' }).click();
  await expect(page.locator('.polar-heat')).toHaveCount(0);
});

test('the peak list ranks places and opening one pins it', async ({ page }) => {
  await page.goto(start);
  await page.getByRole('button', { name: 'Best lit places' }).click();
  const panel = page.getByRole('region', { name: 'Best lit places' });
  await expect(panel).toBeVisible();
  const rows = panel.locator('tbody tr');
  await expect(rows).not.toHaveCount(0);

  // Ranked by share of sunlight, brightest first.
  const pcts = await rows.locator('td:nth-child(2)').allInnerTexts();
  const nums = pcts.map((t) => Number(t.replace('%', '')));
  expect(nums.length).toBeGreaterThan(2);
  for (let i = 1; i < nums.length; i++) expect(nums[i]).toBeLessThanOrEqual(nums[i - 1]);
  expect(nums[0]).toBeGreaterThan(50);
  await page.screenshot({ path: 'docs/screens/17-peaks.png' });

  // Opening one drops a pin there and shows its details.
  const first = rows.first().locator('button');
  const label = await first.innerText();
  await first.click();
  const details = page.locator('aside[aria-label="Site details"]');
  await expect(details.getByText('Custom site')).toBeVisible();
  await page.waitForTimeout(700);
  expect(page.url()).toContain('lat=');
  // The pin lands on the ranked coordinates.
  const lat = Number(new URL(page.url()).searchParams.get('lat'));
  expect(Math.abs(lat)).toBeGreaterThan(84);
  expect(label).toContain(Math.abs(lat).toFixed(3));
});

test('the sunlight map stays off the cold-load path', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => { if (r.url().includes('polar-illumination')) asked.push(r.url()); });
  await page.goto('/?site=artemis-cr&t=2026-11-20T12:00Z&nointro');
  await page.waitForTimeout(3500);
  expect(asked, 'the grid must not load until someone opens it').toHaveLength(0);
});

// The map's buttons used to sit under the disc at phone width, and under the two-row header at 640-853 px.
// Playwright refuses to click an element that something else covers, so each click here checks that.
for (const [width, height] of [[390, 844], [720, 900]]) test(`${width} px: the sunlight map buttons can be tapped`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  await page.goto(start);
  await page.getByRole('button', { name: 'Sunlight map' }).click();
  await expect(page.locator('.polar-heat')).toBeVisible();
  await page.getByRole('button', { name: 'This month' }).click();
  await expect(page.getByText(/Share of November 20\d\d in sunlight/)).toBeVisible();
  await page.getByRole('button', { name: 'Best lit places' }).click();
  await expect(page.getByRole('region', { name: 'Best lit places' })).toBeVisible();
});
