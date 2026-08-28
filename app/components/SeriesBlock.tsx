import Link from "next/link";
import { Series } from "lib/series";
import { OUTDATED_LISTING_MARKER, isOutdated } from "lib/outdated";

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

export function SeriesBlock({ series }: { series: Series }) {
  const groups = groupByPhase(series.posts);

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
    </article>
  );
}
