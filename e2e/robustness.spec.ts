import { test, expect } from '@playwright/test';

const T = '2026-11-20T12:00Z';
const dismissHint = () => localStorage.setItem('ln-welcome-dismissed', '1');

test('without WebGL the app still explains the site', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (id: string, ...rest: unknown[]) {
      if (String(id).includes('webgl')) return null;
      return (orig as never as (...a: unknown[]) => unknown).call(this, id, ...rest);
    } as never;
    localStorage.setItem('ln-welcome-dismissed', '1');
  });
  await page.goto(`/?site=artemis-cr&t=${T}&nointro`);
  await expect(page.getByText('The 3D view could not open')).toBeVisible();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(page.getByLabel('Site summary')).toContainText(/Sunlight|Dark/);
  await expect(page.getByText('Site score', { exact: true }).first()).toBeVisible();
});

test('reduced motion skips the boot animation and still renders the scene', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(dismissHint);
  await page.goto(`/?site=artemis-cr&t=${T}`); // no &nointro: the intro must opt itself out
  await expect(page.getByText('Skip introduction')).toHaveCount(0);
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(page.getByLabel('Site summary')).toBeVisible();
});

test('a shared link restores site, date, audience mode and the comparison', async ({ page }) => {
  await page.addInitScript(dismissHint);
  await page.goto(`/?site=artemis-cr&t=${T}&nointro`);
  await page.getByRole('button', { name: 'Expert', exact: true }).click();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.getByRole('button', { name: 'Compare nearby sites' }).click();
  await page.getByRole('slider', { name: 'Move all dates by this many days' }).fill('7');
  await page.waitForTimeout(900); // the URL is written on a 400 ms debounce
  const cards = await page.getByRole('article').count();
  expect(cards).toBe(4);
  const url = page.url();
  expect(url).toContain('cmp=');
  expect(url).toContain('slip=7');

  await page.goto(url);
  await expect(page.getByLabel('Set date and time (UTC)')).toHaveValue('2026-11-20T12:00');
  await expect(page.getByRole('dialog', { name: 'Compare sites and dates' })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Move all dates by this many days' })).toHaveValue('7');
  await expect(page.getByRole('article')).toHaveCount(cards);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(page.getByLabel('Battery lasts in hours')).toBeVisible(); // Expert mode survived
});

test('a link without a comparison keeps its original shape', async ({ page }) => {
  await page.addInitScript(dismissHint);
  await page.goto(`/?site=artemis-cr&t=${T}&nointro`);
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.waitForTimeout(900);
  expect(page.url()).not.toContain('cmp=');
  expect(page.url()).not.toContain('slip=');
});

test('a custom pin can be dropped and taken back off', async ({ page }) => {
  await page.addInitScript(dismissHint);
  await page.goto(`/?site=apollo11&t=${T}&nointro`);
  await page.waitForTimeout(3500);
  await page.mouse.click(820, 400);
  const details = page.locator('aside[aria-label="Site details"]');
  await expect(details.getByText('Custom site')).toBeVisible();
  await page.waitForTimeout(700); // the URL is written on a 400 ms debounce
  expect(page.url()).toContain('lat=');

  await details.getByRole('button', { name: 'Remove pin' }).click();
  await expect(details.getByText('Custom site')).toHaveCount(0);
  await page.waitForTimeout(700);
  expect(page.url()).toContain('site=apollo11'); // back to where the viewer was before pinning
  expect(page.url()).not.toContain('lat=');
  // A library site has nothing to remove.
  await expect(details.getByRole('button', { name: 'Remove pin' })).toHaveCount(0);
});
