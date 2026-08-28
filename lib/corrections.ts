import type { PostMetadataWithSlug } from "./types";

// Type-only import and no `fs`, deliberately: same constraint as
// lib/outdated.ts and lib/links.ts.

export interface Corrections {
  // Posts saying plainly what has changed since they were written
  noLongerHolds: PostMetadataWithSlug[];
  // Posts the author deliberately marked as still current
  stillStands: PostMetadataWithSlug[];
}

// Two groups pulled from fields the age notice already reads, not a second
// opinion layered on top: an `outdatedNote` is the author saying what broke,
// and `outdated: false` is the author saying the opposite. Nothing here is
// hand-curated - add or remove a post from either group by editing the same
// frontmatter that already drives lib/outdated.ts, not this file.
export function getCorrections(posts: PostMetadataWithSlug[]): Corrections {
  return {
    noLongerHolds: posts.filter(
      (post) => (post.outdatedNote ?? "").trim().length > 0,
    ),
    stillStands: posts.filter((post) => post.outdated === false),
  };
}
