export interface PostMetadata {
  title: string;
  date: Date;
  tags: string[];
  published: boolean;
  description?: string;
  // Opt this post into the home page's "Selected work" strip
  featured?: boolean;
  // Age notice above the post body. `false` suppresses it, `true` forces it
  // on regardless of age, omitted lets the date decide. See lib/outdated.ts
  outdated?: boolean;
  // Custom notice text replacing the generic age wording. Inline markdown,
  // links included, rendered through the same MDX pipeline as the post body
  outdatedNote?: string;
  // Groups this post with others sharing the same value into a series. See
  // lib/series.ts for how a series is assembled and ordered.
  series?: string;
  // Order within the series. Required whenever `series` is set.
  series_part?: number;
  // Where the series is at when this part was written, e.g. "Foundation" or
  // "Craft". Free text, shown next to the post inside its series block.
  series_phase?: string;
}

export interface PostMetadataWithSlug extends PostMetadata {
  slug: string;
}

// A listing post with its reading time attached. Kept separate from
// PostMetadataWithSlug rather than folding readingTimeMinutes into it,
// because the base type is also what raw frontmatter-only fixtures (tests,
// the series/corrections helpers) construct, and none of those have a post
// body to time.
export interface PostListItem extends PostMetadataWithSlug {
  readingTimeMinutes: number;
}

export interface Post {
  slug: string;
  metadata: PostMetadata;
  content: string;
}

export type ProjectStatus = "active" | "maintained" | "archived" | "on-hold";

export interface ProjectMetadata {
  title: string;
  date: Date;
  tags: string[];
  published: boolean;
  description?: string;
  // Optional cover image, relative to /public (e.g. /images/projects/foo/cover.png)
  image?: string;
  // Optional source repository URL
  repo?: string;
  // Optional live site / app URL
  demo?: string;
  // Only rendered when set - "active" is the default assumption and adds no signal
  status?: ProjectStatus;
  // Slug of an existing blog post that serves as this project's write-up
  post?: string;
  // Opt this project into the home page's "Selected work" strip
  featured?: boolean;
}

export interface ProjectMetadataWithSlug extends ProjectMetadata {
  slug: string;
  // True when the .mdx file has a body, which is what generates /projects/[slug]
  hasBody: boolean;
}

export interface Project {
  slug: string;
  metadata: ProjectMetadata;
  content: string;
}

// A post or a project reduced to what the home page's Selected work section
// needs to render it as a typographic entry
export interface FeaturedItem {
  kind: "post" | "project";
  slug: string;
  title: string;
  description?: string;
  date: Date;
  // False for items that only made the strip through the most-recent fallback
  featured: boolean;
  href: string;
  tags: string[];
  // Posts have no status; only rendered when a project sets one
  status?: ProjectStatus;
}

// One tag and how many posts plus projects carry it, after normalization
export interface TagCount {
  tag: string;
  count: number;
}

// Unified shape for the search index so posts and projects can share one Fuse instance
export type SearchableItem =
  | { kind: "post"; slug: string; metadata: PostMetadata; content: string }
  | {
      kind: "project";
      slug: string;
      metadata: ProjectMetadata;
      content: string;
      hasBody: boolean;
    };
