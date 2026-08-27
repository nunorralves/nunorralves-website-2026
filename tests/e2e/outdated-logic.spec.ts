import { test, expect } from '@playwright/test';
import { OUTDATED_AFTER_YEARS, getOutdatedNotice } from '../../lib/outdated';

// The automatic age branch has no live post behind it: every pre-2022 post
// carries an explicit note or an explicit opt-out, and everything else is from
// 2026. It is still the default for every post written from here, so it gets
// covered directly rather than through a page. Passing an explicit `now` also
// keeps these stable as the calendar moves, which a page test would not be.
const NOW = new Date('2026-08-27T00:00:00Z');

function yearsBefore(years: number, days = 0): Date {
  const date = new Date(NOW);
  date.setFullYear(date.getFullYear() - years);
  date.setDate(date.getDate() - days);
  return date;
}

test('outdated logic: fires once a post is past the threshold', () => {
  const notice = getOutdatedNotice(
    { date: yearsBefore(OUTDATED_AFTER_YEARS, 1) },
    NOW,
  );

  expect(notice?.isCustom).toBe(false);
  expect(notice?.text).toMatch(/^This post is from \d{4} and may be out of date\.$/);
});

test('outdated logic: silent one day short of the threshold', () => {
  expect(getOutdatedNotice({ date: yearsBefore(OUTDATED_AFTER_YEARS, -1) }, NOW)).toBeNull();
});

test('outdated logic: generic wording names the year of the post', () => {
  const notice = getOutdatedNotice({ date: new Date('2020-11-02') }, NOW);
  expect(notice?.text).toBe('This post is from 2020 and may be out of date.');
});

test('outdated logic: a note replaces the generic wording', () => {
  const notice = getOutdatedNotice(
    { date: new Date('2020-11-02'), outdatedNote: 'Covers Next.js 10.' },
    NOW,
  );

  expect(notice).toEqual({ text: 'Covers Next.js 10.', isCustom: true });
});

test('outdated logic: outdated false suppresses an old post', () => {
  expect(getOutdatedNotice({ date: new Date('2021-03-27'), outdated: false }, NOW)).toBeNull();
});

// Otherwise removing a note would silently fall back to the generic wording
// on a post that was explicitly opted out of having one.
test('outdated logic: outdated false outranks a note left behind', () => {
  const notice = getOutdatedNotice(
    { date: new Date('2020-11-02'), outdated: false, outdatedNote: 'Stale note.' },
    NOW,
  );

  expect(notice).toBeNull();
});

test('outdated logic: outdated true fires on a post inside the threshold', () => {
  const notice = getOutdatedNotice({ date: new Date('2026-07-04'), outdated: true }, NOW);

  expect(notice).toEqual({
    text: 'This post is from 2026 and may be out of date.',
    isCustom: false,
  });
});

test('outdated logic: an empty note falls back rather than rendering blank', () => {
  const notice = getOutdatedNotice(
    { date: new Date('2020-11-02'), outdatedNote: '   ' },
    NOW,
  );

  expect(notice?.isCustom).toBe(false);
});
