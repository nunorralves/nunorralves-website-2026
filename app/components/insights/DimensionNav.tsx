import Link from "next/link";

// The sidebar. Two groups, because where a number comes from changes how far
// it can be trusted: the Vercel half only goes back to the first nightly sync
// and is truncated past 100 values per bucket, and the beacon half exists at
// all only for the things Vercel will not answer on a Hobby plan. Labelling
// the source is not decoration, it is the caveat.

export type NavItem = {
  key: string;
  label: string;
  /** The count beside the label, or null for a view that has no count. */
  count: string | null;
};

export type NavGroup = { title: string; items: NavItem[] };

type DimensionNavProps = {
  groups: NavGroup[];
  active: string;
  /** Carried through every link so changing dimension keeps the range. */
  query: string;
};

export default function DimensionNav({
  groups,
  active,
  query,
}: DimensionNavProps) {
  return (
    <nav
      aria-label='Dimensions'
      className='border-b border-[var(--color-border)] py-4 md:border-r md:border-b-0'
    >
      {groups.map((group) => (
        <div key={group.title} className='mb-5 last:mb-0'>
          <span className='mb-2 block px-4 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-secondary)]'>
            {group.title}
          </span>
          {group.items.map((item) => {
            const on = item.key === active;
            return (
              <Link
                key={item.key}
                href={`/insights?${query}&dim=${item.key}`}
                aria-current={on ? "page" : undefined}
                className={`flex items-center justify-between gap-2 border-l-2 px-4 py-[0.35rem] text-[0.82rem] transition-colors ${
                  on
                    ? "border-[var(--color-link)] text-foreground"
                    : "border-transparent text-[var(--color-secondary)] hover:text-foreground"
                }`}
              >
                <span>{item.label}</span>
                <span className='font-mono text-[0.65rem] text-[var(--color-secondary)]'>
                  {item.count ?? "-"}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
