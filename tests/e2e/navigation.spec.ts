import { test, expect } from '@playwright/test';

test('navigation: open a post from the homepage', async ({ page }) => {
  await page.goto('/');
  // wait for main content to load
  await page.waitForSelector('main, h1, h2', { timeout: 7000 });

  // Try to click a post link by title (Hello World exists in content)
  const link = page.locator('text=Hello World').first();
  await expect(link).toBeVisible({ timeout: 7000 });
  await link.click();

  // Post page contains H1 with the post title (match the first H1 with text)
  const heading = page.locator('h1', { hasText: /Hello World/i }).first();
  await expect(heading).toBeVisible({ timeout: 5000 });
});
