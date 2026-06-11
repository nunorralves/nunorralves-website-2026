import { test, expect } from '@playwright/test';

test('post metadata: description meta exists', async ({ page }) => {
  await page.goto('/posts/2026-05-18-pi-coding-agent');

  // Wait for H1 to ensure page rendered
  const h1 = page.locator('h1').first();
  await expect(h1).toHaveText(/Terminal Coding Agent/i, { timeout: 7000 });

  const desc = page.locator('meta[name="description"]');
  await expect(desc).toHaveCount(1);
  const content = await desc.first().getAttribute('content');
  expect(content && content.length).toBeGreaterThan(10);
});
