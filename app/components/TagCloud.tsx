import Link from "next/link";
import { TagCount } from "lib/types";

// The full cloud is 37 tags and 746px tall on a phone - most of a viewport,
// and 23 of those tags carry exactly one item. Showing the frequent ones and
// folding the long tail keeps the section a filter rather than a wall.
const TAGS_SHOWN = 8;

// <details> rather than useState: this is a server component on an otherwise
// static page, and the native element already handles the keyboard and the
// accessible name. No reason to ship a client bundle for a disclosure.
export function TagCloud({ tags }: { tags: TagCount[] }) {
  if (tags.length === 0) {
    return <p className='font-normal'>No tags found.</p>;
  }

  // getTagCounts sorts by count descending, so the head is the frequent tail-end
  const shown = tags.slice(0, TAGS_SHOWN);
  const rest = tags.slice(TAGS_SHOWN);

  return (
    <>
      <div className='flex flex-wrap gap-3'>
        {shown.map((tag) => (
          <TagPill key={tag.tag} {...tag} />
        ))}
      </div>

      {rest.length > 0 && (
        <details className='mt-4 group'>
          <summary className='cursor-pointer text-sm text-[var(--color-secondary)] hover:text-[var(--color-link)] transition-colors'>
            {/* Both labels render; the open state picks one. A single label
                that flipped text would need state this element does not have. */}
            <span className='group-open:hidden'>
              Show {rest.length} more tags
            </span>
            <span className='hidden group-open:inline'>Show fewer tags</span>
          </summary>

          <div className='flex flex-wrap gap-3 mt-4'>
            {rest.map((tag) => (
              <TagPill key={tag.tag} {...tag} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}

function TagPill({ tag, count }: TagCount) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag)}`}
      className='inline-flex items-center gap-3 px-3 py-1 rounded-full border border-[var(--color-border)] hover:shadow-sm transition-colors'
    >
      <span className='text-[var(--color-foreground)] text-sm'>{tag}</span>
      <span className='text-[var(--color-secondary)] text-xs px-2 py-0.5 rounded-full bg-[var(--color-tag)]'>
        {count}
      </span>
    </Link>
  );
}
