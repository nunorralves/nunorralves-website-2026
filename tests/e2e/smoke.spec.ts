import { test, expect } from '@playwright/test';

test('smoke: homepage loads and title is present', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/nunorralves.pt/i);
  await expect(page.getByRole('banner')).toBeVisible();
});
