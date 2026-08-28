import { CURRENTLY, STANDING_LINE, REVIEWED } from "lib/now";

// The lead's right column. Ordered by how durable each field is: the job
// changes rarely, what I am thinking about drifts over quarters, and what I
// am building is the one that turns over fastest. See lib/now.ts for why
// this is the only hand-typed data on the page and how it is kept honest.
export function CurrentlyRail() {
  const reviewedLabel = new Date(REVIEWED).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });

  return (
    <aside className='lg:border-l border-[var(--color-border)] lg:pl-8'>
      <h2 className='font-mono text-xs uppercase tracking-widest text-muted-foreground pb-2 border-b border-[var(--color-border)] mb-3'>
        Currently
      </h2>
      <dl className='text-sm'>
        {CURRENTLY.map((field) => (
          <div key={field.label} className='mt-4 first:mt-0'>
            <dt className='font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground'>
              {field.label}
            </dt>
            <dd className='font-serif text-[0.95rem] leading-snug text-[var(--color-secondary)] mt-1'>
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className='mt-4 font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground'>
        Reviewed {reviewedLabel}
      </p>
      <p className='mt-5 pt-4 border-t border-[var(--color-border)] font-serif italic text-[0.95rem] leading-snug text-[var(--color-secondary)]'>
        {STANDING_LINE}
      </p>
    </aside>
  );
}
