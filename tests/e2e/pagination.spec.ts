import { test, expect } from '@playwright/test';

test('pagination: navigate to next page', async ({ page }) => {
  // The paginated feed moved off the home page and onto /blog
  await page.goto('/blog');
  await page.waitForSelector('main, .card, h1, h2', { timeout: 7000 });

  // Ensure pagination exists (may be absent on small datasets)
  const pageInfo = page.locator('text=Page').first();
  if (await pageInfo.count() === 0) {
    test.skip(true, 'No pagination present for small dataset');
    return;
  }

  // Exact match: /blog also carries a "nextjs" tag pill, which a loose
  // /Next/i would match first
  const next = page.getByRole('link', { name: 'Next', exact: true });
  if (await next.count() > 0) {
    await next.first().click();
    // Pagination must stay on /blog rather than falling back to the home page
    await expect(page).toHaveURL(/\/blog\?page=2$/);
    await expect(page.locator('text=Page 2 of')).toBeVisible({ timeout: 5000 });
  } else {
    test.skip(true, 'No next page available');
  }
});
