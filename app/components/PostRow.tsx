import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { PostListItem } from "lib/types";
import { OUTDATED_LISTING_MARKER, isOutdated } from "lib/outdated";

// Typographic row for post listings - /blog, tag pages and search results.
// A bordered card gives a 6000 word series entry the same visual weight as a
// four paragraph note from 2020; a hairline row between plain text does not.
export function PostRow(post: PostListItem) {
  return (
    <article className='border-t border-[var(--color-border)] first:border-t-0'>
      <Link href={`/posts/${post.slug}`} className='block postrow py-5'>
        <h2 className='text-lg font-bold mb-1'>{post.title}</h2>
        {post.description && (
          <p className='text-muted-foreground mb-2 line-clamp-2'>
            {post.description}
          </p>
        )}
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground'>
          <time className='flex items-center gap-1'>
            <Calendar className='w-4 h-4' />
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </time>
          <span aria-hidden='true'>&middot;</span>
          <span className='flex items-center gap-1'>
            <Clock className='w-4 h-4' />
            {post.readingTimeMinutes} min read
          </span>

          {/* Same muted colour as the date and reading time rather than a
              badge: this says whether the post still holds, and it should
              not shout over the title. */}
          {isOutdated(post) && (
            <>
              <span aria-hidden='true'>&middot;</span>
              <span>{OUTDATED_LISTING_MARKER}</span>
            </>
          )}
        </div>
      </Link>
    </article>
  );
}
