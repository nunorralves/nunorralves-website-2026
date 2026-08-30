import {
  differenceInCalendarDays,
  endOfMonth,
  isSameDay,
  startOfMonth,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import type { Grain } from "./config";

// Pure date logic, deliberately free of any database or fetch import so the
// tests can exercise it without a connection. Same reasoning as lib/links.ts
// and lib/outdated.ts keeping clear of `fs`.

export const RANGE_PRESETS = [
  "1d",
  "7d",
  "30d",
  "3m",
  "6m",
  "1y",
  "all",
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number];

export const RANGE_LABELS: Record<RangePreset, string> = {
  "1d": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
  "3m": "3 months",
  "6m": "6 months",
  "1y": "12 months",
  all: "All time",
};

export type DateRange = { from: Date; to: Date };

// The day the mirror starts from for "all time". Nothing predates the first
// cron run, and Vercel could never have told us about it anyway.
const EPOCH = new Date("2020-01-01T00:00:00.000Z");

export function resolveRange(preset: RangePreset, now: Date): DateRange {
  const to = now;
  switch (preset) {
    case "1d":
      return { from: subDays(now, 1), to };
    case "7d":
      return { from: subDays(now, 7), to };
    case "30d":
      return { from: subDays(now, 30), to };
    case "3m":
      return { from: subMonths(now, 3), to };
    case "6m":
      return { from: subMonths(now, 6), to };
    case "1y":
      return { from: subYears(now, 1), to };
    case "all":
      return { from: EPOCH, to };
  }
}

/**
 * Which stored grain to draw the chart from.
 *
 * This is presentation only. A year of daily bars is 365 slivers nobody can
 * read, and a month of monthly bars is one bar, so the bucket size follows the
 * span. It has nothing to do with whether the visitor count is exact, which is
 * `exactVisitorBucket` below.
 */
export function pickGrain(range: DateRange): Grain {
  const days = differenceInCalendarDays(range.to, range.from);
  if (days <= 90) return "day";
  if (days <= 370) return "week";
  return "month";
}

/**
 * Whether this range's unique visitor count can be stated as a fact.
 *
 * The trap this exists to avoid: `visitors` is a distinct count, so it does
 * not add up. Someone who reads the site on ten days is ten daily visitors but
 * one monthly visitor. Summing buckets therefore always overstates uniques,
 * and it overstates them more the longer the range, which is exactly backwards
 * from what a reader assumes a chart is telling them.
 *
 * Summing months is no better than summing days, so the only ranges with an
 * honest unique count are the ones that are precisely one stored bucket. This
 * returns that bucket when there is one, and null when the number on screen
 * has to be labelled as a sum of per-bucket uniques instead.
 */
export function exactVisitorBucket(
  range: DateRange,
): { grain: Grain; bucket: string } | null {
  const { from, to } = range;

  if (isSameDay(from, to)) {
    return { grain: "day", bucket: toIsoDate(from) };
  }

  if (
    isSameDay(from, startOfMonth(from)) &&
    isSameDay(to, endOfMonth(from))
  ) {
    return { grain: "month", bucket: toIsoDate(from) };
  }

  return null;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parsePreset(value: string | undefined): RangePreset {
  return (RANGE_PRESETS as readonly string[]).includes(value ?? "")
    ? (value as RangePreset)
    : "30d";
}

/**
 * Parse a custom `from`/`to` pair out of the query string.
 *
 * Returns null unless both sides are real dates in the right order, so a
 * mangled URL falls back to the preset rather than rendering an empty chart
 * that looks like a traffic collapse.
 */
export function parseCustomRange(
  from: string | undefined,
  to: string | undefined,
): DateRange | null {
  if (!from || !to) return null;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.valueOf()) || Number.isNaN(toDate.valueOf())) {
    return null;
  }
  if (fromDate > toDate) return null;
  return { from: fromDate, to: toDate };
}
