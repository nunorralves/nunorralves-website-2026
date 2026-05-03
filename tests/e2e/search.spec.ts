import { test, expect } from '@playwright/test';

test('search: finds results for query', async ({ page }) => {
  await page.goto('/search');

  const input = page.locator('input[placeholder="Search posts..."]');
  await expect(input).toBeVisible();
  await input.fill('Hello');

  // results are rendered as post card titles
  const result = page.locator('h2', { hasText: /Hello World/i }).first();
  await expect(result).toBeVisible({ timeout: 5000 });
});
