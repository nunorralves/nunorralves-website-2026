import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  Post,
  PostMetadata,
  PostMetadataWithSlug,
  Project,
  ProjectMetadata,
  ProjectMetadataWithSlug,
  SearchableItem,
} from "./types";

// Resolve a content directory robustly: prefer process.cwd(), fallback to relative path from this file.
function resolveContentDirectory(name: string): string {
  const preferred = path.join(process.cwd(), "content", name);
  if (fs.existsSync(preferred)) return preferred;

  const alt = path.join(__dirname, "..", "content", name);
  if (fs.existsSync(alt)) return alt;

  return preferred;
}

const POSTS_DIRECTORY = resolveContentDirectory("posts");
const PROJECTS_DIRECTORY = resolveContentDirectory("projects");

// Tags are authored by hand and drift in case ("Typescript" vs "typescript"),
// which would otherwise split one topic across two tag pages.
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

export function normalizeTags(tags?: string[]): string[] {
  if (!tags) return [];
  const normalized = tags.map(normalizeTag).filter((t) => t.length > 0);
  return [...new Set(normalized)];
}

async function getSlugFullPathIn(
  directory: string,
  contentName: string,
  slug: string,
): Promise<string> {
  if (typeof slug !== "string" || slug.length === 0) {
    throw new Error("Invalid slug provided");
  }
  const candidates = [];

  // prefer the directory resolved at module load
  candidates.push(path.join(directory, `${slug}.mdx`));

  // try process.cwd() explicit
  candidates.push(path.join(process.cwd(), "content", contentName, `${slug}.mdx`));

  // try relative paths from this file up to a few levels
  for (let i = 1; i <= 4; i++) {
    const up = new Array(i).fill("..").join("/");
    candidates.push(
      path.join(__dirname, up, "content", contentName, `${slug}.mdx`),
    );
  }

  // return first that exists
  for (const fullPath of candidates) {
    if (fs.existsSync(fullPath)) return fullPath;
  }

  throw new Error(`Content not found: ${contentName}/${slug}`);
}

function readFilenames(directory: string, label: string): string[] {
  if (!fs.existsSync(directory)) {
    console.warn(`${label} directory does not exist:`, directory);
    return [];
  }
  return fs.readdirSync(directory).filter((f) => f.endsWith(".mdx"));
}

/* ============================== POSTS ============================== */

export async function getSlugFullPath(slug: string): Promise<string> {
  return getSlugFullPathIn(POSTS_DIRECTORY, "posts", slug);
}

export async function getPostsFilenames(): Promise<string[]> {
  return readFilenames(POSTS_DIRECTORY, "Posts");
}

// Get single post by slug
export async function getPostBySlug(slug: string): Promise<Post> {
  const fullPath = await getSlugFullPath(slug);

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug,
    metadata: {
      ...(data as PostMetadata),
      tags: normalizeTags(data.tags),
    },
    content,
  };
}

// Get all posts with full content (slug, content, frontmatter)
export async function getAllPosts(): Promise<Post[]> {
  const fileNames = await getPostsFilenames();

  const posts = await Promise.all(
    fileNames.map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, "");
      return getPostBySlug(slug);
    }),
  );

  // Filter out unpublished posts (published === false)
  const publishedPosts = posts.filter(
    (p) => (p && p.metadata && p.metadata.published) !== false,
  );

  return publishedPosts.sort((a, b) =>
    a.metadata.date < b.metadata.date ? 1 : -1,
  );
}

// Get all posts metadata only (without content - lighter for listing pages)
export async function getAllPostsMetadataWithSlug(): Promise<
  PostMetadataWithSlug[]
