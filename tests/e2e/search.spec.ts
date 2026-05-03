import { test, expect } from '@playwright/test';

test('search: finds results for query', async ({ page }) => {
  await page.goto('/search');

  const input = page.locator('input[placeholder="Search posts..."]');
  await expect(input).toBeVisible({ timeout: 7000 });
  await input.fill('Hello');

  // wait for debounce and results
  await page.waitForTimeout(600);
  const result = page.locator('h2', { hasText: /Hello World/i }).first();
  await expect(result).toBeVisible({ timeout: 7000 });
});
