import { test, expect } from '@playwright/test';

test('blog: the by-date index opens an older post, and /archive redirects here', async ({ page }) => {
  // /archive was folded into /blog and only survives as a permanent redirect
  await page.goto('/archive');
  await expect(page).toHaveURL(/\/blog$/);

  const index = page.locator('section', { hasText: 'All posts by date' }).first();
  const postLink = index.getByRole('link', { name: /Create a Dynamic Sitemap/i }).first();
  await expect(postLink).toBeVisible({ timeout: 7000 });
  await postLink.click();

  await expect(page).toHaveURL(/\/posts\/2020-10-24-dynamic-sitemap$/);
  const h1 = page.locator('h1').first();
  await expect(h1).toBeVisible({ timeout: 5000 });
});
