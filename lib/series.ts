import type { PostMetadataWithSlug } from "./types";

// Type-only import and no `fs`, deliberately: a series block could end up
// rendered from the same place PostRow does. Same constraint as
// lib/outdated.ts and lib/links.ts.

export interface Series {
  // The frontmatter `series` value, e.g. "pi"
  id: string;
  // Ordered by series_part ascending
  posts: PostMetadataWithSlug[];
}

// The frontmatter id, humanised for display - "pi" becomes "Pi", "build-a-
// bench-power-supply" becomes "Build A Bench Power Supply". Shared by the
// blog listing's series block and the post page's breadcrumb and series nav,
// so the two can never describe the same series under different names.
export function seriesTitle(id: string): string {
  return id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Groups posts sharing a `series` value, ordered by `series_part`. Order
// comes entirely from that field, never from date, so a part written and
// published out of turn still lands where it belongs in the series.
//
// Throws rather than silently dropping a post: a series post missing its
// part number, or two posts in one series claiming the same part, is bad
// content data, and a build should fail loudly rather than render a series
// with a hole or a collision in it.
export function groupIntoSeries(posts: PostMetadataWithSlug[]): Series[] {
  const bySeriesId = new Map<string, PostMetadataWithSlug[]>();

  for (const post of posts) {
    if (!post.series) continue;

    if (post.series_part === undefined || post.series_part === null) {
      throw new Error(
        `Post "${post.slug}" has series "${post.series}" but no series_part`,
      );
    }

    const group = bySeriesId.get(post.series) ?? [];
    group.push(post);
    bySeriesId.set(post.series, group);
  }

  return [...bySeriesId.entries()].map(([id, seriesPosts]) => {
    const seenParts = new Set<number>();
    for (const post of seriesPosts) {
      const part = post.series_part!;
      if (seenParts.has(part)) {
        throw new Error(`Series "${id}" has two posts claiming part ${part}`);
      }
      seenParts.add(part);
    }

    return {
      id,
      posts: [...seriesPosts].sort((a, b) => a.series_part! - b.series_part!),
    };
  });
}

// A series of one is just a post that happens to carry a `series` field: it
// has nothing to be grouped with yet, so it renders as a normal card rather
// than a block with one entry in it. Once a second part ships, both move
// into the block together.
export function multiPartSeries(series: Series[]): Series[] {
  return series.filter((s) => s.posts.length > 1);
}

// Slugs that render inside a series block, so a plain chronological list can
// exclude them and never show the same post loose above the block it is
// already sitting in.
export function seriesPostSlugs(series: Series[]): Set<string> {
  return new Set(series.flatMap((s) => s.posts.map((p) => p.slug)));
}
