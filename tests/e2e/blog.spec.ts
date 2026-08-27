import { test, expect } from '@playwright/test';

// /archive used to be a permanent redirect to /blog, and this spec asserted
// that. The by-date index has moved back onto its own page, so the assertion
// is now the opposite one: /archive resolves.
test('archive: the by-date index has its own page and opens an older post', async ({
  page,
}) => {
  await page.goto('/archive');
  await expect(page).toHaveURL(/\/archive$/);
  await expect(page.locator('h1')).toHaveText('Archive');

  const postLink = page
    .getByRole('link', { name: /Create a Dynamic Sitemap/i })
    .first();
  await expect(postLink).toBeVisible({ timeout: 7000 });
  await postLink.click();

  await expect(page).toHaveURL(/\/posts\/2020-10-24-dynamic-sitemap$/);
  const h1 = page.locator('h1').first();
  await expect(h1).toBeVisible({ timeout: 5000 });
});

test('archive: every post is listed, not just a page of them', async ({
  page,
}) => {
  const [archiveCount, blogCount] = await Promise.all([
    page.goto('/archive').then(async () => {
      return page.locator('main li a[href^="/posts/"]').count();
    }),
    (async () => {
      const p = await page.context().newPage();
      await p.goto('/blog');
      const n = await p.locator('main a[href^="/posts/"]').count();
      await p.close();
      return n;
    })(),
  ]);

  // The archive is the complete index; /blog is a page of it.
  expect(archiveCount).toBeGreaterThanOrEqual(blogCount);
  expect(archiveCount).toBeGreaterThan(0);
});

test('blog: posts come before the tag cloud, not after it', async ({
  page,
}) => {
  // The whole point of the reshuffle: the page is called Writing, so the
  // writing should not sit below a 37-tag filter.
  await page.goto('/blog');

  const firstPost = page.locator('main a[href^="/posts/"]').first();
  const tagHeading = page.getByRole('heading', { name: 'Browse by tag' });

  const postBox = await firstPost.boundingBox();
  const tagBox = await tagHeading.boundingBox();
  expect(postBox).not.toBeNull();
  expect(tagBox).not.toBeNull();
  expect(postBox!.y).toBeLessThan(tagBox!.y);
});

test('blog: the tag cloud folds its long tail away', async ({ page }) => {
  await page.goto('/blog');

  const details = page.locator('main details');
  await expect(details).toHaveCount(1);

  const pillsBefore = await page.locator('main section a[href^="/tags/"]').count();
  const summary = details.locator('summary');
  await expect(summary).toContainText(/Show \d+ more tags/);

  await summary.click();
  const pillsAfter = await page
    .locator('main section a[href^="/tags/"]')
    .count();

  // Same links either way - <details> only hides them - so assert on what the
  // reader can actually see rather than on the node count.
  expect(pillsAfter).toBe(pillsBefore);
  await expect(
    page.locator('main details a[href^="/tags/"]').first(),
  ).toBeVisible();
});

test('blog: the archive is reachable from the listing', async ({ page }) => {
  await page.goto('/blog');
  await page.getByRole('link', { name: /full archive by date/i }).click();
  await expect(page).toHaveURL(/\/archive$/);
});
