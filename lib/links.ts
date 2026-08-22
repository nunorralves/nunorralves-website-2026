import { ProjectMetadataWithSlug } from "./types";

// Kept out of helpers.ts, which imports fs: ProjectCard renders inside the
// client-side SearchBar, so anything it imports ends up in the browser bundle.

// Where a project points, in priority order:
//   1. an existing blog post that serves as the write-up
//   2. its own generated page, when the .mdx has a body
//   3. nowhere - the card already says everything
export function getProjectDetailHref(
  project: ProjectMetadataWithSlug,
): string | null {
  if (project.post) return `/posts/${project.post}`;
  if (project.hasBody) return `/projects/${project.slug}`;
  return null;
}
