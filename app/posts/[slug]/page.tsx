import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { notFound } from "next/navigation";
// import rehypeMermaid from "rehype-mermaid";
import { getAllPosts, getAllSeries, getPostBySlug } from "lib/helpers";
import { Calendar, Clock, Tag } from "lucide-react";
import { Post } from "lib/types";
import { authorRef, PERSON_NAME, PROFILES } from "lib/person";
import { getOutdatedNotice } from "lib/outdated";
import { getReadingTimeMinutes } from "lib/reading-time";
import { OutdatedNotice } from "app/components/OutdatedNotice";
import { SeriesBreadcrumb, SeriesNav } from "app/components/SeriesNav";
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

  // Computed from the body on every build rather than authored in
  // frontmatter, so it can never drift from what the post actually says.
  const readingTimeMinutes = getReadingTimeMinutes(post.content);

  // A series of one has nothing to be grouped with yet - same rule
  // app/blog/page.tsx uses for the series block, see lib/series.ts. An
  // unpublished post carrying a series field will not be found in the
  // group either, since it is built from published posts only.
  const rawSeries = post.metadata.series
    ? (await getAllSeries()).find((s) => s.id === post.metadata.series)
    : undefined;
  const series =
    rawSeries && rawSeries.posts.length > 1 ? rawSeries : undefined;
  const seriesIndex = series
    ? series.posts.findIndex((p) => p.slug === slug)
    : -1;

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
        {series && seriesIndex >= 0 && (
          <SeriesBreadcrumb series={series} currentIndex={seriesIndex} />
        )}

        <h1 className='text-3xl font-bold mb-4'>{post.metadata.title}</h1>

        {post.metadata.description && (
          <p className='font-serif text-lg leading-snug text-[var(--color-secondary)] mb-6'>
            {post.metadata.description}
          </p>
        )}

        <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
          <time className='flex items-center gap-1'>
            <Calendar className='w-4 h-4' />
            {new Date(post.metadata.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>

          <span className='flex items-center gap-1'>
            <Clock className='w-4 h-4' />
            {readingTimeMinutes} min read
          </span>

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

      {series && seriesIndex >= 0 && (
        <SeriesNav series={series} currentIndex={seriesIndex} />
      )}

      <p className='mt-12 pt-6 border-t border-border text-sm text-[var(--color-secondary)]'>
        Written by{" "}
        <Link
          href='/about'
          className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
        >
          {PERSON_NAME}
        </Link>
        , who is also reachable by{" "}
        <a
          href={`mailto:${PROFILES.email}`}
          className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
        >
          email
        </a>
        .
      </p>
    </article>
  );
}
