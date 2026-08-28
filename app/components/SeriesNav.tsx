import Link from "next/link";
import { Series, seriesTitle } from "lib/series";

// Rendered on /posts/[slug] only, for a post whose series has a second part
// to be grouped with - see app/posts/[slug]/page.tsx, which is also where
// currentIndex is computed so neither component has to search for itself.
interface SeriesNavProps {
  series: Series;
  currentIndex: number;
}

// Above the title: which series this post belongs to and how far into it
// the reader is. The "part X of Y" here counts position in the published
// group, not the raw series_part value - a series missing a part in the
// middle would otherwise show something like "part 7 of 4".
export function SeriesBreadcrumb({ series, currentIndex }: SeriesNavProps) {
  const total = series.posts.length;

  return (
    <div className='flex flex-wrap items-center gap-3 mb-4 font-mono text-xs text-[var(--color-secondary)]'>
      <span>
        <Link
          href='/blog'
          className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
        >
          {seriesTitle(series.id)}
        </Link>
        {`, part ${currentIndex + 1} of ${total}`}
      </span>
      <span className='flex gap-1' aria-hidden='true'>
        {series.posts.map((post, index) => (
          <span
            key={post.slug}
            className={`inline-block w-3 h-[3px] rounded-full ${
              index === currentIndex
                ? "bg-[var(--color-link)]"
                : index < currentIndex
                  ? "bg-[var(--color-secondary)]"
                  : "bg-[var(--color-border)]"
            }`}
          />
        ))}
      </span>
    </div>
  );
}

// After the body: the whole series in order, plus previous and next. "Part
// N" here is the raw series_part, matching SeriesBlock's own listing on
// /blog - a reader jumping between the two should see the same numbering.
export function SeriesNav({ series, currentIndex }: SeriesNavProps) {
  const prev = currentIndex > 0 ? series.posts[currentIndex - 1] : undefined;
  const next =
    currentIndex < series.posts.length - 1
      ? series.posts[currentIndex + 1]
      : undefined;

  return (
    <nav
      aria-label={`${seriesTitle(series.id)} series`}
      className='mt-12 card p-6 border border-border rounded-lg'
    >
      <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-4'>
        <h2 className='text-lg font-semibold text-foreground'>
          {seriesTitle(series.id)} series
        </h2>
        <Link
          href='/blog'
          className='font-mono text-xs text-[var(--color-secondary)] hover:text-foreground transition-colors whitespace-nowrap'
        >
          All {series.posts.length} parts &rarr;
        </Link>
      </div>

      <ol className='space-y-2'>
        {series.posts.map((post, index) => {
          const isCurrent = index === currentIndex;
          return (
            <li
              key={post.slug}
              className={
                index > 0 ? "pt-2 border-t border-border" : undefined
              }
            >
              <span className='text-sm text-[var(--color-secondary)] mr-2'>
                Part {post.series_part}
              </span>
              {isCurrent ? (
                <span className='font-serif font-semibold text-foreground'>
                  {post.title}
                </span>
              ) : (
                <Link
                  href={`/posts/${post.slug}`}
                  className='font-serif text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
                >
                  {post.title}
                </Link>
              )}
              {isCurrent && (
                <span className='ml-2 font-mono text-[0.65rem] uppercase tracking-wide text-[var(--color-secondary)]'>
                  you are here
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {(prev || next) && (
        <div className='grid sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border'>
          {prev && (
            <Link
              href={`/posts/${prev.slug}`}
              className='block hover:opacity-80 transition-opacity'
            >
              <div className='font-mono text-[0.65rem] uppercase tracking-wide text-[var(--color-secondary)] mb-1'>
                Previously
              </div>
              <div className='font-serif text-foreground'>{prev.title}</div>
            </Link>
          )}
          {next && (
            <Link
              href={`/posts/${next.slug}`}
              className='block sm:text-right hover:opacity-80 transition-opacity'
            >
              <div className='font-mono text-[0.65rem] uppercase tracking-wide text-[var(--color-secondary)] mb-1'>
                Next in series
              </div>
              <div className='font-serif text-foreground'>{next.title}</div>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
