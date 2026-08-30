import { differenceInCalendarDays, format, isSameDay } from "date-fns";

// Presentation only, and pure, so the dashboard components stay about layout.
// Kept here rather than beside the components because it is ordinary logic
// with edge cases worth testing, and tests in this repo cannot import a .tsx.

export function formatCount(value: number): string {
  return value.toLocaleString("en-GB");
}

/**
 * Milliseconds as "3m 12s", the way a reading time is spoken.
 *
 * Under a minute drops the minutes entirely: "0m 48s" reads like a stopwatch,
 * and the figure it describes is how long somebody stayed on a page.
 */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "-";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/** A 0..1 ratio as a percentage. Null renders as "-", never as 0%. */
export function formatRatio(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

/** An already-percentage figure, as median_scroll is stored. */
export function formatPercentPoints(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}%`;
}

/**
 * A delta against the previous window, as the small line under a figure.
 *
 * The arrow carries the direction and the text stays the same colour as
 * everything else. Green up and red down is the default in every dashboard and
 * it is a claim this one cannot support: fewer visitors on a week I published
 * nothing is not a failure, and the palette has no colour for "good" anyway.
 */
export function formatDelta(
  current: number,
  previous: number | null,
): string | null {
  if (previous === null || previous === 0) return null;
  const change = (current - previous) / previous;
  if (Math.abs(change) < 0.005) return "level";
  const arrow = change > 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(change * 100).toFixed(1)}%`;
}

/**
 * When the nightly job last wrote, phrased the way I would say it out loud.
 *
 * A bare timestamp is the wrong shape for this: the only question it answers
 * is "is this stale", and "03:14 today" answers that at a glance where
 * "2026-08-30T03:14:22Z" needs arithmetic.
 */
export function formatSyncedAt(at: Date | null, now = new Date()): string {
  if (!at || Number.isNaN(at.valueOf())) return "never";
  if (isSameDay(at, now)) return `${format(at, "HH:mm")} today`;
  const days = differenceInCalendarDays(now, at);
  if (days === 1) return `${format(at, "HH:mm")} yesterday`;
  return format(at, "d MMM 'at' HH:mm");
}

/** The range as a human sentence for the eyebrow above the conclusion. */
export function formatRangeLabel(from: Date, to: Date): string {
  const days = Math.max(1, differenceInCalendarDays(to, from));
  return `${days} ${days === 1 ? "day" : "days"} to ${format(to, "d MMMM yyyy")}`;
}

/**
 * A chart bucket as an axis label. Days inside a month need no year, and a
 * month bucket should not read as the first of the month.
 */
export function formatBucket(bucket: string, grain: string): string {
  const date = new Date(`${bucket}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return bucket;
  if (grain === "month") return format(date, "MMM yyyy");
  return format(date, "d MMM");
}

/**
 * A delta between two rates, in percentage points.
 *
 * Bounce moving from 49% to 46% is three points, not six percent. Reporting it
 * as a percentage of a percentage is the classic way a dashboard makes a small
 * change look like a large one.
 */
export function formatDeltaPoints(
  current: number | null,
  previous: number | null,
): string | null {
  if (current === null || previous === null) return null;
  const change = (current - previous) * 100;
  if (Math.abs(change) < 0.05) return "level";
  return `${change > 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(1)}pp`;
}

/** A delta between two durations, said in whole seconds. */
export function formatDeltaDuration(
  currentMs: number | null,
  previousMs: number | null,
): string | null {
  if (currentMs === null || previousMs === null) return null;
  const seconds = Math.round((currentMs - previousMs) / 1000);
  if (seconds === 0) return "level";
  return `${seconds > 0 ? "▲" : "▼"} ${Math.abs(seconds)}s`;
}

/**
 * The stretch of history actually behind the numbers on screen.
 *
 * Distinct from the range, and that distinction is the whole reason it is on
 * the page. Asking for 12 months on a mirror that started in February gives a
 * chart with seven empty months on the left, and an empty stretch looks
 * exactly like a period with no traffic rather than like a period before any
 * was recorded. This is the one line that tells those apart, and it moves with
 * the range because the answer to "what have you got" depends on what you
 * asked for.
 *
 * Dates in, as the YYYY-MM-DD strings the queries return, so this never
 * touches a Date that a timezone could shift by a day.
 */
export function formatCoverage(
  first: string | null,
  last: string | null,
): string {
  if (!first || !last) return "no data stored";

  const from = new Date(`${first}T00:00:00Z`);
  const to = new Date(`${last}T00:00:00Z`);
  if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf())) {
    return "no data stored";
  }

  if (first === last) return `data ${format(to, "d MMM yyyy")}`;

  // Both years, always, even when they are the same one. Dropping the first is
  // the tidier typography and it costs the reader the one thing this line is
  // for: on All time a bare "31 Jul" carries no clue whether the mirror starts
  // this year or three back, and the reader has to reach the far end of the
  // sentence and assume the years match to find out. Four characters is a
  // cheap price for a line nobody has to reason about.
  return `data ${format(from, "d MMM yyyy")} to ${format(to, "d MMM yyyy")}`;
}

/**
 * A round number at or above a peak, divisible into `divisions` equal steps.
 *
 * Scaling straight to the peak puts the top gridline on whatever the busiest
 * day happened to be, and labelling four gridlines off 1,873 gives 468, 937,
 * 1,405 - numbers nobody can hold in their head or compare to the next range's.
 * Rounding the step up to 1, 2, 2.5, 5 or 10 times a power of ten buys ticks
 * you can read at a glance for a little empty space at the top, which is the
 * trade every axis worth having makes. The 2.5 earns its place: without it a
 * peak of 81 has to climb from a step of 20 to one of 50 and the axis tops out
 * at 200, which draws a busy month as a line hugging the floor.
 *
 * The step is rounded to a whole number, and floored at 1, because every
 * figure on this page is a count and a y axis labelled 0.25 would be
 * describing a quarter of a page view. Rounding cannot drop the ceiling below
 * the peak: the only fractional candidates are the 2.5s, which land on a half
 * and so round up, and anything small enough to round to zero came from a peak
 * already below the number of divisions.
 */
export function axisCeiling(peak: number, divisions: number): number {
  if (!Number.isFinite(peak) || peak <= 0) return divisions;
  const rough = peak / divisions;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10]
      .map((multiple) => multiple * magnitude)
      .find((candidate) => candidate >= rough - 1e-9) ?? magnitude * 10;
  return Math.max(1, Math.round(step)) * divisions;
}
