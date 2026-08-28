import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPostsGroupedByMonth } from "lib/helpers";
import { PostMetadataWithSlug } from "lib/types";
import { OUTDATED_LISTING_MARKER, isOutdated } from "lib/outdated";

// This index used to sit at the bottom of /blog, below the post cards and a
// 37-tag cloud, which put the first actual post 1122px down a 812px phone
// screen. It also duplicated the card list above it - the same posts, twice,
// on one page. Back at its own URL it can grow without crowding anything, and
// /blog gets one job.
//
// /archive was a permanent redirect to /blog until this page existed. Some
// browsers and crawlers will have that 308 cached for a while yet.

export const metadata: Metadata = {
  title: "Archive",
  description: "Every post on nunorralves.pt, grouped by year and month.",
  alternates: {
    canonical: "https://nunorralves.pt/archive",
  },
};

export default async function ArchivePage() {
  const postsByMonth = await getPostsGroupedByMonth();

  return (
    <div className='container-page py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>Archive</h1>
        <p className='mb-10 font-normal'>
          Every post, grouped by month, newest first. For descriptions and
          the tag filter, see{" "}
          <Link
            href='/blog'
            className='text-[var(--color-link)] hover:text-[var(--color-link-hover)]'
          >
            Writing
          </Link>
          .
        </p>

        {postsByMonth.size > 0 ? (
          <div className='space-y-8'>
            {[...postsByMonth.entries()].map(([year, months]) => (
              <div key={year} className='space-y-4'>
                <h2 className='text-lg font-semibold'>{year}</h2>

                {[...months.entries()].map(([month, monthPosts]) => (
                  <div
                    key={month}
                    className='pl-4 border-l border-[var(--color-border)]'
                  >
                    <h3 className='text-base font-medium text-[var(--color-secondary)] mb-2'>
                      {month} ({monthPosts.length})
                    </h3>

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

                          {isOutdated(post) && (
                            <span className='text-sm text-[var(--color-secondary)] ml-2'>
                              <span aria-hidden='true'>&middot;</span>{" "}
                              {OUTDATED_LISTING_MARKER}
                            </span>
                          )}
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

        <Link
          href='/blog'
          className='project-back inline-flex items-center gap-1.5 mt-12 text-sm transition-colors'
        >
          <ArrowLeft className='w-4 h-4' />
          Back to Writing
        </Link>
      </div>
    </div>
  );
}
