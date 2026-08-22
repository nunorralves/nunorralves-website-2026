import Link from "next/link";
import Image from "next/image";
import { FeaturedItem } from "lib/types";

export function FeaturedCard({
  kind,
  title,
  description,
  href,
  image,
}: FeaturedItem) {
  return (
    <Link href={href} className='block h-full'>
      <div className='card h-full flex flex-col overflow-hidden hover:shadow-md transition-all'>
        {image && (
          <div className='relative aspect-[16/10] w-full border-b border-[var(--color-border)]'>
            <Image
              src={image}
              alt={`${title} preview`}
              fill
              sizes='(max-width: 640px) 100vw, 33vw'
              className='object-cover'
              // The strip sits above the fold on the landing page, so these
              // must not wait for the lazy-load observer
              priority
            />
          </div>
        )}
        <div className='p-5 flex flex-col'>
          <span className='text-xs uppercase tracking-wide text-[var(--color-secondary)] mb-2'>
            {kind === "project" ? "Project" : "Post"}
          </span>
          <h3 className='text-lg font-bold mb-2 text-[var(--color-foreground)]'>
            {title}
          </h3>
          {description && (
            <p className='text-sm text-[var(--color-secondary)] line-clamp-3'>
              {description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
