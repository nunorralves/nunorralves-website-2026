import { test, expect } from '@playwright/test';

test('projects: listing shows project cards', async ({ page }) => {
  await page.goto('/projects');

  await expect(page.locator('h1', { hasText: /^Projects$/ })).toBeVisible({ timeout: 7000 });
  await expect(page.locator('h2', { hasText: /nunorralves\.pt/i }).first()).toBeVisible();
  await expect(page.locator('h2', { hasText: /Bench Power Supply/i }).first()).toBeVisible();
});

test('projects: nav link reaches the listing', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Projects', exact: true }).first().click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator('h1', { hasText: /^Projects$/ })).toBeVisible({ timeout: 7000 });
});

test('projects: card exposes source and live links', async ({ page }) => {
  await page.goto('/projects');

  const source = page.getByRole('link', { name: /Source/i }).first();
  await expect(source).toHaveAttribute(
    'href',
    'https://github.com/nunorralves/nunorralves-website-2026',
  );

  const live = page.getByRole('link', { name: /Live/i }).first();
  await expect(live).toHaveAttribute('href', 'https://nunorralves.pt');
});

test('projects: a project with a body has its own page', async ({ page }) => {
  await page.goto('/projects');

  // Scoped to one card - several projects now carry a body, and "first" is
  // whichever of them is newest
  const card = page.locator('article', { hasText: /nunorralves\.pt/i }).first();
  await card.getByRole('link', { name: /Read more/i }).click();
  await expect(page).toHaveURL(/\/projects\/nunorralves-pt$/);

  await expect(page.locator('h1', { hasText: /nunorralves\.pt/i })).toBeVisible({ timeout: 7000 });
  // spec panel
  await expect(page.getByText('Repository')).toBeVisible();
  await expect(page.getByText('Stack')).toBeVisible();
  await expect(page.getByText('Active')).toBeVisible();
});

test('projects: a project without a body links to its blog post instead', async ({ page }) => {
  await page.goto('/projects');

  await page.getByRole('link', { name: /Write-up/i }).first().click();
  await expect(page).toHaveURL(/\/posts\/2021-06-08-power-supply-1$/);
});

test('projects: no detail page is generated for a body-less project', async ({ page }) => {
  const res = await page.goto('/projects/bench-power-supply');
  expect(res?.status()).toBe(404);
});

test('projects: project tags link into the shared tag pages', async ({ page }) => {
  await page.goto('/tags/nextjs');

  await expect(page.locator('h1', { hasText: /Tag: nextjs/i })).toBeVisible({ timeout: 7000 });
  await expect(page.locator('h2', { hasText: /nunorralves\.pt/i }).first()).toBeVisible();
});

test('projects: search returns projects alongside posts', async ({ page }) => {
  await page.goto('/search');

  const input = page.locator('input[placeholder="Search posts and projects..."]');
  await expect(input).toBeVisible({ timeout: 7000 });
  await input.fill('Playwright');

  await page.waitForTimeout(600);
  await expect(page.getByText('Project', { exact: true }).first()).toBeVisible({ timeout: 7000 });
});

test('projects: tag normalization merges case variants', async ({ page }) => {
  // "Typescript" and "typescript" both appear in post frontmatter and must
  // collapse onto one page
  await page.goto('/tags/typescript');
  const heading = page.locator('h1', { hasText: /Tag: typescript/i });
  await expect(heading).toBeVisible({ timeout: 7000 });

  const cards = page.locator('article');
  expect(await cards.count()).toBeGreaterThan(1);
});
