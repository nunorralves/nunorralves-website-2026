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
