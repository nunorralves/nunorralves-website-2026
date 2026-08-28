import { test, expect } from '@playwright/test';
import { REVIEWED } from '../../lib/now';

// The Currently rail on the home page is the one hand-maintained surface on
// the site - see lib/now.ts. A stale value there ("Building: agentflows, 7 of
// 10 phases" two years after the project moved on) actively misleads a
// reader, so this fails the build once nobody has confirmed it in a while,
// the same trick content-dates.spec.ts runs on post frontmatter.
const MAX_AGE_DAYS = 90;

test('now: the Currently rail was reviewed within the last 90 days', () => {
  const reviewedDate = new Date(REVIEWED);
  const ageDays =
    (Date.now() - reviewedDate.getTime()) / (1000 * 60 * 60 * 24);

  expect(
    ageDays,
    `lib/now.ts REVIEWED (${REVIEWED}) is ${Math.floor(ageDays)} days old - update it, or the fields it dates`,
  ).toBeLessThanOrEqual(MAX_AGE_DAYS);
});
