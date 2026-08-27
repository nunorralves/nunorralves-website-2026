import { test, expect } from '@playwright/test';

// The nav used to be a single inline row at every width. At 375px it needed
// 619px, so every page on the site scrolled sideways - the bar was the only
// thing causing it. These guard the two halves of the fix: the page fits, and
// the links are still reachable once they stop being visible.

const MOBILE = { width: 375, height: 812 };
const DESKTOP = { width: 1280, height: 900 };

const PAGES = ['/', '/blog', '/projects', '/about', '/search'];

test.describe('mobile layout', () => {
  test.use({ viewport: MOBILE });

  for (const path of PAGES) {
    test(`no horizontal scroll on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForSelector('nav');

      const { doc, viewport } = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));

      // A pixel of slack: sub-pixel widths from the fractional column round up.
      expect(doc).toBeLessThanOrEqual(viewport + 1);
    });
  }

  test('a long inline code token wraps instead of widening the page', async ({
    page,
  }) => {
    // This post has `console.log(JSON.stringify(ctx.getContextUsage()))` in a
    // paragraph. Block code has overflow-x to fall back on; inline code has
    // nothing, so it pushed the document out on its own.
    await page.goto('/posts/2026-06-11-pi-custom-footer-tui');
    await page.waitForSelector('article');

    const { doc, viewport } = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(doc).toBeLessThanOrEqual(viewport + 1);
  });

  test('the menu opens, navigates, and closes behind itself', async ({
    page,
  }) => {
    await page.goto('/');
    const toggle = page.locator('button[aria-controls="mobile-menu"]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#mobile-menu')).toHaveCount(0);

    await toggle.click();
    const menu = page.locator('#mobile-menu');
    await expect(menu).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.locator('a')).toHaveText([
      'Home',
      'Writing',
      'Projects',
      'About',
    ]);

    // The panel overlays the page, so it has to be opaque and inside the
    // viewport rather than hanging off the right edge.
    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(MOBILE.width + 1);

    await menu.locator('a[href="/projects"]').click();
    await expect(page).toHaveURL(/\/projects$/);
    // Left open, it would cover the page it just navigated to.
    await expect(page.locator('#mobile-menu')).toHaveCount(0);
  });

  test('search and the theme toggle stay on the bar', async ({ page }) => {
    await page.goto('/');
    // Both are one tap and neither is worth burying behind the hamburger.
    await expect(page.locator('nav a[href="/search"]')).toBeVisible();
    await expect(page.locator('#theme-toggle')).toBeVisible();
  });
});

test.describe('desktop layout', () => {
  test.use({ viewport: DESKTOP });

  test('the links are inline and the hamburger is gone', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('button[aria-controls="mobile-menu"]'),
    ).toBeHidden();
    await expect(page.locator('nav ul li a')).toHaveText([
      'Home',
      'Writing',
      'Projects',
      'About',
    ]);
  });
});
