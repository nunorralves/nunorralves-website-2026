import { test, expect } from '@playwright/test';

test.describe('about', () => {
  test('renders and carries its own meta description', async ({ page }) => {
    await page.goto('/about');

    await expect(page.locator('h1').first()).toHaveText(/About/i, { timeout: 7000 });

    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveCount(1);
    const content = await desc.first().getAttribute('content');
    expect(content).toContain('Nuno Alves');
  });

  // The Person node is what ties every Article and CreativeWork author on the
  // site back to one entity. A typo in it fails silently: the page still
  // renders, the structured data just stops meaning anything.
  test('publishes a Person node whose @id matches what posts reference', async ({ page }) => {
    await page.goto('/about');

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes = blocks.map((block) => JSON.parse(block));
    const person = nodes.find((node) => node['@type'] === 'Person');

    expect(person, 'no Person JSON-LD on /about').toBeTruthy();
    expect(person['@id']).toBe('https://nunorralves.pt/about#person');
    expect(person.name).toBe('Nuno Alves');
    expect(person.sameAs).toContain('https://www.linkedin.com/in/nralves/');

    await page.goto('/posts/2026-05-18-pi-coding-agent');
    const postBlocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const article = postBlocks.map((block) => JSON.parse(block)).find((n) => n['@type'] === 'Article');

    expect(article.author['@id']).toBe(person['@id']);
  });

  test('is reachable from the header nav and the home page intro', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: 'About' })).toBeVisible();

    await page.getByRole('link', { name: /More about me/i }).click();
    await expect(page.locator('h1').first()).toHaveText(/About/i, { timeout: 7000 });
  });
});
