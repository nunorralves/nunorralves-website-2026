import Link from "next/link";
import { Calendar } from "lucide-react";
import { PostMetadataWithSlug } from "lib/types";
import { OUTDATED_LISTING_MARKER, isOutdated } from "lib/outdated";

export function PostCard(post: PostMetadataWithSlug) {
  return (
    <article className=' mb-6'>
      <Link href={`/posts/${post.slug}`} className='block postcard'>
        <div className='card p-6 border border-border rounded-lg hover:shadow-md transition-all '>
          <h2 className='text-xl font-bold mb-3 text-foreground'>
            {post.title}
          </h2>
          {post.description && (
            <p className='text-muted-foreground mb-4 line-clamp-2'>
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

            {/* Deliberately the same muted colour as the date rather than a
                badge: the date says when, this says whether it still holds,
                and neither should shout over the title. */}
            {isOutdated(post) && (
              <>
                <span aria-hidden='true'>&middot;</span>
                <span>{OUTDATED_LISTING_MARKER}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
