// lib/posts.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Post, PostMetadata, PostMetadataWithSlug } from "./types";

const POSTS_DIRECTORY = path.join(process.cwd(), "content/posts");

export function getSlugFullPath(slug: string) {
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

export function getPostsFilenames() {
  // Check if directory exists
  if (!fs.existsSync(POSTS_DIRECTORY)) {
    console.warn("Posts directory does not exist:", POSTS_DIRECTORY);
    return [];
  }

  return fs.readdirSync(POSTS_DIRECTORY);
}

// Get single post by slug
export function getPostBySlug(slug: string): Post {
  const fullPath = getSlugFullPath(slug);

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug,
    metadata: data as PostMetadata,
    content,
  };
}

// Get all posts with full content (slug, content, frontmatter)
export function getAllPosts(): Post[] {
  const fileNames = getPostsFilenames();

  const posts = fileNames
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, "");
      return getPostBySlug(slug);
    })
    .sort((a, b) => (a.metadata.date < b.metadata.date ? 1 : -1));

  return posts;
}

// Get all posts metadata only (without content - lighter for listing pages)
export function getAllPostsMetadataWithSlug(): PostMetadataWithSlug[] {
  const fileNames = getPostsFilenames();

  return fileNames
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, "");
      const fullPath = getSlugFullPath(slug);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);

      return {
        slug,
        ...(data as PostMetadata),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
