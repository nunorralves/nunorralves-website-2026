import { test, expect } from '@playwright/test';
import {
  ANNOTATION_MESSAGES,
  LIFT_WINDOW_DAYS,
  computeLift,
  contentAnnotations,
  dayNumber,
  formatLift,
  isAnnotationMessage,
  liftsFor,
  parseAnnotationInput,
  shiftIsoDay,
  type Annotation,
} from '../../lib/analytics/annotations';

// Pure logic, no database and no page, for the same reason
// analytics-logic.spec.ts is: these are the rules most likely to be wrong in a
// way nothing on screen would betray. A lift is a percentage sitting next to a
// marker, and a wrong one does not look wrong - it looks like an answer.

const NOW = new Date('2026-08-30T12:00:00Z');

// A day well clear of any month boundary, so a test that shifts by a week is
// exercising the arithmetic and not the calendar.
const D = '2026-08-20';

function days(from: string, values: number[]): Map<string, number> {
  // `from` is day zero of the list, so a fixture reads as a strip of the
  // series rather than as a set of dates to check by hand.
  return new Map(values.map((value, i) => [shiftIsoDay(from, i), value]));
}

// ---------------------------------------------------------------------------
// Day arithmetic
// ---------------------------------------------------------------------------

test('annotations logic: a date that does not exist is not a date', () => {
  expect(dayNumber('2026-02-31')).toBeNull();
  expect(dayNumber('2026-13-01')).toBeNull();
  expect(dayNumber('20260820')).toBeNull();
  expect(dayNumber('')).toBeNull();
  // A leap day that does exist, so the rejection above is not just strictness.
  expect(dayNumber('2028-02-29')).not.toBeNull();
});

test('annotations logic: shifting a day crosses months and years cleanly', () => {
  expect(shiftIsoDay('2026-08-31', 1)).toBe('2026-09-01');
  expect(shiftIsoDay('2026-01-01', -1)).toBe('2025-12-31');
  expect(shiftIsoDay('2028-02-28', 1)).toBe('2028-02-29');
});

// ---------------------------------------------------------------------------
// Content derived annotations
// ---------------------------------------------------------------------------

test('annotations logic: posts and projects become markers keyed on their slug', () => {
  const rows = contentAnnotations(
    [{ slug: 'pi-extensions', title: 'Pi Extensions', date: '2026-06-08', href: '/posts/pi-extensions' }],
    [{ slug: 'agentflows', title: 'agentflows', date: '2026-08-21', href: '/projects/agentflows' }],
  );

  // Newest first, whatever order they arrived in.
  expect(rows.map((row) => row.at)).toEqual(['2026-08-21', '2026-06-08']);

  expect(rows[1]).toMatchObject({
    at: '2026-06-08',
    kind: 'post',
    label: 'Published: Pi Extensions',
    url: '/posts/pi-extensions',
    source: 'content',
    externalKey: 'post:pi-extensions',
  });

  expect(rows[0]).toMatchObject({
    kind: 'project',
    label: 'Launched: agentflows',
    externalKey: 'project:agentflows',
  });
});

// The key is what makes the nightly write an upsert rather than an append, and
// the date is deliberately not part of it: editing frontmatter has to move the
// marker, not leave the old one behind next to a new one.
test('annotations logic: the external key survives a changed date', () => {
  const before = contentAnnotations([{ slug: 'a-post', title: 'A post', date: '2026-06-08' }], []);
  const after = contentAnnotations([{ slug: 'a-post', title: 'A post', date: '2026-06-11' }], []);

  expect(before[0]!.externalKey).toBe(after[0]!.externalKey);
  expect(before[0]!.at).not.toBe(after[0]!.at);
});

// gray-matter hands back a Date for a bare YAML date and a string for a quoted
// one, and the content directory has both.
test('annotations logic: a Date and a string frontmatter date agree', () => {
  const fromDate = contentAnnotations(
    [{ slug: 'a', title: 'A', date: new Date('2026-06-08T00:00:00Z') }],
    [],
  );
  const fromString = contentAnnotations([{ slug: 'a', title: 'A', date: '2026-06-08' }], []);

  expect(fromDate[0]!.at).toBe('2026-06-08');
  expect(fromString[0]!.at).toBe('2026-06-08');
});

