import Link from "next/link";
import { RANGE_PRESETS, type RangePreset } from "lib/analytics/ranges";

// The presets, and the custom range that has to sit beside them.
//
// Every control on this page is a link or a plain form. There is no state to
// hold, because the range and the dimension are both in the URL, which also
// means a particular view can be bookmarked and comes back identical.

// Shorter than RANGE_LABELS, which is prose for the eyebrow above the
// conclusion. On a row of eight buttons "24h" beats "24 hours".
const SHORT: Record<RangePreset, string> = {
  "1d": "24h",
  "7d": "7d",
  "30d": "30d",
  "3m": "3m",
  "6m": "6m",
  "1y": "12m",
  all: "All",
};

type RangeToolbarProps = {
  /** The active preset, or null while a custom range is in force. */
  active: RangePreset | null;
  /** Carried through every link so changing the range keeps the dimension. */
  dimension: string;
  custom: { from: string; to: string } | null;
  syncedNote: string;
  /**
   * What the mirror actually holds inside the selected range, which is not the
   * range itself. A 12 month window on a database that started in February is
   * seven months of nothing followed by seven months of data, and the chart
   * cannot say so: an empty stretch at the left edge looks exactly like a
   * period with no traffic. This is the line that tells the two apart, and it
   * moves with the range for the same reason every other figure here does.
   */
  coverageNote: string;
};

export default function RangeToolbar({
  active,
  dimension,
  custom,
  syncedNote,
  coverageNote,
}: RangeToolbarProps) {
  return (
    // Two rows rather than one. The controls and the actions share the top
    // line, and the coverage note sits underneath the controls on its own.
    <div className='border-b border-[var(--color-border)] px-4 py-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-1'>
          {RANGE_PRESETS.map((preset) => {
            const on = preset === active;
            return (
              <Link
                key={preset}
                href={`/insights?range=${preset}&dim=${dimension}`}
                aria-current={on ? "true" : undefined}
                className={`rounded-md border px-2 py-1 font-mono text-[0.7rem] transition-colors ${
                  on
                    ? "border-[var(--color-link)] text-[var(--color-link)]"
                    : "border-transparent text-[var(--color-secondary)] hover:border-[var(--color-border)] hover:text-foreground"
                }`}
              >
                {SHORT[preset]}
              </Link>
            );
          })}

          {/* A GET form, so submitting it produces the same shareable URL the
              preset links do. `from` and `to` are re-parsed server side, and a
              mangled pair falls back to the preset rather than rendering an
              empty chart that looks like a traffic collapse. */}
          <form
            action='/insights'
            method='get'
            className='ml-2 flex flex-wrap items-center gap-1'
          >
            <input type='hidden' name='dim' value={dimension} />
            <label htmlFor='from' className='sr-only'>
              Custom range start
            </label>
            <input
              id='from'
              type='date'
              name='from'
              defaultValue={custom?.from}
              className='rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 font-mono text-[0.7rem]'
            />
            <label htmlFor='to' className='sr-only'>
              Custom range end
            </label>
            <input
              id='to'
              type='date'
              name='to'
              defaultValue={custom?.to}
              className='rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 font-mono text-[0.7rem]'
            />
            <button
              type='submit'
              aria-current={custom ? "true" : undefined}
              className={`rounded-md border px-2 py-1 font-mono text-[0.7rem] transition-colors ${
                custom
                  ? "border-[var(--color-link)] text-[var(--color-link)]"
                  : "border-[var(--color-border)] text-[var(--color-secondary)] hover:text-foreground"
              }`}
            >
              Custom
            </button>
          </form>
        </div>

        {/* Where the data came from and what you can do about it: which
            environment, a copy of it, and the way out. The coverage note used
            to sit in here too, and four items was one too many - the cluster
            wrapped and pushed the synced note onto a line of its own, where it
            read like a stray caption rather than the status of the page. */}
        <div className='flex items-center gap-3'>
          <span className='font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-secondary)]'>
            {syncedNote}
          </span>

          {/* A plain anchor, not next/link: this is a file download, and
              routing a navigation that ends in a Content-Disposition is the
              wrong tool. A GET, and safe as one, because it only reads - which
              is also why there is no restore button beside it. Restore writes
              to every table at once, and behind one password a leaked cookie
              would become arbitrary database writes; it stays a script that
              needs a terminal and the connection string. */}
          <a
            href='/insights/backup'
            download
            className='rounded-md border border-[var(--color-border)] px-2 py-1 font-mono text-[0.65rem] text-[var(--color-secondary)] no-underline transition-colors hover:border-[var(--color-link)] hover:text-[var(--color-link)]'
          >
            Download backup
          </a>

          {/* A form, not a link. Signing out changes state, and a GET that
              changes state gets fetched by prefetchers and link previews,
              which is a silly way to lose a session. */}
          <form action='/api/insights/logout' method='post'>
            <button
              type='submit'
              className='rounded-md border border-[var(--color-border)] px-2 py-1 font-mono text-[0.65rem] text-[var(--color-secondary)] transition-colors hover:border-[var(--color-link)] hover:text-[var(--color-link)]'
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Under the range controls, because it is an answer to them. The range
          says what was asked for and this says what there was to give, so the
          two only make sense read together: up in the corner it was a fact
          about the site, down here it is a caveat on the numbers below. */}
      <p className='mt-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-secondary)]'>
        {coverageNote}
      </p>
    </div>
  );
}
