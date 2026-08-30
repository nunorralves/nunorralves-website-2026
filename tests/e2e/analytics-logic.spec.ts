import { test, expect } from '@playwright/test';
import { addDays, endOfMonth, startOfMonth, subDays } from 'date-fns';
import {
  exactVisitorBucket,
  parseCustomRange,
  parsePreset,
  pickGrain,
  resolveRange,
  toIsoDate,
} from '../../lib/analytics/ranges';
import { GRAINS, VERCEL_RETENTION_DAYS } from '../../lib/analytics/config';
import { toBucketString } from '../../lib/analytics/queries';
import { windowFor } from '../../lib/analytics/sync';
import { buildConclusion } from '../../lib/analytics/summary';
import {
  formatDelta,
  formatDeltaPoints,
  formatDuration,
  formatRatio,
} from '../../lib/analytics/format';

// Pure logic, no database, no page. Same reasoning as outdated-logic.spec.ts:
// these are the rules most likely to be wrong in a way nothing on screen would
// betray, and a test that needed DATABASE_URL could not run in CI at all.

const NOW = new Date('2026-08-30T12:00:00Z');

// ---------------------------------------------------------------------------
// Grain selection
// ---------------------------------------------------------------------------

test('analytics logic: short ranges are drawn from daily buckets', () => {
  expect(pickGrain(resolveRange('1d', NOW))).toBe('day');
  expect(pickGrain(resolveRange('7d', NOW))).toBe('day');
  expect(pickGrain(resolveRange('30d', NOW))).toBe('day');
});

// 90 days is the boundary in pickGrain, and three months from 30 August is 92,
// so this is the first preset that crosses it.
test('analytics logic: a quarter and a year are drawn from weekly buckets', () => {
  expect(pickGrain(resolveRange('3m', NOW))).toBe('week');
  expect(pickGrain(resolveRange('6m', NOW))).toBe('week');
  expect(pickGrain(resolveRange('1y', NOW))).toBe('week');
});

test('analytics logic: all time is drawn from monthly buckets', () => {
  expect(pickGrain(resolveRange('all', NOW))).toBe('month');
});

// The two edges of each threshold, because an off-by-one here shows up as a
// chart that is merely a bit denser than expected rather than as a failure.
test('analytics logic: the grain thresholds fall where they claim to', () => {
  const daysBefore = (days: number) => ({
    from: new Date(NOW.getTime() - days * 86_400_000),
    to: NOW,
  });

  expect(pickGrain(daysBefore(90))).toBe('day');
  expect(pickGrain(daysBefore(91))).toBe('week');
  expect(pickGrain(daysBefore(370))).toBe('week');
  expect(pickGrain(daysBefore(371))).toBe('month');
});

// ---------------------------------------------------------------------------
// The exact bucket rule
//
// This is the trap the whole dashboard is built around. `visitors` is a
// distinct count and distinct counts do not add, so a figure is only true
// uniques when the range is exactly one stored bucket. Everywhere else the UI
// has to say "sum".
// ---------------------------------------------------------------------------

// Every date below is built with the local-time constructor and with
// date-fns' own startOfMonth/endOfMonth rather than with UTC literals.
// exactVisitorBucket compares calendar days in local time while toIsoDate
// serialises in UTC, so a hardcoded '2026-08-31T23:59:59Z' is the last instant
// of August in London and the first of September in Lisbon, and these tests
// would pass or fail on the machine's timezone rather than on the rule.
const AUGUST = startOfMonth(new Date(2026, 7, 15));

test('analytics logic: a single day is one exact bucket', () => {
  const day = new Date(2026, 7, 30, 12, 0, 0);
  expect(exactVisitorBucket({ from: day, to: day })).toEqual({
    grain: 'day',
    bucket: toIsoDate(day),
  });
});

test('analytics logic: a whole calendar month is one exact bucket', () => {
  expect(
    exactVisitorBucket({ from: AUGUST, to: endOfMonth(AUGUST) }),
  ).toEqual({ grain: 'month', bucket: toIsoDate(AUGUST) });
});

test('analytics logic: no preset except a same-day range is exact', () => {
  for (const preset of ['7d', '30d', '3m', '6m', '1y', 'all'] as const) {
    expect(exactVisitorBucket(resolveRange(preset, NOW))).toBeNull();
  }
});

// The dangerous near-misses. Every one of these is a range somebody would
// reasonably call "a month", and summing its buckets overstates uniques.
test('analytics logic: a month-shaped range that is not one month is not exact', () => {
  const today = new Date(2026, 7, 30, 12, 0, 0);
  const cases = [
    // Thirty days ending today: the default view.
    { from: subDays(today, 30), to: today },
    // Starts on the first but stops a day short of the end.
    { from: AUGUST, to: subDays(endOfMonth(AUGUST), 1) },
    // Ends on the last of the month but starts on the second.
    { from: addDays(AUGUST, 1), to: endOfMonth(AUGUST) },
    // A full calendar month plus one day.
    { from: AUGUST, to: addDays(endOfMonth(AUGUST), 1) },
  ];

  for (const range of cases) {
    expect(exactVisitorBucket(range)).toBeNull();
  }
});

