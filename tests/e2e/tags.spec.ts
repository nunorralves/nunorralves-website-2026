import { test, expect } from '@playwright/test';

test('tags: clicking a tag shows matching posts', async ({ page }) => {
  await page.goto('/tags');

  // Find a tag link (javascript should exist)
  const tagLink = page.getByRole('link', { name: /javascript/i }).first();
  await expect(tagLink).toBeVisible({ timeout: 5000 });
  await tagLink.click();

  // On tag page, the count badge should be > 0 and posts visible
  const countBadge = page.locator('span', { hasText: /\d+/ }).first();
  await expect(countBadge).toContainText(/\d/);

  const postCard = page.locator('h2').first();
  await expect(postCard).toBeVisible({ timeout: 5000 });
});
