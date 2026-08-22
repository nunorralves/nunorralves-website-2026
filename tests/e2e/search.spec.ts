import { test, expect } from '@playwright/test';

test('search: finds results for query', async ({ page }) => {
  await page.goto('/search');

  const input = page.locator('input[placeholder="Search posts and projects..."]');
  await expect(input).toBeVisible({ timeout: 7000 });
  await input.fill('Terminal');

  // wait for debounce and results
  await page.waitForTimeout(600);
  const result = page.locator('h2', { hasText: /Terminal Coding Agent/i }).first();
  await expect(result).toBeVisible({ timeout: 7000 });
});

test('search: does not return fuzzy false positives for a body word', async ({ page }) => {
  await page.goto('/search');

  const input = page.locator('input[placeholder="Search posts and projects..."]');
  await expect(input).toBeVisible({ timeout: 7000 });
  await input.fill('books');

  // "books" only appears in the management books post - fuzzy matching over the
  // post bodies used to also pull in "hooks"/"block"/"boots" style near-misses.
  await expect(page.getByText(/^Found 1 result$/)).toBeVisible({ timeout: 7000 });
  await expect(
    page.locator('h2', { hasText: /Management Books/i }),
  ).toBeVisible();
});
