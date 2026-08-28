import Link from "next/link";
import { Corrections } from "lib/corrections";

// A compact strip between Selected work and Writing rather than a section of
// its own: this is a practice, not a confession, and a full section would
// overstate it. It owns its bottom margin so the home page can drop it in
// unwrapped and lose the spacing too when there is nothing to show. Both
// lines build themselves from lib/corrections.ts, so a post can only land
// here by frontmatter saying so, never by anyone editing this file.
export function CorrectionsStrip({ noLongerHolds, stillStands }: Corrections) {
  if (noLongerHolds.length === 0 && stillStands.length === 0) return null;

  return (
    <div className='mb-12 card p-5'>
      <h3 className='font-serif text-lg font-semibold mb-2 text-foreground'>
        Corrections
      </h3>
      <p className='font-serif text-[0.95rem] text-[var(--color-secondary)] mb-4 max-w-xl'>
        Old posts keep their URL and carry a note about what has changed
        since. This list builds itself from that note - I do not maintain it,
        I just have to be willing to write it.
      </p>
      <div className='space-y-3 text-sm'>
        {noLongerHolds.length > 0 && (
          <p>
            <span className='font-mono text-xs uppercase tracking-wide text-muted-foreground mr-2'>
              No longer holds
            </span>
            {noLongerHolds.map((post, i) => (
              <span key={post.slug}>
                {i > 0 && ", "}
                <Link
                  href={`/posts/${post.slug}`}
                  className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
                >
                  {post.title}
                </Link>
              </span>
            ))}
          </p>
        )}
        {stillStands.length > 0 && (
          <p>
            <span className='font-mono text-xs uppercase tracking-wide text-muted-foreground mr-2'>
              Still stands
            </span>
            {stillStands.map((post, i) => (
              <span key={post.slug}>
                {i > 0 && ", "}
                <Link
                  href={`/posts/${post.slug}`}
                  className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
                >
                  {post.title}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
