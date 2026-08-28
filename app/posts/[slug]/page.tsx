import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
// import rehypeMermaid from "rehype-mermaid";
import { getAllPosts, getPostBySlug } from "lib/helpers";
import { Calendar, Tag } from "lucide-react";
import { Post } from "lib/types";
import { authorRef } from "lib/person";
import { getOutdatedNotice } from "lib/outdated";
import { OutdatedNotice } from "app/components/OutdatedNotice";
import mdxComponents from "mdx-components";

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// Mirrors app/projects/[slug]/page.tsx: params is always a Promise in Next 16,
// and an unknown slug throws out of getPostBySlug rather than returning null.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  let post: Post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    return { title: "Post", description: "Post details" };
  }

  const title = post.metadata.title;
  const description = post.metadata.description || title;
  const date = new Date(post.metadata.date).toISOString();
  const canonicalUrl = `https://nunorralves.pt/posts/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      url: canonicalUrl,
      title,
      description,
      type: "article",
      publishedTime: date,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PostLayout({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // A slug with no .mdx behind it is a 404, not a 500. Without this it threw
  // into error.tsx, which is a server error page and tells crawlers to retry.
  let post: Post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    notFound();
  }

  const canonicalUrl = `https://nunorralves.pt/posts/${slug}`;

  // Deliberately kept out of the metadata and the JSON-LD below: the notice
  // is for humans who land on an old post, and these posts should keep ranking.
  const outdatedNotice = getOutdatedNotice(post.metadata);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    headline: post.metadata.title,
    description: post.metadata.description || post.metadata.title,
    datePublished: new Date(post.metadata.date).toISOString(),
    author: authorRef,
    url: canonicalUrl,
  };

  return (
    <article className='container-prose py-8'>
      <header className='mb-12'>
        <h1 className='text-3xl font-bold mb-4'>{post.metadata.title}</h1>

        <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
          <time className='flex items-center gap-1'>
            <Calendar className='w-4 h-4' />
            {new Date(post.metadata.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>

          {post.metadata.tags && post.metadata.tags.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {post.metadata.tags.map((tag) => (
                <span
                  key={tag}
                  className='flex items-center gap-1 tag px-2 py-0.5 rounded-md'
                >
                  <Tag className='w-3 h-3' />
                  <span className='text-xs'>{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {outdatedNotice && <OutdatedNotice notice={outdatedNotice} />}

      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className='prose max-w-none'>
        <MDXRemote
          source={post.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [
                [
                  rehypePrettyCode,
                  {
                    // theme: "github-dark",
                    theme: "one-dark-pro",
                    keepBackground: false,
                  },
                ],
                // rehypeMermaid,
              ],
            },
          }}
        />
      </div>
    </article>
  );
}
