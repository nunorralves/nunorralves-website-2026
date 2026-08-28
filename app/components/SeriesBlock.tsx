import Link from "next/link";
import { Series } from "lib/series";

// One card per series instead of one card per post, so seven posts written
// as sustained work over three months do not read as seven unrelated cards
// in a chronological list. Posts inside a series are excluded from that list
// entirely - see app/blog/page.tsx - so each one appears exactly once.
function seriesTitle(id: string): string {
  return id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function SeriesBlock({ series }: { series: Series }) {
  return (
    <article className='mb-6 card p-6 border border-border rounded-lg'>
      <h3 className='text-xl font-bold mb-4 text-foreground'>
        {seriesTitle(series.id)} series
      </h3>
      <ol className='space-y-3'>
        {series.posts.map((post) => (
          <li key={post.slug} className='flex flex-wrap items-baseline gap-x-2'>
            <span className='text-sm text-muted-foreground'>
              Part {post.series_part}
            </span>
            <Link
              href={`/posts/${post.slug}`}
              className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
            >
              {post.title}
            </Link>
            {post.series_phase && (
              <span className='text-sm text-muted-foreground'>
                &middot; {post.series_phase}
              </span>
            )}
          </li>
        ))}
      </ol>
    </article>
  );
}
