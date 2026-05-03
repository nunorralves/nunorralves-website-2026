import { test, expect } from '@playwright/test';

test('pagination: navigate to next page', async ({ page }) => {
  await page.goto('/');
  // wait for page content
  await page.waitForSelector('main, .card, h1, h2', { timeout: 7000 });

  // Ensure pagination exists (may be absent on small datasets)
  const pageInfo = page.locator('text=Page').first();
  if (await pageInfo.count() === 0) {
    test.skip(true, 'No pagination present for small dataset');
    return;
  }

  // Click Next if present
  const next = page.getByRole('link', { name: /Next/i });
  if (await next.count() > 0) {
    await next.first().click();
    // Confirm page indicator changed to page 2
    await expect(page.locator('text=Page 2 of')).toBeVisible({ timeout: 5000 });
  } else {
    test.skip(true, 'No next page available');
  }
});