> {
  const fileNames = await getPostsFilenames();

  const posts = (
    await Promise.all(
      fileNames.map(async (fileName) => {
        const slug = fileName.replace(/\.mdx$/, "");
        const fullPath = await getSlugFullPath(slug);
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const { data } = matter(fileContents);

        return {
          slug,
          ...(data as PostMetadata),
          tags: normalizeTags(data.tags),
        };
      }),
    )
  ).filter((p) => p && p.published !== false) as PostMetadataWithSlug[];

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostsGroupedByMonth(): Promise<
  Map<string, Map<string, PostMetadataWithSlug[]>>
> {
  const allPosts = await getAllPostsMetadataWithSlug();
  const groupedPosts = new Map<string, Map<string, PostMetadataWithSlug[]>>();

  allPosts.forEach((post) => {
    const date = new Date(post.date);
    const year = date.getFullYear().toString();
    const month = date.toLocaleString("default", { month: "long" });

    if (!groupedPosts.has(year)) {
      groupedPosts.set(year, new Map());
    }

    if (!groupedPosts.get(year)!.has(month)) {
      groupedPosts.get(year)!.set(month, []);
    }

    groupedPosts.get(year)!.get(month)!.push(post);
  });

  // Sort years descending
  const sortedGroupedPosts = new Map(
    [...groupedPosts.entries()]
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .map(([year, months]) => {
        // Sort months in reverse chronological order
        const sortedMonths = new Map(
          [...months.entries()]
            .sort(([a], [b]) => {
              const dateA = new Date(`${a} 1, ${year}`);
              const dateB = new Date(`${b} 1, ${year}`);
              return dateB.getTime() - dateA.getTime();
            })
            .map(([month, posts]) => [
              month,
              posts.sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              ),
            ]),
        );
        return [year, sortedMonths] as [
          string,
          Map<string, PostMetadataWithSlug[]>,
        ];
      }),
  );

  return sortedGroupedPosts;
}

/* ============================= PROJECTS ============================= */

export async function getProjectSlugFullPath(slug: string): Promise<string> {
  return getSlugFullPathIn(PROJECTS_DIRECTORY, "projects", slug);
}

export async function getProjectsFilenames(): Promise<string[]> {
  return readFilenames(PROJECTS_DIRECTORY, "Projects");
}

// Get single project by slug
export async function getProjectBySlug(slug: string): Promise<Project> {
  const fullPath = await getProjectSlugFullPath(slug);

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug,
    metadata: {
      ...(data as ProjectMetadata),
      tags: normalizeTags(data.tags),
    },
    content,
  };
}

// Get all projects with full content
export async function getAllProjects(): Promise<Project[]> {
  const fileNames = await getProjectsFilenames();

  const projects = await Promise.all(
    fileNames.map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, "");
      return getProjectBySlug(slug);
    }),
  );

  const published = projects.filter(
    (p) => (p && p.metadata && p.metadata.published) !== false,
  );

  return published.sort((a, b) =>
    a.metadata.date < b.metadata.date ? 1 : -1,
  );
}

// Get all projects metadata for listing pages. `hasBody` drives whether a
// /projects/[slug] page exists for the project at all.
export async function getAllProjectsMetadataWithSlug(): Promise<
  ProjectMetadataWithSlug[]
> {
  const projects = await getAllProjects();

  return projects.map((project) => ({
    slug: project.slug,
    ...project.metadata,
    hasBody: project.content.trim().length > 0,
  }));
}

// Projects that should get their own generated detail page
export async function getProjectsWithBody(): Promise<Project[]> {
  const projects = await getAllProjects();
  return projects.filter((p) => p.content.trim().length > 0);
}

/* ============================== SEARCH ============================== */

// One index over posts and projects so /search covers both
export async function getSearchableItems(): Promise<SearchableItem[]> {
  const [posts, projects] = await Promise.all([
    getAllPosts(),
    getAllProjects(),
  ]);

  const postItems: SearchableItem[] = posts.map((post) => ({
    kind: "post",
    slug: post.slug,
    metadata: post.metadata,
    content: post.content,
  }));

  const projectItems: SearchableItem[] = projects.map((project) => ({
    kind: "project",
    slug: project.slug,
    metadata: project.metadata,
    content: project.content,
    hasBody: project.content.trim().length > 0,
  }));

  return [...postItems, ...projectItems].sort((a, b) =>
    a.metadata.date < b.metadata.date ? 1 : -1,
  );
}