// A marker on the wrong day is worse than no marker, because it will be read
// as a cause for whatever happened that day.
test('annotations logic: content with an unreadable date is dropped, not defaulted', () => {
  const rows = contentAnnotations(
    [
      { slug: 'good', title: 'Good', date: '2026-06-08' },
      { slug: 'bad', title: 'Bad', date: 'sometime in June' },
    ],
    [],
  );

  expect(rows.map((row) => row.externalKey)).toEqual(['post:good']);
});

test('annotations logic: a project with no page of its own carries no link', () => {
  const rows = contentAnnotations([], [
    { slug: 'no-page', title: 'No page', date: '2026-06-08', href: null },
  ]);

  expect(rows[0]!.url).toBeNull();
});

test('annotations logic: a very long title is capped rather than refused', () => {
  const rows = contentAnnotations(
    [{ slug: 'long', title: 'x'.repeat(400), date: '2026-06-08' }],
    [],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0]!.label.length).toBeLessThanOrEqual(120);
  expect(rows[0]!.label.endsWith('...')).toBe(true);
});

// ---------------------------------------------------------------------------
// Lift
// ---------------------------------------------------------------------------

test('annotations logic: a clean marker compares the window after against the window before', () => {
  // Seven days of 10 ending the day before the marker, then seven of 20 from
  // the marker onwards. 140 against 70 is a doubling.
  const daily = days(shiftIsoDay(D, -7), [
    ...Array(7).fill(10),
    ...Array(7).fill(20),
  ]);

  const lift = computeLift({
    at: D,
    others: [],
    daily,
    first: shiftIsoDay(D, -30),
    last: shiftIsoDay(D, 30),
  });

  expect(lift.status).toBe('ok');
  expect(lift.window).toBe(LIFT_WINDOW_DAYS);
  expect(lift.before).toBe(70);
  expect(lift.after).toBe(140);
  expect(lift.change).toBeCloseTo(1);
  expect(formatLift(lift)).toBe('▲ 100%');
});

// The marker's own day counts as after, not before. A post published in the
// morning gets its traffic that afternoon, and putting that day on the wrong
// side of the line halves the effect it is meant to measure.
test('annotations logic: the day of the marker belongs to the window after it', () => {
  const daily = days(shiftIsoDay(D, -7), [
    ...Array(7).fill(0),
    100,
    ...Array(6).fill(0),
  ]);

  const lift = computeLift({
    at: D,
    others: [],
    daily,
    first: shiftIsoDay(D, -30),
    last: shiftIsoDay(D, 30),
  });

  expect(lift.after).toBe(100);
  expect(lift.before).toBe(0);
});

test('annotations logic: a marker too recent for a full window says so instead of guessing', () => {
  const lift = computeLift({
    at: D,
    others: [],
    daily: days(shiftIsoDay(D, -7), Array(10).fill(10)),
    first: shiftIsoDay(D, -30),
    // Three days of traffic since the marker, against a seven day window.
    last: shiftIsoDay(D, 2),
  });

  expect(lift.status).toBe('pending');
  expect(lift.change).toBeNull();
  expect(lift.note).toContain('4 more days');
  expect(formatLift(lift)).toBe('too recent');
});

// The boundary, because an off-by-one here shows as a number appearing a day
// early rather than as anything failing.
test('annotations logic: the window is full on the last day it needs', () => {
  const common = {
    at: D,
    others: [] as string[],
    daily: days(shiftIsoDay(D, -7), Array(14).fill(10)),
    first: shiftIsoDay(D, -30),
  };

  expect(computeLift({ ...common, last: shiftIsoDay(D, 6) }).status).toBe('ok');
  expect(computeLift({ ...common, last: shiftIsoDay(D, 5) }).status).toBe('pending');
});

test('annotations logic: a marker near the start of the mirror has no baseline', () => {
  const lift = computeLift({
    at: D,
    others: [],
    daily: days(shiftIsoDay(D, -5), Array(14).fill(10)),
    // The mirror only reaches five days back, and the baseline needs seven.
    first: shiftIsoDay(D, -5),
    last: shiftIsoDay(D, 10),
  });

  expect(lift.status).toBe('no-baseline');
  expect(lift.before).toBeNull();
  expect(formatLift(lift)).toBe('no baseline');
});

