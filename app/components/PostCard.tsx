import Link from "next/link";
import { Calendar } from "lucide-react";
import { PostMetadataWithSlug } from "lib/types";

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
          <div className='flex items-center gap-4 text-sm text-muted-foreground'>
            <time className='flex items-center gap-1'>
              <Calendar className='w-4 h-4' />
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          </div>
        </div>
      </Link>
    </article>
  );
}
