import { WorkEntry } from "./components/WorkEntry";
import { CorrectionsStrip } from "./components/CorrectionsStrip";
import { CurrentlyRail } from "./components/CurrentlyRail";
import { SeriesBlock } from "./components/SeriesBlock";
import Link from "next/link";
import { SocialLinks } from "./components/SocialLinks";
import {
  getAllPostsMetadataWithSlug,
  getFeaturedItems,
  getAllSeries,
  getAllCorrections,
} from "../lib/helpers";
import { multiPartSeries, seriesPostSlugs } from "../lib/series";
import { isOutdated, OUTDATED_LISTING_MARKER } from "../lib/outdated";

// How many non-series posts show in the flat "everything else" list before a
// reader has to go to /blog for the rest.
const WRITING_LIST_LIMIT = 5;

// The home page is a map, /blog is the index. Uncapped, the Pi series alone
// puts seven parts in the left column against five posts in the right, and a
// twelve part series would take the page over. Both caps link the remainder
// to /blog, where every series still renders in full.
const HOME_SERIES_LIMIT = 2;
const HOME_SERIES_PARTS = 3;

export default async function Home() {
  const [featured, posts, series, corrections] = await Promise.all([
    getFeaturedItems(3),
    getAllPostsMetadataWithSlug(),
    getAllSeries(),
    getAllCorrections(),
  ]);

  // A series post lives inside its block, below, and nowhere else on this
  // page - same rule /blog follows, so a part never renders twice.
  const blockedSeries = multiPartSeries(series);
  // Every series post is excluded from "everything else", including the ones
  // whose block the cap below leaves off this page. A part that surfaced
  // loose because its series did not fit is the exact thing the block exists
  // to prevent.
  const blockedSlugs = seriesPostSlugs(blockedSeries);
  const shownSeries = blockedSeries.slice(0, HOME_SERIES_LIMIT);
  const everythingElse = posts
    .filter((post) => !blockedSlugs.has(post.slug))
    .slice(0, WRITING_LIST_LIMIT);

  return (
    <div className='container-page py-8'>
      <div className='bg-background text-foreground'>
        <div className='grid gap-y-8 gap-x-12 lg:grid-cols-[1fr_18rem] py-4 mb-12'>
          <div>
            <h1 className='mb-4 text-3xl font-black'>
              LinkedIn is the record. This is the other half.
            </h1>
            {/* The distinction leads and the job qualifies it underneath,
                rather than the other way around - opening with the title and
                tenure buried the actual point of the page below the fold, and
                the title already lives on /about anyway. */}
            <p className='mb-6 text-lg'>
              This site is the workshop, not the CV. I build agent systems and
              small tools here, and write about what actually breaks when you
              do.
            </p>
            <p className='mb-6 pt-4 border-t border-[var(--color-border)] font-normal text-[var(--color-secondary)]'>
              Engineering leader. Twenty-five years in software, twenty of
              them leading teams, currently Senior Director of Engineering,
              Platform at Entrust in identity verification.
            </p>
            <p className='mb-6'>
              <Link
                href='/about'
                className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
              >
                More about me and how I got here
              </Link>
            </p>
            <div className='pt-2'>
              <SocialLinks />
            </div>
          </div>

          <CurrentlyRail />
        </div>

        {featured.length > 0 && (
          <section className='mb-12'>
            <div className='flex items-baseline justify-between gap-4 mb-4'>
              <h2 className='text-xl font-semibold'>Selected work</h2>
              <Link
                href='/projects'
                className='text-sm text-[var(--color-secondary)] hover:text-foreground transition-colors'
              >
                All projects
              </Link>
            </div>
            <div className='grid sm:grid-cols-2 gap-x-8'>
              {featured.map((item) => (
                <WorkEntry key={`${item.kind}-${item.slug}`} {...item} />
              ))}
            </div>
          </section>
        )}

        {/* Its own block, not part of Selected work. Corrections is about
            posts and has nothing to do with `featured: true`, so nesting it
            in that section meant unsetting the last featured item would have
            silently taken this with it. It renders unwrapped because it
            returns null when there is nothing to correct. */}
        <CorrectionsStrip {...corrections} />

        {(blockedSeries.length > 0 || everythingElse.length > 0) && (
          <section>
            <div className='flex items-baseline justify-between gap-4 mb-4'>
              <h2 className='text-xl font-semibold'>Writing</h2>
              <Link
                href='/blog'
                className='text-sm text-[var(--color-secondary)] hover:text-foreground transition-colors'
              >
                All {posts.length} posts
              </Link>
            </div>
            <div className='grid md:grid-cols-2 gap-x-10 gap-y-8 items-start'>
              <div>
                {shownSeries.map((s) => (
                  <SeriesBlock
                    key={s.id}
                    series={s}
                    maxParts={HOME_SERIES_PARTS}
                  />
                ))}
              </div>
              <div>
                <h3 className='font-mono text-xs uppercase tracking-wide text-muted-foreground mb-3'>
                  Everything else
                </h3>
                {everythingElse.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/posts/${post.slug}`}
                    className='block py-3 border-t border-[var(--color-border)] first:border-t-0 first:pt-0 group'
                  >
                    <div className='font-serif text-base leading-snug group-hover:text-[var(--color-link)] transition-colors'>
                      {post.title}
                    </div>
                    <div className='font-mono text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap'>
                      <time>
                        {new Date(post.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                        })}
                      </time>
                      {isOutdated(post) && <span>{OUTDATED_LISTING_MARKER}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