// A week is a stored grain, but a week is never exact: two consecutive weekly
// buckets or seven daily ones both sum distinct counts. Only day and month are
// ever returned.
test('analytics logic: a calendar week is not treated as exact', () => {
  const end = new Date(2026, 7, 30, 12, 0, 0);
  expect(exactVisitorBucket({ from: subDays(end, 6), to: end })).toBeNull();
});

// ---------------------------------------------------------------------------
// The sync window
//
// windowFor is pure and imported directly, so none of this needs a database or
// a network call. It is tested at all because the bug it had was invisible:
// asking Vercel for a window that starts before the plan's retention line is
// not answered with less data, it is refused with a 400 for the whole query,
// and only the month grain was doing it.
// ---------------------------------------------------------------------------

const daysBack = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / 86_400_000);

test('analytics logic: no sync window reaches past what the plan will answer', () => {
  for (const grain of GRAINS) {
    const { since } = windowFor(grain, NOW);
    expect(daysBack(since, NOW)).toBeLessThanOrEqual(VERCEL_RETENTION_DAYS);
  }
});

// The specific regression. subMonths(now, 2) is about 61 days, which Vercel
// refuses outright, so every month-grain query failed on every nightly run.
test('analytics logic: the month grain is clamped rather than refused', () => {
  const { since } = windowFor('month', NOW);
  expect(daysBack(since, NOW)).toBe(VERCEL_RETENTION_DAYS);
});

// The other two were always inside the line and must not have been widened by
// the clamp: re-reading more than it needs to costs API calls for nothing.
test('analytics logic: the shorter grains keep their own windows', () => {
  expect(daysBack(windowFor('day', NOW).since, NOW)).toBe(7);
  expect(daysBack(windowFor('week', NOW).since, NOW)).toBe(14);
});

test('analytics logic: an explicit window is honoured, then clamped too', () => {
  expect(daysBack(windowFor('day', NOW, 30).since, NOW)).toBe(30);
  expect(daysBack(windowFor('day', NOW, 1).since, NOW)).toBe(1);
  // A caller asking for a year gets the line, not a 400.
  expect(daysBack(windowFor('month', NOW, 365).since, NOW)).toBe(
    VERCEL_RETENTION_DAYS,
  );
});

test('analytics logic: every window ends now', () => {
  for (const grain of GRAINS) {
    expect(windowFor(grain, NOW).until).toEqual(NOW);
  }
});

// ---------------------------------------------------------------------------
// Query string parsing
// ---------------------------------------------------------------------------

test('analytics logic: an unknown preset falls back to thirty days', () => {
  expect(parsePreset(undefined)).toBe('30d');
  expect(parsePreset('')).toBe('30d');
  expect(parsePreset('42y')).toBe('30d');
  expect(parsePreset('7d')).toBe('7d');
});

test('analytics logic: a mangled custom range is rejected rather than guessed', () => {
  expect(parseCustomRange(undefined, '2026-08-30')).toBeNull();
  expect(parseCustomRange('2026-08-01', undefined)).toBeNull();
  expect(parseCustomRange('not-a-date', '2026-08-30')).toBeNull();
  // Backwards, which would otherwise render an empty chart that reads as a
  // traffic collapse rather than as a bad URL.
  expect(parseCustomRange('2026-08-30', '2026-08-01')).toBeNull();
});

test('analytics logic: a well formed custom range is accepted', () => {
  const range = parseCustomRange('2026-08-01', '2026-08-31');
  expect(range?.from.toISOString().slice(0, 10)).toBe('2026-08-01');
  expect(range?.to.toISOString().slice(0, 10)).toBe('2026-08-31');
});

// ---------------------------------------------------------------------------
// The generated conclusion
// ---------------------------------------------------------------------------

const RANGE = { from: new Date('2026-07-31T00:00:00Z'), to: NOW };

const BASE = {
  range: RANGE,
  pageviews: 1000,
  previousPageviews: 1000,
  topPage: null,
  topReferrer: null,
  outbound: 0,
  zeroSearches: [],
};

test('analytics logic: an empty range says so rather than reporting zeroes', () => {
  const { headline } = buildConclusion({ ...BASE, pageviews: 0 });
  expect(headline).toBe('Nothing has arrived for this range yet.');
});

