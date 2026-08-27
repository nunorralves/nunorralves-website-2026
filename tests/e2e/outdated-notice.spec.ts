import { test, expect } from '@playwright/test';

// The aria-label the notice carries. Matching on the landmark rather than a
// class pins the accessible semantics at the same time: an `aside` only maps
// to `complementary` inside an `article` if it has an accessible name.
const NOTICE = 'Note on the age of this post';

const SUPERSEDED = '/posts/2020-11-02-top-nextjs10-features';
const NOTE_TEXT = 'snapshot of the Next.js 10 release';

test.describe('outdated notice', () => {
  test('renders the custom note on a superseded post', async ({ page }) => {
    await page.goto(SUPERSEDED);

    const notice = page.getByRole('complementary', { name: NOTICE });
    await expect(notice).toBeVisible({ timeout: 7000 });
    await expect(notice).toContainText(NOTE_TEXT);

    // Custom text replaces the generic wording, it does not join it
    await expect(notice).not.toContainText('may be out of date');
  });

  test('renders a link authored inside a note', async ({ page }) => {
    await page.goto('/posts/2020-10-22-nextjs-markdown-blog');

    const notice = page.getByRole('complementary', { name: NOTICE });
    await expect(notice).toBeVisible({ timeout: 7000 });
    await expect(
      notice.getByRole('link', { name: 'how this site is built' }),
    ).toHaveAttribute('href', '/projects/nunorralves-pt');
  });

  test('is absent on a post carrying outdated: false', async ({ page }) => {
    await page.goto('/posts/2021-03-27-management-books');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 7000 });
    await expect(page.getByRole('complementary', { name: NOTICE })).toHaveCount(0);
  });

  test('is absent on a recent post', async ({ page }) => {
    await page.goto('/posts/2026-07-04-pi-multi-agent-teams');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 7000 });
    await expect(page.getByRole('complementary', { name: NOTICE })).toHaveCount(0);
  });

  // Post pages only. Listings show a date already; a staleness marker on a
  // card would be a second one saying the same thing more vaguely.
  for (const listing of ['/blog', '/tags/nextjs', '/search']) {
    test(`is absent on ${listing}`, async ({ page }) => {
      await page.goto(listing);

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 7000 });
      await expect(page.getByRole('complementary', { name: NOTICE })).toHaveCount(0);
    });
  }

  // The notice is for humans who land on an old post. These posts still rank
  // and should keep ranking, so none of it may leak into what crawlers read.
  test('stays out of the meta description, the structured data and robots', async ({
    page,
  }) => {
    await page.goto(SUPERSEDED);

    const description = await page
      .locator('meta[name="description"]')
      .first()
      .getAttribute('content');
    expect(description).not.toContain(NOTE_TEXT);

    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).not.toContain(NOTE_TEXT);
    }

    await expect(
      page.locator('meta[name="robots"][content*="noindex"]'),
    ).toHaveCount(0);

    // The body is still there in full, not collapsed behind the notice
    await expect(page.locator('.prose h2').first()).toBeVisible();
  });
});
