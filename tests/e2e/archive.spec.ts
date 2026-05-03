import { test, expect } from '@playwright/test';

test('archive: open a post from archive', async ({ page }) => {
  await page.goto('/archive');

  const postLink = page.getByRole('link').filter({ hasText: /How To Create a Simple Blog/i }).first();
  if (await postLink.count() === 0) {
    // Fallback: pick first post link
    const first = page.getByRole('link').nth(0);
    await expect(first).toBeVisible({ timeout: 5000 });
    await first.click();
  } else {
    await postLink.click();
  }

  // Post page should have an H1
  const h1 = page.locator('h1').first();
  await expect(h1).toBeVisible({ timeout: 5000 });
});