test('annotations logic: an empty mirror has nothing to compare against', () => {
  const lift = computeLift({
    at: D,
    others: [],
    daily: new Map(),
    first: null,
    last: null,
  });

  expect(lift.status).toBe('no-baseline');
});

// Overlap, which is the failure a naive implementation never notices: two
// things happened, and the arithmetic hands the whole of the change to
// whichever one you happened to be looking at.
test('annotations logic: neither of two markers on one day can claim the change', () => {
  const lift = computeLift({
    at: D,
    others: [D],
    daily: days(shiftIsoDay(D, -7), Array(14).fill(10)),
    first: shiftIsoDay(D, -30),
    last: shiftIsoDay(D, 30),
  });

  expect(lift.status).toBe('crowded');
  expect(lift.note).toContain('same day');
});

test('annotations logic: a neighbour shrinks both windows, symmetrically', () => {
  // The next marker is four days later, so the after window can only run
  // [D, D+3]. The before window takes the same four days rather than seven,
  // because an eight day after against a two day before is not a comparison.
  const daily = days(shiftIsoDay(D, -7), [
    // Seven days before, of which only the last four are counted.
    99, 99, 99, 5, 5, 5, 5,
    // Four days from the marker.
    20, 20, 20, 20,
  ]);

  const lift = computeLift({
    at: D,
    others: [shiftIsoDay(D, 4)],
    daily,
    first: shiftIsoDay(D, -30),
    last: shiftIsoDay(D, 30),
  });

  expect(lift.status).toBe('ok');
  expect(lift.window).toBe(4);
  expect(lift.before).toBe(20);
  expect(lift.after).toBe(80);
});

test('annotations logic: a neighbour too close leaves nothing worth comparing', () => {
  const common = {
    at: D,
    daily: days(shiftIsoDay(D, -10), Array(24).fill(10)),
    first: shiftIsoDay(D, -30),
    last: shiftIsoDay(D, 30),
  };

  // Two days of after window is one link being shared, not a trend.
  expect(computeLift({ ...common, others: [shiftIsoDay(D, 2)] }).status).toBe('crowded');
  // The previous marker is two days back, so the baseline would be one day.
  expect(computeLift({ ...common, others: [shiftIsoDay(D, -2)] }).status).toBe('crowded');
  // Three days each side is the floor, and it clears it.
  expect(computeLift({ ...common, others: [shiftIsoDay(D, 3)] }).status).toBe('ok');
});

test('annotations logic: a rise out of nothing is counted, not divided by zero', () => {
  const lift = computeLift({
    at: D,
    others: [],
    daily: days(D, Array(7).fill(30)),
    first: shiftIsoDay(D, -30),
    last: shiftIsoDay(D, 30),
  });

  expect(lift.status).toBe('from-zero');
  expect(lift.before).toBe(0);
  expect(lift.after).toBe(210);
  expect(lift.change).toBeNull();
  expect(formatLift(lift)).toBe('from zero');
  // The two counts rather than an infinite percentage.
  expect(lift.note).toContain('210');
});

test('annotations logic: a change under a point reads as level, not as noise with a sign', () => {
  const daily = days(shiftIsoDay(D, -7), [
    ...Array(7).fill(100),
    ...Array(7).fill(100),
  ]);

  const lift = computeLift({
    at: D,
    others: [],
    daily,
    first: shiftIsoDay(D, -30),
    last: shiftIsoDay(D, 30),
  });

  expect(formatLift(lift)).toBe('level');
});

// A missing day is a day with no traffic, not a gap to be skipped. Vercel
// simply does not return a bucket for a day nobody visited.
test('annotations logic: days missing from the series count as zero', () => {
  const daily = new Map([
    [shiftIsoDay(D, -7), 70],
    [D, 140],
  ]);

  const lift = computeLift({
    at: D,
    others: [],
    daily,
    first: shiftIsoDay(D, -30),
    last: shiftIsoDay(D, 30),
  });

  expect(lift.before).toBe(70);
  expect(lift.after).toBe(140);
});

