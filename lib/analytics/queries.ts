import { subDays } from "date-fns";
import {
  RAW_EVENT_RETENTION_DAYS,
  type Dimension,
  type Grain,
} from "./config";
import type {
  Annotation,
  AnnotationKind,
  AnnotationSource,
} from "./annotations";
import { asRows, getSql, type Row } from "./db";
import { toIsoDate, type DateRange } from "./ranges";

// Every read the dashboard makes, in one place, and nothing else. No React, no
// formatting, no date arithmetic: the ranges come in already resolved by
// lib/analytics/ranges.ts and go out as plain numbers.
//
// Two rules hold everywhere below.
//
// Everything is parameterised, including the values that come from an enum
// this file controls. `dimension` is narrowed to the Dimension union before it
// gets here and could technically be interpolated, but a union is a compile
// time promise and the query is a runtime one, and the day somebody widens the
// type to `string` for a quick experiment should not be the day this becomes
// an injection.
//
// Nothing calls getSql() until it is called itself. The handle is lazy for the
// build's sake (see lib/analytics/db.ts) and that only holds if no read is
// hoisted to module scope.

function bounds(range: DateRange): [string, string] {
  return [toIsoDate(range.from), toIsoDate(range.to)];
}

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * A `date` column as the YYYY-MM-DD string the rest of the code assumes.
 *
 * The trap, which cost a rendering bug that nothing failed on: the driver
 * parses a `date` into a JS Date at *local* midnight, so `String(row.bucket)`
 * is "Sun Aug 30 2026 00:00:00 GMT+0100 (Western European Summer Time)" and
 * slicing ten characters off it yields "Sun Aug 30". That is not a date any
 * parser accepts, so every axis label and tooltip silently fell back to
 * printing the mangled string.
 *
 * Every query below now casts to ::text in SQL, which is both timezone proof
 * and cheaper than a round trip through Date. This exists for the case where
 * one is missed: toISOString would shift a local-midnight Date back a day in
 * any timezone east of UTC, so the parts are read locally.
 */
export function toBucketString(value: unknown): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

