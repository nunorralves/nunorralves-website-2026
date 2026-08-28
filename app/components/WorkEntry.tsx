import Link from "next/link";
import { FeaturedItem } from "lib/types";
import { STATUS_LABELS } from "./ProjectCard";

// Typographic entry for the home page's Selected work section: no cover
// image, no card shadow, nothing that needs an asset the content might not
// have. A post and a project render identically here - the tags line already
// tells them apart well enough that a "Post"/"Project" label would be noise.
export function WorkEntry({ title, description, href, status, tags }: FeaturedItem) {
  return (
    <Link href={href} className='block py-5 border-t border-[var(--color-border)] group'>
      <div className='flex items-baseline gap-3 flex-wrap mb-1'>
        <h3 className='font-serif text-lg font-semibold text-foreground group-hover:text-[var(--color-link)] transition-colors'>
          {title}
        </h3>
        {status && (
          <span className='font-mono text-[0.65rem] uppercase tracking-wide px-1.5 py-0.5 border border-[var(--color-border)] rounded text-muted-foreground whitespace-nowrap'>
            {STATUS_LABELS[status]}
          </span>
        )}
      </div>
      {description && (
        <p className='font-serif text-[0.99rem] leading-relaxed text-[var(--color-secondary)]'>
          {description}
        </p>
      )}
      {tags.length > 0 && (
        <div className='mt-2 font-mono text-xs text-muted-foreground'>
          {tags.slice(0, 3).join(" · ")}
        </div>
      )}
    </Link>
  );
}
