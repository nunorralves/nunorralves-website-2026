// The compact strip across the top: five figures, no chrome, one line each.

export type Stat = {
  label: string;
  value: string;
  /** The change against the previous window, already formatted. */
  delta?: string | null;
  /**
   * Set on any figure that is a sum of per-bucket distinct counts rather than
   * a real distinct count. This is the single most important thing on the
   * page: without it the visitor number is quietly wrong in the flattering
   * direction, and wrong by more the longer the range.
   */
  approximate?: { badge: string; explain: string };
};

export default function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className='grid border-b border-[var(--color-border)] [grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]'>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className='border-r border-[var(--color-border)] px-4 py-3 last:border-r-0'
        >
          <span className='block font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-secondary)]'>
            {stat.label}
          </span>
          <span className='my-1 block font-mono text-xl tabular-nums'>
            {stat.value}
          </span>
          <span className='flex items-center gap-2 font-mono text-[0.65rem] text-[var(--color-secondary)]'>
            {stat.delta ? <span>{stat.delta}</span> : null}
            {stat.approximate ? (
              // `title` rather than a footnote marker: the explanation is one
              // sentence and it belongs on the number it qualifies, not at the
              // bottom of a page nobody scrolls to.
              <abbr
                title={stat.approximate.explain}
                className='rounded-[3px] border border-current px-1 py-px text-[0.55rem] uppercase tracking-[0.06em] no-underline'
              >
                {stat.approximate.badge}
              </abbr>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