// Postgres hands back integers as numbers but bigints (count(*), sum()) as
// strings over the HTTP driver, and a null for an empty aggregate. This keeps
// that from leaking into arithmetic in the page.
function maybe(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// Source A: the Vercel mirror
// ---------------------------------------------------------------------------

export type SeriesPoint = {
  bucket: string;
  pageviews: number;
  visitors: number;
};

/**
 * The chart's series, one row per stored bucket.
 *
 * A range whose start falls mid-bucket drops that bucket rather than showing a
 * partial one: `bucket >= from` on a week grain means a range beginning on a
 * Wednesday starts at the following Monday. Showing a half week next to full
 * ones would draw a cliff at the left edge of every chart that has nothing to
 * do with the traffic.
 */
export async function fetchSeries(
  grain: Grain,
  range: DateRange,
): Promise<SeriesPoint[]> {
  const [from, to] = bounds(range);
  const rows = asRows(await getSql()`
    select bucket::text as bucket, pageviews, visitors
    from vercel_totals
    where grain = ${grain} and bucket >= ${from} and bucket <= ${to}
    order by bucket
  `);
  return rows.map((row) => ({
    bucket: toBucketString(row.bucket),
    pageviews: n(row.pageviews),
    visitors: n(row.visitors),
  }));
}

export type Totals = {
  pageviews: number;
  /** A sum of per-bucket distinct counts. Only a true unique count when the
   *  range is exactly one bucket - see exactVisitorBucket in ranges.ts. */
  visitors: number;
  buckets: number;
};

export async function fetchTotals(
  grain: Grain,
  range: DateRange,
): Promise<Totals> {
  const [from, to] = bounds(range);
  const rows = asRows(await getSql()`
    select
      coalesce(sum(pageviews), 0) as pageviews,
      coalesce(sum(visitors), 0)  as visitors,
      count(*)                    as buckets
    from vercel_totals
    where grain = ${grain} and bucket >= ${from} and bucket <= ${to}
  `);
  const row = rows[0] ?? {};
  return {
    pageviews: n(row.pageviews),
    visitors: n(row.visitors),
    buckets: n(row.buckets),
  };
}

/**
 * The visitor count for one stored bucket, which is the only figure that can
 * honestly be called uniques.
 *
 * Called only when ranges.ts says the range is exactly one bucket. Everywhere
 * else the dashboard shows the sum from fetchTotals and labels it as one.
 */
export async function fetchExactVisitors(
  grain: Grain,
  bucket: string,
): Promise<number | null> {
  const rows = asRows(await getSql()`
    select visitors from vercel_totals
    where grain = ${grain} and bucket = ${bucket}
  `);
  return rows.length > 0 ? n(rows[0]!.visitors) : null;
}

export type BreakdownRow = {
  value: string;
  pageviews: number;
  visitors: number;
};

export async function fetchBreakdown(
  dimension: Dimension,
  grain: Grain,
  range: DateRange,
  limit = 50,
): Promise<BreakdownRow[]> {
  const [from, to] = bounds(range);
  const rows = asRows(await getSql()`
    select value,
           sum(pageviews) as pageviews,
           sum(visitors)  as visitors
    from vercel_breakdown
    where dimension = ${dimension}
      and grain = ${grain}
      and bucket >= ${from} and bucket <= ${to}
    group by value
    order by sum(pageviews) desc, value
    limit ${limit}
  `);
  return rows.map((row) => ({
    value: String(row.value),
    pageviews: n(row.pageviews),
    visitors: n(row.visitors),
  }));
}

/**
 * How many distinct values each dimension has in this range, for the counts
 * beside the sidebar links.
 *
 * One grouped query rather than seven, because the sidebar renders on every
 * page load and this is the query nobody looks at.
 */
export async function fetchDimensionCounts(
  grain: Grain,
  range: DateRange,
): Promise<Record<string, number>> {
  const [from, to] = bounds(range);
  const rows = asRows(await getSql()`
    select dimension, count(distinct value) as n
    from vercel_breakdown
    where grain = ${grain} and bucket >= ${from} and bucket <= ${to}
    group by dimension
  `);
  return Object.fromEntries(rows.map((row) => [String(row.dimension), n(row.n)]));
}

/**
 * The oldest bucket stored for a grain, or null if there are none.
 *
 * Used to decide whether a "vs the previous period" comparison is honest. It
 * is not enough for the earlier window to return rows: Vercel only ever held
 * a month, so on a fresh mirror the window before a 30 day range is covered by
 * one stored day, and dividing by it produced "up 9,213%" on a site that had
 * done nothing unusual. A delta is only meaningful when the whole of the
 * comparison window is inside the history we actually have.
 */
export async function fetchEarliestBucket(
  grain: Grain,
): Promise<string | null> {
  const rows = asRows(await getSql()`
    select min(bucket)::text as bucket from vercel_totals where grain = ${grain}
  `);
  const bucket = rows[0]?.bucket;
  return bucket ? String(bucket) : null;
}

/** When the nightly job last wrote anything. Drives "synced ..." in the bar. */
export async function fetchLastSynced(): Promise<Date | null> {
  const rows = asRows(await getSql()`
    select max(fetched_at) as at from vercel_totals
  `);
  const at = rows[0]?.at;
  if (!at) return null;
  // timestamptz, unlike date, comes back as a Date that is already correct.
  // The String() branch is only for the day the driver changes its mind.
  const parsed = at instanceof Date ? at : new Date(String(at));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

// ---------------------------------------------------------------------------
// Source B: the beacon rollups
// ---------------------------------------------------------------------------

export type Engagement = {
  sessions: number;
  bounces: number;
  singlePage: number;
  medianDwellMs: number | null;
  medianScroll: number | null;
};

/**
 * Site wide engagement for the range.
 *
 * Sessions and bounces are counts and add up cleanly. The two medians do not:
 * what comes back is the median of the daily medians, not the median of the
 * underlying sessions, because the rows those were computed from are pruned
 * after 90 days and cannot be re-medianed later. It is close enough to read as
 * a trend and wrong enough to be worth saying out loud, which is why the
 * dashboard calls the column "median read" and not "the median".
 */
export async function fetchEngagement(
  range: DateRange,
): Promise<Engagement | null> {
  const [from, to] = bounds(range);
  const rows = asRows(await getSql()`
    select
      coalesce(sum(sessions), 0)    as sessions,
      coalesce(sum(bounces), 0)     as bounces,
      coalesce(sum(single_page), 0) as single_page,
      percentile_cont(0.5) within group (order by median_dwell_ms) as median_dwell_ms,
      percentile_cont(0.5) within group (order by median_scroll)   as median_scroll
    from daily_engagement
    where day >= ${from} and day <= ${to}
  `);
  const row = rows[0];
  if (!row || n(row.sessions) === 0) return null;
  return {
    sessions: n(row.sessions),
    bounces: n(row.bounces),
    singlePage: n(row.single_page),
    medianDwellMs: maybe(row.median_dwell_ms),
    medianScroll: maybe(row.median_scroll),
  };
}

export type PageEngagementRow = {
  path: string;
  views: number;
  medianDwellMs: number | null;
  medianScroll: number | null;
};

export async function fetchPageEngagement(
  range: DateRange,
  limit = 200,
): Promise<PageEngagementRow[]> {
  const [from, to] = bounds(range);
  const rows = asRows(await getSql()`
    select
      path,
      coalesce(sum(views), 0) as views,
      percentile_cont(0.5) within group (order by median_dwell_ms) as median_dwell_ms,
      percentile_cont(0.5) within group (order by median_scroll)   as median_scroll
    from daily_page_engagement
    where day >= ${from} and day <= ${to}
    group by path
    order by sum(views) desc
    limit ${limit}
  `);
  return rows.map((row) => ({
    path: String(row.path),
    views: n(row.views),
    medianDwellMs: maybe(row.median_dwell_ms),
    medianScroll: maybe(row.median_scroll),
  }));
}

export type IntentKind = "outbound" | "search" | "search_zero";

export type IntentRow = { target: string; count: number };

export async function fetchIntent(
  range: DateRange,
  kind: IntentKind,
  limit = 25,
): Promise<IntentRow[]> {
  const [from, to] = bounds(range);
  const rows = asRows(await getSql()`
    select target, sum(count) as count
    from daily_intent
    where kind = ${kind} and day >= ${from} and day <= ${to}
    group by target
    order by sum(count) desc, target
    limit ${limit}
  `);
  return rows.map((row) => ({
    target: String(row.target),
    count: n(row.count),
  }));
}

/** Totals per kind in one pass, for the strip and the sidebar counts. */
export async function fetchIntentTotals(
  range: DateRange,
): Promise<Record<IntentKind, number>> {
  const [from, to] = bounds(range);
  const rows = asRows(await getSql()`
    select kind, sum(count) as count
    from daily_intent
    where day >= ${from} and day <= ${to}
    group by kind
  `);
  const totals: Record<IntentKind, number> = {
    outbound: 0,
    search: 0,
    search_zero: 0,
  };
  for (const row of rows) {
    const kind = String(row.kind) as IntentKind;
    if (kind in totals) totals[kind] = n(row.count);
  }
  return totals;
}

/**
 * Per page bounce rate, computed from the raw event rows.
 *
 * This is the one figure on the dashboard with no rollup behind it. Bounce is
 * a property of a session, not of a day and a path, so it cannot be summed out
 * of daily_page_engagement the way views can, and adding a per-page session
 * count to the nightly rollup would have meant reshaping a table that already
 * has history in it.
 *
 * The cost is that it only exists inside the 90 day retention window. Past
 * that the column renders as "-" rather than as a wrong number, which is why
 * this returns an empty map instead of zeroes when the range starts too far
 * back.
 *
 * The definition matches lib/analytics/rollup.ts exactly: one pageview in the
 * session and under ten seconds of dwell. Two definitions of bounce in one
 * codebase is how a dashboard ends up disagreeing with itself.
 */
export async function fetchPageBounce(
  range: DateRange,
  now = new Date(),
): Promise<Map<string, number>> {
  const retentionStart = subDays(now, RAW_EVENT_RETENTION_DAYS);
  if (range.from < retentionStart) return new Map();

  const [from, to] = bounds(range);
  const rows = asRows(await getSql()`
    with per_session as (
      select
        session_id,
        -- The landing page, not just any page in the session. Bounce is a
        -- claim about where somebody arrived and then left from, so a session
        -- that started on the home page and moved on belongs to the home page.
        (array_agg(path order by ts) filter (where type = 'pageview'))[1] as path,
        count(*) filter (where type = 'pageview') as views,
        coalesce(sum(dwell_ms) filter (where type = 'engagement'), 0) as dwell_ms
      from events
      where ts >= ${from} and ts < (${to}::date + 1)
      group by session_id
    )
    select path,
           count(*) as sessions,
           count(*) filter (where views <= 1 and dwell_ms < 10000) as bounces
    from per_session
    where path is not null
    group by path
  `);

  const bounce = new Map<string, number>();
  for (const row of rows) {
    const sessions = n(row.sessions);
    if (sessions === 0) continue;
    bounce.set(String(row.path), n(row.bounces) / sessions);
  }
  return bounce;
}

// ---------------------------------------------------------------------------
// Source C: the timeline
// ---------------------------------------------------------------------------

// Every row is mapped through this rather than cast, because `kind` and
// `source` are constrained in the database and typed as unions here, and the
// two are only the same thing while nobody has run an ALTER TABLE by hand.
function toAnnotation(row: Row): Annotation {
  return {
    id: n(row.id),
    at: toBucketString(row.at),
    kind: String(row.kind) as AnnotationKind,
    label: String(row.label),
    url: row.url === null || row.url === undefined ? null : String(row.url),
    source: String(row.source) as AnnotationSource,
    externalKey:
      row.external_key === null || row.external_key === undefined
        ? null
        : String(row.external_key),
  };
}

/**
 * The markers that fall inside the range, for the chart and the rail.
 *
 * Ascending, because these are drawn along an axis that runs the same way.
 */
export async function fetchAnnotations(
  range: DateRange,
): Promise<Annotation[]> {
  const [from, to] = bounds(range);
  const rows = asRows(await getSql()`
    select id, at::text as at, kind, label, url, source, external_key
    from annotations
    where at >= ${from} and at <= ${to}
    order by at, id
  `);
  return rows.map(toAnnotation);
}

/**
 * The most recent markers whatever the range, for the Timeline editor.
 *
 * Deliberately not range bound, unlike everything else on the page. The rail
 * under the chart answers "what happened in this window"; the editor answers
 * "what have I recorded", and a list that emptied itself when I switched to
 * 24h would be a list I could not delete a mistake from.
 */
export async function fetchRecentAnnotations(
  limit = 40,
): Promise<Annotation[]> {
  const rows = asRows(await getSql()`
    select id, at::text as at, kind, label, url, source, external_key
    from annotations
    order by at desc, id desc
    limit ${limit}
  `);
  return rows.map(toAnnotation);
}

/** How many markers exist at all, for the sidebar count. */
export async function fetchAnnotationCount(): Promise<number> {
  const rows = asRows(await getSql()`select count(*) as n from annotations`);
  return n(rows[0]?.n);
}

/**
 * Daily page views as a map, which is what the lift calculation eats.
 *
 * Always the day grain, whatever the chart is drawn from. A lift measured off
 * weekly buckets could not resolve a marker at all: the week containing the
 * launch is also the week containing the three days before it.
 */
export async function fetchDailyPageviews(
  from: string,
  to: string,
): Promise<Map<string, number>> {
  const rows = asRows(await getSql()`
    select bucket::text as bucket, pageviews
    from vercel_totals
    where grain = 'day' and bucket >= ${from} and bucket <= ${to}
    order by bucket
  `);
  return new Map(
    rows.map((row) => [toBucketString(row.bucket), n(row.pageviews)]),
  );
}

export type StoredSpan = { first: string | null; last: string | null };

/** How long one bucket of each grain lasts, as Postgres reads an interval. */
const PERIOD: Record<Grain, string> = {
  day: "1 day",
  week: "7 days",
  month: "1 month",
};

/**
 * The oldest and newest day covered by the buckets of one grain.
 *
 * Covered, not stored, and the difference is the whole point. A bucket carries
 * the date it starts on, so the month row for July is stored as 2026-07-01 and
 * the week row for the last full week of July as 2026-07-27, while both of
 * them account for days either side of those dates. Reading the stored dates
 * back as a span under-reports the history by up to a month.
 *
 * The grain matters just as much, and this is what the toolbar was getting
 * wrong. Vercel's plan serves the last 31 days at day granularity and no more,
 * so the day rows begin on 31 July however long the site has been up - but a
 * month query whose window touches July comes back with the whole of July, all
 * 2,553 page views of it. Asking the day rows how far back the mirror goes
 * while the chart is drawing months answered a question nobody asked and
 * quietly shrank two months of history into one.
 *
 * The far end is clamped to the range because the newest bucket is nearly
 * always still filling: on the 30th the August month row is twenty nine days
 * of data, and saying it covers up to the 31st claims a day that has not
 * happened.
 *
 * Two callers. The toolbar passes the drawn grain and the selected range and
 * gets "this is what is behind the numbers you are looking at", which is not
 * the range that was asked for. The lift calculation passes day grain and no
 * range and gets the absolute span, because a before-and-after around a marker
 * needs daily detail or it has no baseline at all.
 */
export async function fetchSpan(
  grain: Grain,
  range?: DateRange,
): Promise<StoredSpan> {
  const sql = getSql();

  // The last day a bucket accounts for is one period on, less a day, and
  // saying it that way covers all three grains with a single parameter and no
  // CASE. Postgres does the arithmetic on the `date` the column already is:
  // the same sum in JavaScript would go through a Date, and a Date is what
  // turns 2026-08-01 into the 31st of July anywhere west of UTC.
  const period = PERIOD[grain];

  const rows = asRows(
    range
      ? await sql`
          select min(bucket)::text as first,
                 least(
                   max(bucket) + ${period}::interval - interval '1 day',
                   ${bounds(range)[1]}::date
                 )::date::text as last
          from vercel_totals
          where grain = ${grain}
            and bucket >= ${bounds(range)[0]} and bucket <= ${bounds(range)[1]}
        `
      : await sql`
          select min(bucket)::text as first,
                 (max(bucket) + ${period}::interval - interval '1 day')::date::text as last
          from vercel_totals
          where grain = ${grain}
        `,
  );
  const row = rows[0] ?? {};
  return {
    first: row.first ? String(row.first) : null,
    last: row.last ? String(row.last) : null,
  };
}
