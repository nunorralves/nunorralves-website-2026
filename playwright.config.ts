import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  // trace is 'on-first-retry', which captured nothing while retries were 0.
  // One retry locally so a genuine failure still reports as a failure rather
  // than being retried into a pass by accident.
  retries: isCI ? 2 : 1,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // A production build rather than `next dev`.
    //
    // Under `next dev` every route compiles on first request, so with the
    // suite fully parallel the first worker to reach a cold page waits on
    // Turbopack while six others queue behind it. That routinely blew the 30s
    // test timeout: two consecutive full runs failed 4 and then 5 different
    // specs, always an h1 that never appeared, and always in whichever specs
    // happened to land on cold routes first. Nothing was wrong with the pages.
    //
    // Serving a build removes on-demand compilation entirely, and has the
    // better property that the suite now exercises the artifact that actually
    // ships instead of a dev-mode approximation of it.
    command: 'npm run build && npm run start',
    port: 3000,
    // Locally, a dev server already on :3000 is reused, which keeps the fast
    // edit-and-rerun loop available. That path is still subject to the compile
    // races described above, which is what the retry above is for. CI always
    // builds.
    reuseExistingServer: !isCI,
    // The build has to fit in here, not just the server boot.
    timeout: 180_000,
  },
});
