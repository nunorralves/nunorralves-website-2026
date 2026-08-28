import Link from "next/link";
import { Series, seriesTitle } from "lib/series";
import { OUTDATED_LISTING_MARKER, isOutdated } from "lib/outdated";

// One card per series instead of one card per post, so seven posts written
// as sustained work over three months do not read as seven unrelated cards
// in a chronological list. Posts inside a series are excluded from that list
// entirely - see app/blog/page.tsx - so each one appears exactly once.
//
// The block has two modes, and they are the same split as feed versus index.
// /blog passes nothing and gets the index: every part, oldest first, grouped
// under its phase, which is the order the series was written and read in.
// `recent` gets the feed: the newest few parts, newest first, no phases, to
// match the reverse chronological list of everything else beside it on the
// home page.

interface PhaseGroup {
  phase: string | undefined;
  posts: Series["posts"];
}

// Consecutive posts sharing a series_phase collapse into one group, so the
// phase renders once as a subheading rather than once per post. Parts are
// already ordered by series_part, so "consecutive" here means "adjacent in
// the series", not "adjacent in time".
function groupByPhase(posts: Series["posts"]): PhaseGroup[] {
  const groups: PhaseGroup[] = [];

  for (const post of posts) {
    const current = groups[groups.length - 1];
    if (current && current.phase === post.series_phase) {
      current.posts.push(post);
    } else {
      groups.push({ phase: post.series_phase, posts: [post] });
    }
  }

  return groups;
}

interface SeriesBlockProps {
  series: Series;
  // Omitted means the full index. A number means the most recent that many
  // parts, newest first, with the rest linked to /blog.
  recent?: number;
}

export function SeriesBlock({ series, recent }: SeriesBlockProps) {
  const shown =
    recent === undefined ? series.posts : series.posts.slice(-recent).reverse();
  const remaining = series.posts.length - shown.length;

  // Phase headings are dropped in the recent mode on purpose. Phases describe
  // an arc, and a few parts read newest first would print that arc backwards:
  // the Pi series would show "Craft" sitting above "Foundation to Craft
  // transition". Dates read backwards fine because nobody mistakes a list for
  // a story. Phases do not, so they stay on /blog where the whole arc is
  // visible and in order. Two headings over three posts is also more chrome
  // than content.
  const groups =
    recent === undefined
      ? groupByPhase(shown)
      : [{ phase: undefined, posts: shown }];

  // Lowest part number, not oldest date: parts are ordered by series_part, so
  // one published out of turn still counts as the start.
  const first = series.posts[0];

  return (
    <article className='mb-6 card p-6 border border-border rounded-lg'>
      <h3 className='text-xl font-bold mb-4 text-foreground'>
        {seriesTitle(series.id)} series
      </h3>

      {groups.map((group, groupIndex) => (
        <div
          key={group.phase ?? groupIndex}
          className={
            groupIndex > 0
              ? "mt-4 pt-4 border-t border-[var(--color-border)]"
              : undefined
          }
        >
          {group.phase && (
            <h4 className='font-mono text-xs uppercase tracking-wide text-muted-foreground mb-2'>
              {group.phase}
            </h4>
          )}
          <ol className='space-y-3'>
            {group.posts.map((post, postIndex) => (
              <li
                key={post.slug}
                className={
                  postIndex > 0
                    ? "flex flex-wrap items-baseline gap-x-2 pt-3 border-t border-[var(--color-border)]"
                    : "flex flex-wrap items-baseline gap-x-2"
                }
              >
                <span className='text-sm text-muted-foreground'>
                  Part {post.series_part}
                </span>
                <Link
                  href={`/posts/${post.slug}`}
                  className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
                >
                  {post.title}
                </Link>
                {isOutdated(post) && (
                  <>
                    <span aria-hidden='true' className='text-sm text-muted-foreground'>
                      &middot;
                    </span>
                    <span className='text-sm text-muted-foreground'>
                      {OUTDATED_LISTING_MARKER}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}

      {/* Leading with the newest part answers "is this still going", which is
          what the home page is for, but it drops a reader arriving cold into
          the middle of a story. So the tail names the other end: the rest go
          to /blog, and part one gets its own link. */}
      {remaining > 0 && (
        <p className='mt-4 pt-4 border-t border-[var(--color-border)] text-sm text-muted-foreground'>
          <Link
            href='/blog'
            className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
          >
            {remaining} earlier {remaining === 1 ? "part" : "parts"}
          </Link>
          {", starting with "}
          <Link
            href={`/posts/${first.slug}`}
            className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
          >
            {first.title}
          </Link>
        </p>
      )}
    </article>
  );
}
