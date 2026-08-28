import { test, expect } from '@playwright/test';
import { getCorrections } from '../../lib/corrections';
import { PostMetadataWithSlug } from '../../lib/types';

function post(overrides: Partial<PostMetadataWithSlug> & { slug: string }): PostMetadataWithSlug {
  return {
    title: overrides.slug,
    date: new Date('2026-01-01'),
    tags: [],
    published: true,
    ...overrides,
  };
}

test('corrections logic: a note puts a post in "no longer holds"', () => {
  const posts = [post({ slug: 'a', outdatedNote: 'Covers an old API.' })];

  const { noLongerHolds, stillStands } = getCorrections(posts);

  expect(noLongerHolds.map((p) => p.slug)).toEqual(['a']);
  expect(stillStands).toEqual([]);
});

test('corrections logic: outdated false puts a post in "still stands"', () => {
  const posts = [post({ slug: 'a', outdated: false })];

  const { noLongerHolds, stillStands } = getCorrections(posts);

  expect(stillStands.map((p) => p.slug)).toEqual(['a']);
  expect(noLongerHolds).toEqual([]);
});

// Mirrors getOutdatedNotice: an empty note is not a correction, it is
// nothing left behind, so it should not land in either group.
test('corrections logic: an empty note lands in neither group', () => {
  const posts = [post({ slug: 'a', outdatedNote: '   ' })];

  const { noLongerHolds, stillStands } = getCorrections(posts);

  expect(noLongerHolds).toEqual([]);
  expect(stillStands).toEqual([]);
});

test('corrections logic: a post with neither field lands in neither group', () => {
  const posts = [post({ slug: 'a' })];

  const { noLongerHolds, stillStands } = getCorrections(posts);

  expect(noLongerHolds).toEqual([]);
  expect(stillStands).toEqual([]);
});

test('corrections logic: outdated true alone is not a correction either way', () => {
  const posts = [post({ slug: 'a', outdated: true })];

  const { noLongerHolds, stillStands } = getCorrections(posts);

  expect(noLongerHolds).toEqual([]);
  expect(stillStands).toEqual([]);
});

test('corrections logic: groups posts independently, not mutually exclusively', () => {
  const posts = [
    post({ slug: 'note-only', outdatedNote: 'Something changed.' }),
    post({ slug: 'suppressed-only', outdated: false }),
    post({ slug: 'neither' }),
  ];

  const { noLongerHolds, stillStands } = getCorrections(posts);

  expect(noLongerHolds.map((p) => p.slug)).toEqual(['note-only']);
  expect(stillStands.map((p) => p.slug)).toEqual(['suppressed-only']);
});
