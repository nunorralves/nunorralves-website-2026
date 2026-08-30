import { test, expect } from '@playwright/test';

// The one property that matters more than anything the dashboard renders: a
// visitor with no cookie must never see a number. These run against the real
// build, with no ANALYTICS_PASSWORD set in the environment, which is the
// harshest version of the question - a misconfigured deployment has to be shut
// rather than open.

test('insights: /insights is not reachable without a session', async ({ page }) => {
  const response = await page.goto('/insights');

  // A redirect to the login page is the expected answer. 401 or 404 would also
  // be acceptable outcomes, and are allowed here so the assertion is about
  // "not the dashboard" rather than about one implementation of privacy.
  const status = response?.status() ?? 0;
  if (status === 200) {
    await expect(page).toHaveURL(/\/insights\/login/);
  } else {
    expect([401, 403, 404]).toContain(status);
  }

  // Whatever the mechanism, none of the dashboard's own furniture may appear.
  await expect(page.getByRole('heading', { name: 'Insights', level: 1 })).toHaveCount(0);
  await expect(page.getByText('Where they came from')).toHaveCount(0);
});

// A deep link is the interesting case: the redirect above could easily be
// written to only catch the bare path.
test('insights: a deep link is not reachable either', async ({ page }) => {
  await page.goto('/insights?range=1y&dim=country');
  await expect(page).toHaveURL(/\/insights\/login/);
});

test('insights: a forged cookie does not open the route', async ({ page, context }) => {
  // A plausible looking value with an expiry far in the future and a signature
  // that was never signed. Without the HMAC check this walks straight in.
  await context.addCookies([
    {
      name: 'insights_session',
      value: `${Math.floor(Date.now() / 1000) + 86_400}.${'a'.repeat(64)}`,
      url: 'http://localhost:3000',
    },
  ]);

  await page.goto('/insights');
  await expect(page).toHaveURL(/\/insights\/login/);
});

test('insights: the login page is served and carries noindex', async ({ page }) => {
  const response = await page.goto('/insights/login');

  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  await expect(page.getByRole('heading', { name: 'Private' })).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test('insights: a wrong password is refused', async ({ page }) => {
  await page.goto('/insights/login');
  await page.locator('input[name="password"]').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/insights\/login\?error=/);
  // By text rather than by role: Next renders its own aria-live route
  // announcer with role="alert" on every navigation, so the role alone
  // matches two elements.
  await expect(page.getByText('That is not the password.')).toBeVisible();
});

// Deliberately not driven through a real session: ANALYTICS_PASSWORD is set
// locally and absent in CI, and a test that only runs on one of those is not a
// test. The contract worth pinning is the response itself.
test('insights: signing out clears the session cookie', async ({ request }) => {
  const res = await request.post('/api/insights/logout', { maxRedirects: 0 });

  expect(res.status()).toBe(303);
  expect(res.headers()['location']).toContain('/insights/login');

  // Max-Age=0 on the same path the login route wrote. Every scoping attribute
  // has to match or the browser stores a second cookie and keeps the first.
  const setCookie = res.headers()['set-cookie'] ?? '';
  expect(setCookie).toContain('insights_session=');
  expect(setCookie).toMatch(/Max-Age=0/i);
  expect(setCookie).toContain('Path=/insights');
});

test('insights: robots.txt disallows it', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('Disallow: /insights');
});

test('insights: the sitemap does not mention it', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  expect(await res.text()).not.toContain('/insights');
});

// ---------------------------------------------------------------------------
// The write routes and the backup, added with the timeline.
//
// These live under /insights rather than /api/insights on purpose: proxy.ts
// matches "/insights/:path*", so they inherit the dashboard's session check
// instead of carrying a second copy of it, and the session cookie is scoped
// Path=/insights so a form posting anywhere else would arrive with no cookie
// at all. That is a claim about routing, and routing is exactly the kind of
// thing that is true until somebody moves a folder.
// ---------------------------------------------------------------------------

// Not a redirect assertion but a "did not do the thing" assertion. A 401, a
// 404 or a bounce to the login page are all acceptable; a 200 is only
// acceptable if the browser was sent to the login page to get there.
function refused(status: number, location: string | undefined) {
  if ([401, 403, 404].includes(status)) return true;
  return status >= 300 && status < 400 && (location ?? '').includes('/insights/login');
}

test('insights: adding an annotation is refused without a session', async ({ request }) => {
  const res = await request.post('/insights/annotations', {
    maxRedirects: 0,
    form: { at: '2026-08-26', kind: 'note', label: 'should never be written' },
  });

  expect(
    refused(res.status(), res.headers()['location']),
    `status ${res.status()} to ${res.headers()['location']}`,
  ).toBe(true);
});

test('insights: deleting an annotation is refused without a session', async ({ request }) => {
  const res = await request.post('/insights/annotations/delete', {
    maxRedirects: 0,
    form: { id: '1' },
  });

  expect(
    refused(res.status(), res.headers()['location']),
    `status ${res.status()} to ${res.headers()['location']}`,
  ).toBe(true);
});

// The one route on the site that would hand over the whole database, so it is
// worth being explicit that nothing came back as well as that it was refused.
test('insights: the backup download is refused without a session', async ({ request }) => {
  const res = await request.get('/insights/backup', { maxRedirects: 0 });

  expect(
    refused(res.status(), res.headers()['location']),
    `status ${res.status()} to ${res.headers()['location']}`,
  ).toBe(true);

  const body = await res.text();
  expect(body).not.toContain('vercel_totals');
  expect(body).not.toContain('daily_engagement');
  expect(body).not.toContain('annotations');
});

// A forged cookie is the interesting case for a write route: the proxy is the
// only thing checking, so an unsigned value walking in would be silent.
test('insights: a forged cookie does not open the write routes', async ({ context }) => {
  await context.addCookies([
    {
      name: 'insights_session',
      value: `${Math.floor(Date.now() / 1000) + 86_400}.${'a'.repeat(64)}`,
      url: 'http://localhost:3000',
    },
  ]);

  const res = await context.request.post('/insights/annotations', {
    maxRedirects: 0,
    form: { at: '2026-08-26', kind: 'note', label: 'forged' },
  });

  expect(
    refused(res.status(), res.headers()['location']),
    `status ${res.status()} to ${res.headers()['location']}`,
  ).toBe(true);
});
