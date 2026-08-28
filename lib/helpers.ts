import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  Post,
  PostMetadata,
  PostMetadataWithSlug,
  PostListItem,
  Project,
  ProjectMetadata,
  ProjectMetadataWithSlug,
  SearchableItem,
  TagCount,
  FeaturedItem,
} from "./types";
import { getProjectDetailHref } from "./links";
import { groupIntoSeries, Series } from "./series";
import { getCorrections, Corrections } from "./corrections";
import { getReadingTimeMinutes } from "./reading-time";

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

// Get all posts metadata (without the body itself, but with reading time
// computed from it) - lighter for listing pages than a full getAllPosts.
// matter() already parses the file's content alongside its frontmatter, so
// timing it here costs nothing extra and means no listing page ever reads a
// post file twice just to know how long it takes to read.
export async function getAllPostsMetadataWithSlug(): Promise<PostListItem[]> {
  const fileNames = await getPostsFilenames();

  const posts = (
    await Promise.all(
      fileNames.map(async (fileName) => {
        const slug = fileName.replace(/\.mdx$/, "");
        const fullPath = await getSlugFullPath(slug);
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const { data, content } = matter(fileContents);

        return {
          slug,
          ...(data as PostMetadata),
          tags: normalizeTags(data.tags),
          readingTimeMinutes: getReadingTimeMinutes(content),
        };
      }),
    )
  ).filter((p) => p && p.published !== false) as PostListItem[];

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

/* =============================== SERIES =============================== */

// Every post grouped into its series, part order preserved. The grouping and
// validation logic itself lives in lib/series.ts and takes plain data, so it
// can be unit tested without touching the filesystem.
export async function getAllSeries(): Promise<Series[]> {
  const posts = await getAllPostsMetadataWithSlug();
  return groupIntoSeries(posts);
}

/* ============================= CORRECTIONS ============================= */

// Posts grouped by what their own frontmatter already says about whether
// they still hold up. See lib/corrections.ts.
export async function getAllCorrections(): Promise<Corrections> {
  const posts = await getAllPostsMetadataWithSlug();
  return getCorrections(posts);
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

/* ============================== FEATURED ============================== */

// Posts and projects carrying `featured: true` in frontmatter, newest first.
// With nothing flagged this falls back to the most recent of either kind, so
// the home page strip is never empty and never needs a slug hardcoded into it.
export async function getFeaturedItems(limit = 3): Promise<FeaturedItem[]> {
  const [posts, projects] = await Promise.all([
    getAllPostsMetadataWithSlug(),
    getAllProjectsMetadataWithSlug(),
  ]);

  const items: FeaturedItem[] = [
    ...posts.map((post) => ({
      kind: "post" as const,
      slug: post.slug,
      title: post.title,
      description: post.description,
      date: post.date,
      featured: post.featured === true,
      href: `/posts/${post.slug}`,
      tags: post.tags,
    })),
    ...projects.map((project) => ({
      kind: "project" as const,
      slug: project.slug,
      title: project.title,
      description: project.description,
      date: project.date,
      featured: project.featured === true,
      // A project with neither a write-up nor a body still has the listing
      href: getProjectDetailHref(project) ?? "/projects",
      tags: project.tags,
      status: project.status,
    })),
  ];

  const flagged = items.filter((item) => item.featured);
  const pool = flagged.length > 0 ? flagged : items;

  // Compare on timestamps: post frontmatter carries a mix of quoted strings
  // and bare YAML dates, so `<` would compare a Date against a string here.
  return pool
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

/* =============================== TAGS =============================== */

// Counts are computed from the normalized tags, so "Typescript" and
// "typescript" land on the same entry rather than splitting the count.
export async function getTagCounts(): Promise<TagCount[]> {
  const [posts, projects] = await Promise.all([
    getAllPostsMetadataWithSlug(),
    getAllProjectsMetadataWithSlug(),
  ]);

  const counts = [...posts, ...projects].reduce<Record<string, number>>(
    (acc, item) => {
      if (!item.tags) return acc;
      item.tags.forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    },
    {},
  );

  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
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
