import { expect, test } from '@playwright/test';
const start = '/?site=artemis-pns&t=2026-11-14T09:04Z&margin=0&nointro';
for (const width of [390, 1440]) test(`judging layout ${width}: dismissible panels, correct coordinates and a clear horizon`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(start);
  await expect(page.locator('aside')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sites', exact: true }).click();
  await expect(page.getByLabel('Custom latitude')).toHaveValue('-89.017');
  await expect(page.getByLabel('Custom longitude')).toHaveValue('126.273');
  await page.getByRole('button', { name: /Close site (library|list)/ }).click();
  if (width < 640) await page.getByRole('button', { name: /Open (controls|menu)/ }).click();
  const view = page.getByRole('button', { name: /(?:More views|View): Globe/ });
  if (await view.isVisible()) {
    await view.click(); await page.getByRole('menuitem', { name: 'Lander view' }).click();
  } else await page.getByRole('button', { name: 'Lander view', exact: true }).click();
  if (width < 640) await page.getByRole('button', { name: /Close (controls|menu)/ }).click();
  const toolbar = page.getByRole('group', { name: 'Look direction' });
  await expect(toolbar).toBeVisible();
  await page.getByRole('button', { name: 'Sites', exact: true }).click();
  await expect(toolbar).toBeHidden();
  await page.getByRole('button', { name: /Close site (library|list)/ }).click();
  await expect(toolbar).toBeVisible();
  const box = await toolbar.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  await page.screenshot({ path: `test-results/judging-${width}.png` });
});

test('Simple and Expert share the same site and date, with distinct levels of detail', async ({ page }) => {
  await page.goto(start);
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  const time = await page.getByLabel('Set date and time (UTC)').inputValue();
  const summary = await page.getByLabel('Site summary').innerText();
  await expect(page.getByRole('region', { name: 'Essential results' })).toBeVisible();
  await expect(page.getByLabel('Battery lasts in hours')).toBeHidden();
  await page.getByRole('button', { name: 'Expert', exact: true }).click();
  await expect(page.getByLabel('Battery lasts in hours')).toBeVisible();
  await expect(page.getByLabel('Site summary')).toHaveText(summary);
  await expect(page.getByLabel('Set date and time (UTC)')).toHaveValue(time);
  await page.getByRole('button', { name: 'Simple', exact: true }).click();
  await expect(page.getByLabel('Battery lasts in hours')).toBeHidden();
  await expect(page.getByLabel('Site summary')).toHaveText(summary);
});

test('glossary is keyboard and touch friendly, with focus returned to Help', async ({ page }) => {
  await page.goto(start);
  const help = page.getByRole('button', { name: 'Help', exact: true });
  await help.click();
  await expect(page.getByRole('button', { name: 'Close help' })).toBeFocused();
  await page.getByText('Earth clearance', { exact: true }).click();
  await expect(page.getByText(/The default is 5 degrees/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(help).toBeFocused();
});

test('empty searches and invalid coordinates explain a next step', async ({ page }) => {
  await page.goto(start);
  await page.getByRole('button', { name: 'Sites', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search sites', exact: true }).fill('not-a-real-site');
  await expect(page.getByRole('status')).toContainText('Try a shorter name');
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByLabel('Custom latitude').fill('999');
  await page.getByRole('button', { name: 'Add pin', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enter a latitude from');
});
