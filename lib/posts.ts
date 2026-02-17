// lib/posts.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";

console.log('Current working directory:', process.cwd());
const postsDirectory = path.join(process.cwd(), "content/posts");
console.log('Posts directory:', postsDirectory);

export interface PostFrontmatter {
  title: string;
  date: Date;
  tags: string[]
  published: boolean;
  description?: string;
}

export interface Post {
  slug: string;
  content: string;
  frontmatter: PostFrontmatter;
}

// Get single post by slug
export function getPostBySlug(slug: string): Post {
  const fullPath = path.join(postsDirectory, `${slug}.mdx`)

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Post not found: ${slug}`)
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)
  
  return {
    slug,
    content,
    frontmatter: data as PostFrontmatter,
  }
}

// Get all posts with full content (slug, content, frontmatter)
export function getAllPostsWithContent(): Post[] {
    // Check if directory exists
  if (!fs.existsSync(postsDirectory)) {
    console.warn('Posts directory does not exist:', postsDirectory)
    return []
  }
  
  const fileNames = fs.readdirSync(postsDirectory)
  
  const posts = fileNames
    .filter(fileName => fileName.endsWith('.mdx'))
    .map(fileName => {
      const slug = fileName.replace(/\.mdx$/, '')
      return getPostBySlug(slug)
    })
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? 1 : -1))
  
  return posts
}

// Get all posts metadata only (without content - lighter for listing pages)
export function getAllPostsMeta() {
    // Check if directory exists
  if (!fs.existsSync(postsDirectory)) {
    console.warn('Posts directory does not exist:', postsDirectory)
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)
  
  return fileNames
    .filter(fileName => fileName.endsWith('.mdx'))
    .map(fileName => {
      const slug = fileName.replace(/\.mdx$/, '')
      const fullPath = path.join(postsDirectory, `${slug}.mdx`)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data } = matter(fileContents)
      
      return { 
        slug, 
        ...data as PostFrontmatter 
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getAllPosts() {
    // Check if directory exists
  if (!fs.existsSync(postsDirectory)) {
    console.warn('Posts directory does not exist:', postsDirectory)
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory);

  return fileNames
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, "");
      const { frontmatter } = getPostBySlug(slug);
      return { slug, ...frontmatter };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

