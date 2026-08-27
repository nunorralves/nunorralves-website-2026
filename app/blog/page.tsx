import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "app/components/PostCard";
import { Pagination } from "app/components/Pagination";
import {
  getAllPostsMetadataWithSlug,
  getPostsGroupedByMonth,
  getTagCounts,
} from "lib/helpers";
import { PostMetadataWithSlug } from "lib/types";

const POSTS_PER_PAGE = 5;

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

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { page } = await searchParams;
  const [posts, postsByMonth, tags] = await Promise.all([
    getAllPostsMetadataWithSlug(),
    getPostsGroupedByMonth(),
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
    <div className='mx-auto w-2/3 py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>Writing</h1>
        <p className='mb-10 font-normal'>
          Everything I have written here, newest first, plus the full index by
          date. Tags cover posts and projects alike.
        </p>

        <section className='mb-12'>
          <h2 className='text-xl font-semibold mb-4'>Browse by tag</h2>
          {tags.length === 0 ? (
            <p className='font-normal'>No tags found.</p>
          ) : (
            <div className='flex flex-wrap gap-3'>
              {tags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className='inline-flex items-center gap-3 px-3 py-1 rounded-full border border-[var(--color-border)] hover:shadow-sm transition-colors'
                >
                  <span className='text-[var(--color-foreground)] text-sm'>
                    {tag}
                  </span>
                  <span className='text-[var(--color-secondary)] text-xs px-2 py-0.5 rounded-full bg-[var(--color-tag)]'>
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className='mb-12'>
          <h2 className='text-xl font-semibold mb-4'>Recent posts</h2>
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

        <section>
          <h2 className='text-xl font-semibold mb-4'>All posts by date</h2>
          {postsByMonth.size > 0 ? (
            <div className='space-y-8'>
              {[...postsByMonth.entries()].map(([year, months]) => (
                <div key={year} className='space-y-4'>
                  <h3 className='text-lg font-semibold'>{year}</h3>

                  {[...months.entries()].map(([month, monthPosts]) => (
                    <div
                      key={month}
                      className='pl-4 border-l border-[var(--color-border)]'
                    >
                      <h4 className='text-base font-medium text-[var(--color-secondary)] mb-2'>
                        {month} ({monthPosts.length})
                      </h4>

                      <ul className='space-y-2'>
                        {monthPosts.map((post: PostMetadataWithSlug) => (
                          <li key={post.slug}>
                            <Link
                              href={`/posts/${post.slug}`}
                              className='text-[var(--color-foreground)] hover:text-[var(--color-link)] transition-colors'
                            >
                              {post.title}
                            </Link>
                            <span className='text-sm text-[var(--color-secondary)] ml-2'>
                              (
                              {new Date(post.date).toLocaleDateString("en-US", {
                                day: "numeric",
                              })}
                              )
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className='font-normal'>No posts found.</p>
          )}
        </section>
      </div>
    </div>
  );
}
