import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PostCard } from "app/components/PostCard";
import { Pagination } from "app/components/Pagination";
import { TagCloud } from "app/components/TagCloud";
import { getAllPostsMetadataWithSlug, getTagCounts } from "lib/helpers";

// Ten, not five. Five split eleven posts across three pages, which is
// pagination as overhead on a corpus you can read in a sitting.
const POSTS_PER_PAGE = 10;

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Posts on AI coding agents, platform engineering, engineering leadership, and the occasional electronics project.",
  alternates: {
    canonical: "https://nunorralves.pt/blog",
  },
};

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>;
}

// Posts first. This page carried a 37-tag cloud above the cards and a
// by-date index below them, so on a phone the first post sat 1122px down and
// the same posts appeared twice. The index moved to /archive, which is where
// it lived before /blog absorbed it, and the tail of the cloud folds away.
export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { page } = await searchParams;
  const [posts, tags] = await Promise.all([
    getAllPostsMetadataWithSlug(),
    getTagCounts(),
  ]);

  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  // The page number arrives as a raw query string, so clamp it before slicing
  const requestedPage = parseInt(page || "1", 10);
  const currentPage = Number.isNaN(requestedPage)
    ? 1
    : Math.min(Math.max(requestedPage, 1), totalPages);

  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  return (
    <div className='container-page py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>Writing</h1>
        <p className='mb-10 font-normal'>
          Everything I have written here, newest first. Tags cover posts and
          projects alike.
        </p>

        <section className='mb-12'>
          {paginatedPosts.length > 0 ? (
            <>
              {paginatedPosts.map((post) => (
                <PostCard key={post.slug} {...post} />
              ))}

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath='/blog'
                />
              )}
            </>
          ) : (
            <p className='font-normal'>No posts found.</p>
          )}
        </section>

        {/* The dense by-date list, for when you know the post exists and want
            to find it rather than be sold it. */}
        <section className='mb-12'>
          <Link
            href='/archive'
            className='inline-flex items-center gap-1.5 text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
          >
            Browse the full archive by date
            <ArrowRight className='w-4 h-4' />
          </Link>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-4'>Browse by tag</h2>
          <TagCloud tags={tags} />
        </section>
      </div>
    </div>
  );
}
