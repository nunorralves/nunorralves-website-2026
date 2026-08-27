import { test, expect } from '@playwright/test';

// The listing marker and the post-page banner are the same decision, so these
// cover that they agree rather than just that the marker renders somewhere.
const MARKER = 'may be out of date';

const SUPERSEDED_TITLE = 'Top 5 Next.js 10 New Features';
const SUPPRESSED_TITLE = '5 Management Books';
const RECENT_TITLE = 'Multi-Agent';

test.describe('outdated listing marker', () => {
  // /blog page 1 is the five newest posts, so the old ones are only on a tag
  // page or deeper in the pagination. The tag page is the stable surface.
  test('marks an outdated post on its card', async ({ page }) => {
    await page.goto('/tags/nextjs');

    const card = page.locator('article', { hasText: SUPERSEDED_TITLE });
    await expect(card).toBeVisible({ timeout: 7000 });
    await expect(card).toContainText(MARKER);
  });

  test('marks an outdated post in the by-date index', async ({ page }) => {
    await page.goto('/blog');

    const entry = page.locator('li', { hasText: SUPERSEDED_TITLE });
    await expect(entry).toBeVisible({ timeout: 7000 });
    await expect(entry).toContainText(MARKER);
  });

  // The whole point of the suppression flag: old, but not stale, and the
  // listing has to say so by saying nothing.
  test('leaves a suppressed post unmarked in the by-date index', async ({ page }) => {
    await page.goto('/blog');

    const entry = page.locator('li', { hasText: SUPPRESSED_TITLE });
    await expect(entry).toBeVisible({ timeout: 7000 });
    await expect(entry).not.toContainText(MARKER);
  });

  test('leaves a recent post unmarked', async ({ page }) => {
    await page.goto('/blog');

    const entry = page.locator('li', { hasText: RECENT_TITLE }).first();
    await expect(entry).toBeVisible({ timeout: 7000 });
    await expect(entry).not.toContainText(MARKER);
  });

  test('marks an outdated post in search results', async ({ page }) => {
    await page.goto('/search');

    const input = page.locator('input[placeholder="Search posts and projects..."]');
    await expect(input).toBeVisible({ timeout: 7000 });
    await input.fill('Top 5 Next.js 10');

    const card = page.locator('article', { hasText: SUPERSEDED_TITLE }).first();
    await expect(card).toBeVisible({ timeout: 7000 });
    await expect(card).toContainText(MARKER);
  });

  // A marker on a card is an aside to the date, not a heading or a control.
  // If it ever becomes a link or a button it has started competing with the
  // title for the click, which is the thing this design is avoiding.
  test('the marker is plain text, not an interactive element', async ({ page }) => {
    await page.goto('/tags/nextjs');

    const card = page.locator('article', { hasText: SUPERSEDED_TITLE });
    await expect(card).toBeVisible({ timeout: 7000 });

    const marker = card.getByText(MARKER, { exact: true });
    await expect(marker).toHaveCount(1);
    await expect(marker).toHaveJSProperty('tagName', 'SPAN');
  });
});
