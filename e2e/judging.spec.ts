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
