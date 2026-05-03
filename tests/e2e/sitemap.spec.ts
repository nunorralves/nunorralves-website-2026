import { test, expect } from '@playwright/test';

test('sitemap: sitemap.xml is accessible and contains urlset', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const text = await res.text();
  expect(text).toContain('<urlset');
});
