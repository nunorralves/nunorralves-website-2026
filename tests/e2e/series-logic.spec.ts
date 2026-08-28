import { test, expect } from '@playwright/test';
import { groupIntoSeries, multiPartSeries, seriesPostSlugs } from '../../lib/series';
import { PostMetadataWithSlug } from '../../lib/types';

// Every field the grouping logic ignores gets a fixed value, so each test
// only has to spell out what it is actually asserting on.
function post(overrides: Partial<PostMetadataWithSlug> & { slug: string }): PostMetadataWithSlug {
  return {
    title: overrides.slug,
    date: new Date('2026-01-01'),
    tags: [],
    published: true,
    ...overrides,
  };
}

test('series logic: groups posts sharing a series id', () => {
  const posts = [
    post({ slug: 'a', series: 'pi', series_part: 1 }),
    post({ slug: 'b', series: 'pi', series_part: 2 }),
    post({ slug: 'c' }),
  ];

  const series = groupIntoSeries(posts);

  expect(series).toHaveLength(1);
  expect(series[0].id).toBe('pi');
  expect(series[0].posts.map((p) => p.slug)).toEqual(['a', 'b']);
});

test('series logic: orders posts by series_part regardless of input order', () => {
  const posts = [
    post({ slug: 'part-3', series: 'pi', series_part: 3 }),
    post({ slug: 'part-1', series: 'pi', series_part: 1 }),
    post({ slug: 'part-2', series: 'pi', series_part: 2 }),
  ];

  const series = groupIntoSeries(posts);

  expect(series[0].posts.map((p) => p.slug)).toEqual(['part-1', 'part-2', 'part-3']);
});

test('series logic: a post with no series is left out of every group', () => {
  const posts = [post({ slug: 'standalone' })];

  expect(groupIntoSeries(posts)).toEqual([]);
});

// A hole in the numbering is bad content data, not a rendering decision, so
// this fails loudly rather than rendering a series missing a part.
test('series logic: a series post missing its part number fails the build', () => {
  const posts = [post({ slug: 'a', series: 'pi' })];

  expect(() => groupIntoSeries(posts)).toThrow(/series_part/);
});

test('series logic: two posts claiming the same part fails the build', () => {
  const posts = [
    post({ slug: 'a', series: 'pi', series_part: 1 }),
    post({ slug: 'b', series: 'pi', series_part: 1 }),
  ];

  expect(() => groupIntoSeries(posts)).toThrow(/part 1/);
});

// A series with one part so far has nothing to be grouped with yet, so it
// stays a normal card until a second part gives it a block to join.
test('series logic: multiPartSeries drops a series with only one part', () => {
  const posts = [
    post({ slug: 'solo', series: 'build-a-bench-power-supply', series_part: 1 }),
    post({ slug: 'a', series: 'pi', series_part: 1 }),
    post({ slug: 'b', series: 'pi', series_part: 2 }),
  ];

  const series = multiPartSeries(groupIntoSeries(posts));

  expect(series.map((s) => s.id)).toEqual(['pi']);
});

test('series logic: seriesPostSlugs covers exactly the grouped posts', () => {
  const posts = [
    post({ slug: 'a', series: 'pi', series_part: 1 }),
    post({ slug: 'b', series: 'pi', series_part: 2 }),
    post({ slug: 'c' }),
  ];

  const slugs = seriesPostSlugs(groupIntoSeries(posts));

  expect(slugs).toEqual(new Set(['a', 'b']));
});
