export interface PostMetadata {
  title: string;
  date: Date;
  tags: string[];
  published: boolean;
  description?: string;
  // Opt this post into the home page's "Selected work" strip
  featured?: boolean;
}

export interface PostMetadataWithSlug extends PostMetadata {
  slug: string;
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

// A post or a project reduced to what the home page strip needs to render it
export interface FeaturedItem {
  kind: "post" | "project";
  slug: string;
  title: string;
  description?: string;
  date: Date;
  // False for items that only made the strip through the most-recent fallback
  featured: boolean;
  href: string;
  // Cover image, relative to /public. Projects can carry one; posts cannot.
  image?: string;
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
