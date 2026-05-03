import { test, expect } from '@playwright/test';

test('robots: robots.txt is accessible', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const text = await res.text();
  expect(text.length).toBeGreaterThan(10);
  expect(text.toLowerCase()).toContain('user-agent');
});
