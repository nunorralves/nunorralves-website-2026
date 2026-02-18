// lib/posts.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Post, PostMetadata, PostMetadataWithSlug } from "./types";

const POSTS_DIRECTORY = path.join(process.cwd(), "content/posts");

export async function getSlugFullPath(slug: string): Promise<string> {
  if (typeof slug !== "string" || slug.length === 0) {
    throw new Error("Invalid slug provided");
  }
  const fullPath = path.join(POSTS_DIRECTORY, `${slug}.mdx`);

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Post not found: ${slug}`);
  }

  return fullPath;
}

export async function getPostsFilenames(): Promise<string[]> {
  // Check if directory exists
  if (!fs.existsSync(POSTS_DIRECTORY)) {
    console.warn("Posts directory does not exist:", POSTS_DIRECTORY);
    return [];
  }

  return fs.readdirSync(POSTS_DIRECTORY);
}

// Get single post by slug
export async function getPostBySlug(slug: string): Promise<Post> {
  const fullPath = await getSlugFullPath(slug);

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug,
    metadata: data as PostMetadata,
    content,
  };
}

// Get all posts with full content (slug, content, frontmatter)
export async function getAllPosts(): Promise<Post[]> {
  const fileNames = await getPostsFilenames();

  const posts = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(".mdx"))
      .map((fileName) => {
        const slug = fileName.replace(/\.mdx$/, "");
        return getPostBySlug(slug);
      }),
  );

  return posts.sort((a, b) => (a.metadata.date < b.metadata.date ? 1 : -1));
}

// Get all posts metadata only (without content - lighter for listing pages)
export async function getAllPostsMetadataWithSlug(): Promise<
  PostMetadataWithSlug[]
> {
  const fileNames = await getPostsFilenames();

  const posts = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(".mdx"))
      .map(async (fileName) => {
        const slug = fileName.replace(/\.mdx$/, "");
        const fullPath = await getSlugFullPath(slug);
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const { data } = matter(fileContents);

        return {
          slug,
          ...(data as PostMetadata),
        };
      }),
  );

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
  // console.log("ORIGINAL: ", groupedPosts);

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

  // console.log("FINAL : ", sortedGroupedPosts);
  return sortedGroupedPosts;
}
