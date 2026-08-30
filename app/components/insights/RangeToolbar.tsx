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
};

export default function RangeToolbar({
  active,
  dimension,
  custom,
  syncedNote,
}: RangeToolbarProps) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3'>
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

      <span className='font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-secondary)]'>
        {syncedNote}
      </span>
    </div>
  );
}
