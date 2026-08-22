import Link from "next/link";
import { FeaturedItem } from "lib/types";

export function FeaturedCard({ kind, title, description, href }: FeaturedItem) {
  return (
    <Link href={href} className='block h-full'>
      <div className='card p-5 h-full flex flex-col hover:shadow-md transition-all'>
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
    </Link>
  );
}
