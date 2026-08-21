export interface PostMetadata {
  title: string;
  date: Date;
  tags: string[];
  published: boolean;
  description?: string;
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
