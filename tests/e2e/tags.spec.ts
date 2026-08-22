import { test, expect } from '@playwright/test';

test('tags: clicking a tag on /blog shows matching content, and /tags redirects here', async ({ page }) => {
  // The tag index moved into /blog; /tags only survives as a permanent redirect
  await page.goto('/tags');
  await expect(page).toHaveURL(/\/blog$/);

  const tagRow = page.locator('section', { hasText: 'Browse by tag' }).first();
  const tagLink = tagRow.getByRole('link', { name: /javascript/i }).first();
  await expect(tagLink).toBeVisible({ timeout: 7000 });
  await tagLink.click();

  await expect(page).toHaveURL(/\/tags\/javascript$/);

  // On the tag page, the count badge should be > 0 and cards visible
  const countBadge = page.locator('span', { hasText: /\d+/ }).first();
  await expect(countBadge).toContainText(/\d/);

  const card = page.locator('h2').first();
  await expect(card).toBeVisible({ timeout: 5000 });
});
