import { subDays, subMonths, subWeeks } from "date-fns";
import { BACKFILL_DAYS, DIMENSIONS, GRAINS, type Grain } from "./config";
import { getSql } from "./db";
import { fetchAggregate, type AggregateRow } from "./vercel-api";

/**
 * How far back to re-read for a given grain.
 *
 * Always at least two buckets, because the newest bucket is by definition
 * still open and its numbers will change before the day, week or month is
 * over. For days we go back further still: Hobby crons run once a day with up
 * to an hour of slop, and a run that fails leaves a hole that can never be
 * filled once it falls outside Vercel's 30 day window. Re-reading a week
 * means six consecutive failures are needed before anything is lost for good.
 */
function windowFor(grain: Grain, now: Date): { since: Date; until: Date } {
  switch (grain) {
    case "day":
      return { since: subDays(now, BACKFILL_DAYS), until: now };
    case "week":
      return { since: subWeeks(now, 2), until: now };
    case "month":
      return { since: subMonths(now, 2), until: now };
  }
}

async function upsertTotals(grain: Grain, rows: AggregateRow[]) {
  if (rows.length === 0) return 0;
  const sql = getSql();

  // One multi-row statement rather than a query per row. Every call to Neon's
  // HTTP driver is a separate round trip, and a nightly run touches a few
  // hundred rows, so the difference is a second against several minutes.
  await sql`
    insert into vercel_totals (grain, bucket, pageviews, visitors)
    select ${grain}, unnest(${rows.map((r) => r.bucket)}::date[]),
           unnest(${rows.map((r) => r.pageviews)}::int[]),
           unnest(${rows.map((r) => r.visitors)}::int[])
    on conflict (grain, bucket) do update
      set pageviews = excluded.pageviews,
          visitors  = excluded.visitors,
          fetched_at = now()
  `;
  return rows.length;
}

async function upsertBreakdown(
  grain: Grain,
  dimension: string,
  rows: AggregateRow[],
) {
  if (rows.length === 0) return 0;
  const sql = getSql();

  await sql`
    insert into vercel_breakdown (grain, bucket, dimension, value, pageviews, visitors)
    select ${grain}, unnest(${rows.map((r) => r.bucket)}::date[]), ${dimension},
           unnest(${rows.map((r) => r.value ?? "(none)")}::text[]),
           unnest(${rows.map((r) => r.pageviews)}::int[]),
           unnest(${rows.map((r) => r.visitors)}::int[])
    on conflict (grain, bucket, dimension, value) do update
      set pageviews = excluded.pageviews,
          visitors  = excluded.visitors,
          fetched_at = now()
  `;
  return rows.length;
}

export type SyncReport = {
  rowsWritten: number;
  queries: number;
  errors: string[];
};

/**
 * Pull the rolling window from Vercel into Neon.
 *
 * Every write is an upsert keyed on the bucket, so running this twice in a row
 * changes nothing. That is what makes the retry-heavy approach above safe.
 */
export async function syncFromVercel(now = new Date()): Promise<SyncReport> {
  const report: SyncReport = { rowsWritten: 0, queries: 0, errors: [] };

  for (const grain of GRAINS) {
    const { since, until } = windowFor(grain, now);

    // Site wide totals first. These are the only figures immune to the 100 row
    // "Others" truncation that applies to every dimension below, which makes
    // them the ones the dashboard quotes as headline numbers.
    try {
      report.queries += 1;
      const rows = await fetchAggregate({ grain, since, until });
      report.rowsWritten += await upsertTotals(grain, rows);
    } catch (error) {
      report.errors.push(`totals/${grain}: ${(error as Error).message}`);
    }

    for (const dimension of DIMENSIONS) {
      try {
        report.queries += 1;
        const rows = await fetchAggregate({ grain, dimension, since, until });
        report.rowsWritten += await upsertBreakdown(grain, dimension, rows);
      } catch (error) {
        // One bad dimension must not abandon the other twenty three queries.
        // A partial sync still moves history forward, and the next run
        // re-reads the same window anyway.
        report.errors.push(`${dimension}/${grain}: ${(error as Error).message}`);
      }
    }
  }

  return report;
}
