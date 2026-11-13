import { test, expect } from '@playwright/test';
test.describe.configure({ mode: 'serial' });
test('globe renders and south pole view', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('NAVIGATOR')).toBeVisible();
  await page.waitForTimeout(4500);
  await page.screenshot({ path: 'docs/screens/01-globe.png' });
  await page.getByRole('button', { name: 'South pole', exact: true }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'docs/screens/02-polar.png' });
  await page.getByRole('button', { name: 'Grid' }).click();
  await page.getByRole('button', { name: /Chandrayaan-3/ }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'docs/screens/03-site.png' });
  // click-to-drop a custom pin near the centre of the globe
  await page.mouse.click(760, 420);
  await page.waitForTimeout(1500);
  await expect(page.getByText('Custom site')).toBeVisible();
  const labels = await page.locator('.pin-label').count();
  expect(labels).toBeGreaterThan(0);
});
