import { test, expect } from '@playwright/test';

test('navigation: open a post from the homepage', async ({ page }) => {
  await page.goto('/');
  // wait for main content to load
  await page.waitForSelector('main, h1, h2', { timeout: 7000 });

  // Click the newest post by its full title - the landing page always
  // surfaces it. Not just "Multi-Agent": the Selected work section can carry
  // a "multi-agent" tag of its own, and a loose substring match picks
  // whichever renders first.
  const link = page.getByRole('link', { name: /Pi Multi-Agent Teams/i }).first();
  await expect(link).toBeVisible({ timeout: 7000 });
  await link.click();

  // Post page contains H1 with the post title
  const heading = page.locator('h1', { hasText: /Pi Multi-Agent Teams/i }).first();
  await expect(heading).toBeVisible({ timeout: 7000 });
});

// Home used to be font-medium on every page, which read as an active-page
// marker that was wrong everywhere except the homepage.
test.describe('the nav marks the current section', () => {
  const cases: [string, string | null][] = [
    ['/', 'Home'],
    ['/blog', 'Writing'],
    // Archive is not in the header nav any more - it is a utility link in
    // the footer, not a section - so nothing lights up here.
    ['/archive', null],
    // A post lives under /posts but is what /blog lists, so Writing owns it.
    ['/posts/2026-06-08-pi-extensions', 'Writing'],
    ['/projects', 'Projects'],
    ['/projects/agentflows', 'Projects'],
    ['/about', 'About'],
    // A tag page mixes posts and projects, so neither link owns it.
    ['/tags/ai', null],
  ];

  for (const [path, expected] of cases) {
    test(`${path} marks ${expected ?? 'nothing'}`, async ({ page }) => {
      await page.goto(path);
      const current = page.locator('nav ul li a[aria-current="page"]');
      if (expected === null) {
        await expect(current).toHaveCount(0);
      } else {
        // Exactly one, or the marker means nothing.
        await expect(current).toHaveCount(1);
        await expect(current).toHaveText(expected);
      }
    });
  }
});
