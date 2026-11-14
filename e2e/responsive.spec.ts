import { test, expect } from '@playwright/test';

const T = '2026-11-20T12:00Z';
const url = (extra = '') => `/?site=artemis-cr&t=${T}&nointro${extra}`;

test.describe('880px: drawers, globe usability, More views menu', () => {
  test.use({ viewport: { width: 880, height: 900 } });

  test('globe starts exposed; place a pin, inspect it, dismiss, place another — time never changes', async ({ page }) => {
    await page.goto(url());
    await expect(page.getByRole('heading', { name: 'LUNAR NAVIGATOR' })).toBeVisible();
    // Globe exposed by default: no drawers mounted yet.
    await expect(page.locator('aside[aria-label="Site library"]')).toHaveCount(0);
    await expect(page.locator('aside[aria-label="Power and communications dashboard"]')).toHaveCount(0);
    await page.screenshot({ path: 'docs/screens/r-880-initial.png' });
    const missionTime = () => page.locator('header div.num.text-lg').innerText();
    const t0 = await missionTime();

    // Open the Sites drawer, place a pin via the custom lat/lon form.
    await page.getByRole('button', { name: 'Sites' }).click();
    const siteDrawer = page.locator('aside[aria-label="Site library"]');
    await expect(siteDrawer).toBeVisible();
    await siteDrawer.getByLabel('Custom latitude').fill('-80');
    await siteDrawer.getByLabel('Custom longitude').fill('45');
    await siteDrawer.getByRole('button', { name: 'Pin' }).click();

    // Placing it auto-opens details and closes the site drawer (mutually exclusive at this width).
    const details = page.locator('aside[aria-label="Power and communications dashboard"]');
    await expect(details).toBeVisible();
    await expect(siteDrawer).toHaveCount(0);
    await expect(details.getByText('Custom site')).toBeVisible();
    expect(await missionTime()).toBe(t0); // selecting/placing a pin must not move the mission clock

    // Dismiss the details drawer — back to a clear globe.
    await details.getByRole('button', { name: 'Close site details' }).click();
    await expect(details).toHaveCount(0);
    expect(await missionTime()).toBe(t0);

    // Place another pin directly on the globe (no need to reopen the Sites drawer at all).
    await page.locator('canvas').click({ position: { x: 300, y: 260 } });
    await expect(details).toBeVisible();
    await expect(details.getByText('Custom site')).toBeVisible();
    expect(await missionTime()).toBe(t0); // still unchanged after a second pin placement
    await page.screenshot({ path: 'docs/screens/r-880-pin-flow.png' });
  });

  test('"More views" opens every view; opening one drawer closes the other', async ({ page }) => {
    await page.goto(url());
    await expect(page.getByRole('button', { name: 'More views: Globe' })).toBeVisible();

    await page.getByRole('button', { name: 'More views: Globe' }).click();
    await page.getByRole('menuitem', { name: 'South pole' }).click();
    await expect(page.getByRole('button', { name: 'More views: South pole' })).toBeVisible();

    await page.getByRole('button', { name: 'More views: South pole' }).click();
    await page.getByRole('menuitem', { name: 'Lander view' }).click();
    await expect(page.getByRole('button', { name: 'More views: Lander view' })).toBeVisible();

    await page.getByRole('button', { name: 'More views: Lander view' }).click();
    await page.getByRole('menuitem', { name: 'Globe' }).click();
    await expect(page.getByRole('button', { name: 'More views: Globe' })).toBeVisible();

    // Mutual exclusivity: opening Details while Sites is open closes Sites.
    await page.getByRole('button', { name: 'Sites' }).click();
    await expect(page.locator('aside[aria-label="Site library"]')).toBeVisible();
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(page.locator('aside[aria-label="Site library"]')).toHaveCount(0);
    await expect(page.locator('aside[aria-label="Power and communications dashboard"]')).toBeVisible();
  });

  test('view menu supports sequential keyboard navigation and Space selection without starting playback', async ({ page }) => {
    await page.goto(url());
    const trigger = page.getByRole('button', { name: 'More views: Globe' });
    await trigger.focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('menuitem', { name: 'Globe', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'South pole' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Lander view' })).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'More views: South pole' })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'More views: South pole' })).toBeFocused();
  });

  test('timeline heading text never overlaps the bars, even when it wraps', async ({ page }) => {
    await page.goto(url());
    const heading = page.locator('footer div.flex.flex-wrap.items-baseline');
    const svg = page.locator('footer svg[role="img"]');
    await expect(heading).toBeVisible();
    const hBox = await heading.boundingBox(), sBox = await svg.boundingBox();
    expect(hBox).not.toBeNull();
    expect(sBox).not.toBeNull();
    expect(hBox!.y + hBox!.height).toBeLessThanOrEqual(sBox!.y + 0.5); // heading fully clears the chart
    await page.screenshot({ path: 'docs/screens/r-880-timeline-heading.png' });
  });
});

test.describe('mission window / timeline labels follow their own inputs', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('changing the mission window duration updates its derived heading and date range', async ({ page }) => {
    await page.goto(url());
    const heading = page.locator('section[aria-label="Mission viability score"] .label').first();
    await expect(heading).toHaveText('Mission window · 14 days · 2026-11-20 → 2026-12-04');
    await page.getByLabel('Window · days').fill('7');
    await page.waitForTimeout(400);
    await expect(heading).toHaveText('Mission window · 7 days · 2026-11-20 → 2026-11-27');
  });

  test('scrubbing across a sunset flips the live badge, independently of the longest-darkness figure', async ({ page }) => {
    await page.goto(url());
    // Wait for the real LOLA terrain horizon to load (it briefly falls back to a flat-sphere horizon
    // first), so the sunset figure we read next is the settled, terrain-aware one, not a transient.
    await expect(page.getByText(/Horizon: LOLA DEM/)).toBeVisible();
    const badge = page.locator('section[aria-label="Mission viability score"] .inline-flex');
    await expect(badge).toContainText('Sunlit now');
    const before = await badge.innerText(); // "☀ Sunlit now · sunset in 5d 10h 41m"
    const m = before.match(/sunset in (\d+)d (\d+)h (\d+)m/);
    expect(m).not.toBeNull();
    const [d, h, min] = [Number(m![1]), Number(m![2]), Number(m![3])];
    const sunsetInMs = (d * 86400 + h * 3600 + min * 60) * 1000;
    const past = new Date(Date.parse(T) + sunsetInMs + 3600_000); // 1h after the reported sunset
    await page.getByLabel('Set date and time (UTC)').fill(past.toISOString().slice(0, 16));
    await page.waitForTimeout(500);
    await expect(badge).toContainText('Dark now');
    await expect(badge).toContainText('sunrise in');

    // "Time to next transition" (the badge) and "longest continuous darkness" (the metric tile below) are
    // different questions answered by different code — confirm they report different numbers, not one
    // approximating the other.
    const toSunrise = (await badge.innerText()).match(/sunrise in ([\w\s]+)$/)![1];
    const tile = await page.getByText('Longest continuous sun', { exact: true }).locator('xpath=..').innerText();
    const longestDark = tile.match(/longest dark ([\w\s]+)$/)?.[1] ?? '';
    expect(longestDark).not.toBe('');
    expect(toSunrise.trim()).not.toBe(longestDark.trim());
  });
});

test.describe('share URL reopen', () => {
  test('a URL with a custom pin and a specific time reopens the same site and time', async ({ page, context }) => {
    await page.goto(url('&lat=-72.5000&lon=10.0000'));
    await expect(page.getByText('Custom site')).toBeVisible();
    const missionTime = await page.locator('header div.num.text-lg').innerText();
    const shareUrl = page.url();

    const fresh = await context.newPage();
    await fresh.goto(shareUrl);
    await expect(fresh.getByText('Custom site')).toBeVisible();
    await expect(fresh.locator('header div.num.text-lg')).toHaveText(missionTime);
    await expect(fresh.locator('aside[aria-label="Power and communications dashboard"]')).toContainText('72.500°S');
    await fresh.close();
  });
});

test.describe('1440 and 390 sanity', () => {
  test('1440px keeps the original always-visible desktop layout (no drawer toggles)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url());
    await expect(page.locator('aside[aria-label="Site library"]')).toBeVisible();
    await expect(page.locator('aside[aria-label="Power and communications dashboard"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sites' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /More views/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Globe', exact: true })).toBeVisible();
    await page.screenshot({ path: 'docs/screens/r-1440-initial.png' });
  });

  test('390px: drawers are reachable and the page has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url());
    await page.screenshot({ path: 'docs/screens/r-390-initial.png' });
    await page.getByRole('button', { name: 'Sites' }).click();
    await expect(page.locator('aside[aria-label="Site library"]')).toBeVisible();
    for (const target of ['header', 'footer', 'aside[aria-label="Site library"]']) {
      const box = await page.locator(target).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    await page.getByRole('button', { name: 'Timeline ↑' }).click();
    const chart = await page.locator('footer svg').boundingBox();
    expect(chart!.width).toBeGreaterThan(200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: 'docs/screens/r-390-sites-drawer.png' });
  });
});

for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
  test(`phone ${viewport.width}: controls leave the scene exposed and expand on demand`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(url());
    const header = await page.locator('header').boundingBox();
    const footer = await page.locator('footer').boundingBox();
    expect(header!.height).toBeLessThan(76);
    expect(footer!.height).toBeLessThan(76);
    expect(footer!.y - (header!.y + header!.height)).toBeGreaterThan(viewport.height * 0.75);
    await expect(page.getByLabel('Set date and time (UTC)')).toBeHidden();
    await expect(page.locator('footer svg')).toHaveCount(0);
    await page.getByRole('button', { name: 'Open controls' }).click();
    await expect(page.getByLabel('Set date and time (UTC)')).toBeVisible();
    await page.getByRole('button', { name: 'Close controls' }).click();
    await page.getByRole('button', { name: 'Timeline ↑' }).click();
    await expect(page.locator('footer svg')).toBeVisible();
    await page.getByRole('button', { name: 'Close timeline' }).click();
    await expect(page.locator('footer svg')).toHaveCount(0);
    await page.getByRole('button', { name: 'Details', exact: true }).click();
    const sheet = page.getByRole('complementary', { name: 'Power and communications dashboard' });
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    expect(box!.height).toBeLessThanOrEqual(viewport.height * 0.56);
    await sheet.getByRole('button', { name: 'Close site details' }).click();
    await expect(sheet).toHaveCount(0);
    await page.screenshot({ path: `docs/screens/phone-${viewport.width}-clear.png` });
  });
}
