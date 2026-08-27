import { test, expect } from '@playwright/test';

// The old pages-router site served posts at /blog/<slug> and used different
// slugs. Every one of these 404'd in production before next.config named it.
const OLD_TO_NEW: Array<[string, string]> = [
  ['/blog/create-simple-blog-nextjs-markdown', '/posts/2020-10-22-nextjs-markdown-blog'],
  ['/blog/create-dynamic-sitemap-nextjs', '/posts/2020-10-24-dynamic-sitemap'],
  ['/blog/top-5-nextjs-10-new-features', '/posts/2020-11-02-top-nextjs10-features'],
  ['/blog/recommended-management-books', '/posts/2021-03-27-management-books'],
  ['/blog/how-to-build-bench-power-supply-from-atx-part1', '/posts/2021-06-08-power-supply-1'],
];

for (const [oldPath, newPath] of OLD_TO_NEW) {
  test(`redirects: ${oldPath} lands on ${newPath}`, async ({ page }) => {
    const res = await page.goto(oldPath);
    expect(res?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(newPath);

    // The redirect is only useful if the destination actually renders
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 7000 });
  });
}

test('redirects: an unmatched /blog/<slug> falls back to the index', async ({ page }) => {
  await page.goto('/blog/this-slug-never-existed');
  expect(new URL(page.url()).pathname).toBe('/blog');
});

test('redirects: the two-segment old scaffolding paths fall back too', async ({ page }) => {
  await page.goto('/blog/pt/second-post');
  expect(new URL(page.url()).pathname).toBe('/blog');
});

// Regression guard for the catch-all: ":slug*" would also match /blog itself
// and redirect it to itself forever. It has to stay ":slug+".
test('redirects: /blog itself still renders and does not loop', async ({ page }) => {
  const res = await page.goto('/blog');
  expect(res?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe('/blog');
  await expect(page.locator('h1', { hasText: 'Writing' }).first()).toBeVisible();
});