test('annotations logic: every marker is measured against all the others', () => {
  const annotations: Annotation[] = [
    { id: 1, at: D, kind: 'post', label: 'A', url: null, source: 'content', externalKey: 'post:a' },
    // Two days later, so neither can own the week.
    { id: 2, at: shiftIsoDay(D, 2), kind: 'external', label: 'B', url: null, source: 'manual', externalKey: null },
  ];

  const lifts = liftsFor(annotations, days(shiftIsoDay(D, -10), Array(30).fill(10)), {
    first: shiftIsoDay(D, -30),
    last: shiftIsoDay(D, 30),
  });

  expect(lifts.get(1)!.status).toBe('crowded');
  expect(lifts.get(2)!.status).toBe('crowded');
});

// ---------------------------------------------------------------------------
// Validation
//
// The routes sit behind the session check, so everything reaching them is
// already me. That is not the same as it being the form: maxlength and
// type="date" are enforced by the browser and by nothing else.
// ---------------------------------------------------------------------------

test('annotations logic: a well formed marker parses into a manual row', () => {
  const parsed = parseAnnotationInput(
    { at: '2026-08-26', kind: 'profile', label: '  Updated LinkedIn headline  ', url: '' },
    NOW,
  );

  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value).toEqual({
    at: '2026-08-26',
    kind: 'profile',
    label: 'Updated LinkedIn headline',
    url: null,
    source: 'manual',
    externalKey: null,
  });
});

test('annotations logic: a manual row never carries an external key', () => {
  const parsed = parseAnnotationInput(
    { at: '2026-08-26', kind: 'note', label: 'A note' },
    NOW,
  );

  // Null is what keeps it out of the nightly content upsert, which deletes
  // every content row whose key it did not just write.
  expect(parsed.ok && parsed.value.externalKey).toBeNull();
});

test('annotations logic: a bad date, kind or label is refused with a reason', () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ at: 'yesterday', kind: 'note', label: 'x' }, 'date'],
    [{ at: '2026-02-31', kind: 'note', label: 'x' }, 'date'],
    [{ at: '1994-01-01', kind: 'note', label: 'x' }, 'date-range'],
    [{ at: '2030-01-01', kind: 'note', label: 'x' }, 'date-range'],
    [{ at: '2026-08-26', kind: 'launch', label: 'x' }, 'kind'],
    [{ at: '2026-08-26', kind: 'note', label: '   ' }, 'label'],
    [{ at: '2026-08-26', kind: 'note', label: 'x'.repeat(121) }, 'label'],
  ];

  for (const [input, expected] of cases) {
    const parsed = parseAnnotationInput(input, NOW);
    expect(parsed.ok, JSON.stringify(input)).toBe(false);
    if (parsed.ok) continue;
    expect(parsed.error, JSON.stringify(input)).toBe(expected);
  }
});

// Every refusal has to name a key in the message table, or the page renders
// nothing where it should be explaining itself.
test('annotations logic: every refusal code has a message behind it', () => {
  const parsed = parseAnnotationInput({ at: 'nope', kind: 'note', label: 'x' }, NOW);
  expect(parsed.ok).toBe(false);
  if (parsed.ok) return;
  expect(isAnnotationMessage(parsed.error)).toBe(true);
  expect(ANNOTATION_MESSAGES[parsed.error]).toBeTruthy();
});

test('annotations logic: an unrecognised outcome code is not a message', () => {
  expect(isAnnotationMessage('added')).toBe(true);
  expect(isAnnotationMessage('Your session expired, sign in again')).toBe(false);
  expect(isAnnotationMessage(undefined)).toBe(false);
});

// The link is rendered into an href on a page I open every day, so a scheme
// that executes is a stored XSS against the one account that matters.
test('annotations logic: only http, https and local paths are stored as links', () => {
  const ok = (url: string) =>
    parseAnnotationInput({ at: '2026-08-26', kind: 'external', label: 'x', url }, NOW);

  expect(ok('https://news.ycombinator.com/item?id=1').ok).toBe(true);
  expect(ok('http://example.com').ok).toBe(true);
  expect(ok('/posts/2026-06-08-pi-extensions').ok).toBe(true);

  expect(ok('javascript:alert(1)').ok).toBe(false);
  expect(ok('data:text/html,<script>').ok).toBe(false);
  // Protocol-relative: looks like a path, leaves the site.
  expect(ok('//evil.example/phish').ok).toBe(false);
  expect(ok('not a url at all').ok).toBe(false);
  expect(ok(`https://example.com/${'x'.repeat(600)}`).ok).toBe(false);
});