test('analytics logic: a real move against the previous window leads', () => {
  const { headline } = buildConclusion({
    ...BASE,
    pageviews: 1340,
    previousPageviews: 1000,
    topPage: { value: '/posts/one', pageviews: 900 },
  });
  expect(headline).toBe('Reading rose 34% against the previous 30 days.');
});

test('analytics logic: a swing under the threshold is not reported as news', () => {
  const { headline } = buildConclusion({
    ...BASE,
    pageviews: 1100,
    previousPageviews: 1000,
  });
  expect(headline).toContain('nothing in the range stands out');
});

test('analytics logic: a dominant page leads when nothing moved', () => {
  const { headline } = buildConclusion({
    ...BASE,
    topPage: { value: '/posts/one', pageviews: 600 },
  });
  expect(headline).toBe(
    '/posts/one carried 60% of everything read in this range.',
  );
});

// "(none)" is what the ETL writes for a direct visit, and "most of it was
// direct" is not a finding.
test('analytics logic: direct traffic is never the headline', () => {
  const { headline } = buildConclusion({
    ...BASE,
    topReferrer: { value: '(none)', pageviews: 900 },
  });
  expect(headline).toContain('nothing in the range stands out');
});

test('analytics logic: a dominant referrer leads when no page does', () => {
  const { headline } = buildConclusion({
    ...BASE,
    topReferrer: { value: 'news.ycombinator.com', pageviews: 700 },
  });
  expect(headline).toBe('Most of this range arrived from news.ycombinator.com.');
});

test('analytics logic: the subline names the repeated empty search', () => {
  const { subline } = buildConclusion({
    ...BASE,
    outbound: 63,
    zeroSearches: [
      { target: 'team topologies', count: 3 },
      { target: 'okrs', count: 1 },
    ],
  });
  expect(subline).toBe(
    '63 outbound clicks - 4 searches found nothing, 3 of them for "team topologies".',
  );
});

test('analytics logic: a quiet range still gets a subline', () => {
  expect(buildConclusion(BASE).subline).toBe(
    'No outbound clicks and no empty searches in this range.',
  );
});

// No em dashes or en dashes anywhere in generated copy: the site writes " - ".
test('analytics logic: generated copy uses no dashes', () => {
  const { headline, subline } = buildConclusion({
    ...BASE,
    outbound: 1,
    zeroSearches: [{ target: 'mcp server', count: 2 }],
  });
  expect(headline + subline).not.toMatch(/[–—]/);
});

// ---------------------------------------------------------------------------
// Reading dates back out of Postgres
//
// The regression this pins: the driver parses a `date` column into a JS Date
// at local midnight, so String(row.bucket).slice(0, 10) produced "Sun Aug 30"
// rather than "2026-08-30", and every chart label and tooltip quietly printed
// that instead. Nothing failed, the axis just went strange.
// ---------------------------------------------------------------------------

test('analytics logic: a date column survives whatever shape it arrives in', () => {
  // What ::text gives, which is the path every query actually takes now.
  expect(toBucketString('2026-08-30')).toBe('2026-08-30');
  // What the driver gives when a cast is missed. Local midnight, so reading
  // the parts locally is what recovers the day that was stored; toISOString
  // would report the 29th anywhere east of UTC.
  expect(toBucketString(new Date(2026, 7, 30))).toBe('2026-08-30');
  expect(toBucketString(new Date(2026, 0, 1))).toBe('2026-01-01');
  // A timestamptz string, trimmed to its day.
  expect(toBucketString('2026-08-30T00:00:00.000Z')).toBe('2026-08-30');
});

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

test('analytics logic: a missing figure renders as a dash, never as zero', () => {
  expect(formatDuration(null)).toBe('-');
  expect(formatRatio(null)).toBe('-');
  expect(formatDuration(0)).toBe('0s');
  expect(formatRatio(0)).toBe('0%');
});

test('analytics logic: durations read the way a reading time is spoken', () => {
  expect(formatDuration(48_000)).toBe('48s');
  expect(formatDuration(192_000)).toBe('3m 12s');
  expect(formatDuration(3_600_000)).toBe('60m 00s');
});

test('analytics logic: a delta needs something to compare against', () => {
  expect(formatDelta(100, null)).toBeNull();
  expect(formatDelta(100, 0)).toBeNull();
  expect(formatDelta(112, 100)).toBe('▲ 12.0%');
  expect(formatDelta(88, 100)).toBe('▼ 12.0%');
  expect(formatDelta(100, 100)).toBe('level');
});

// Bounce moving 49% to 46% is three points, not six percent.
test('analytics logic: rate deltas are stated in percentage points', () => {
  expect(formatDeltaPoints(0.46, 0.49)).toBe('▼ 3.0pp');
  expect(formatDeltaPoints(0.46, null)).toBeNull();
});
