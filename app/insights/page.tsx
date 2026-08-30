import type { Metadata } from "next";
import Link from "next/link";
import AnnotationRail from "app/components/insights/AnnotationRail";
import AreaChart from "app/components/insights/AreaChart";
import DataTable, { type TableRow } from "app/components/insights/DataTable";
import DimensionNav, {
  type NavGroup,
} from "app/components/insights/DimensionNav";
import RangeToolbar from "app/components/insights/RangeToolbar";
import StatStrip, { type Stat } from "app/components/insights/StatStrip";
import TimelineSection from "app/components/insights/TimelineSection";
import {
  LIFT_WINDOW_DAYS,
  isAnnotationMessage,
  liftsFor,
  shiftIsoDay,
  type AnnotationMessage,
  type Lift,
} from "lib/analytics/annotations";
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  type Dimension,
} from "lib/analytics/config";
import { isDbConfigured } from "lib/analytics/db";
import {
  formatCount,
  formatCoverage,
  formatDelta,
  formatDeltaDuration,
  formatDeltaPoints,
  formatDuration,
  formatPercentPoints,
  formatRangeLabel,
  formatRatio,
  formatSyncedAt,
} from "lib/analytics/format";
import * as queries from "lib/analytics/queries";
import {
  RANGE_LABELS,
  exactVisitorBucket,
  parseCustomRange,
  parsePreset,
  pickGrain,
  resolveRange,
  toIsoDate,
  type DateRange,
  type RangePreset,
} from "lib/analytics/ranges";
import { buildConclusion } from "lib/analytics/summary";

// force-dynamic, and it has to be. Every figure below comes from a database
// that CI has never heard of, so a prerender would either bake in one night's
// numbers or, without DATABASE_URL, take the build down. The proxy makes
// this route a redirect for anyone without a cookie anyway, which is not
// something a static page can be.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insights",
  // Belt and braces with the X-Robots-Tag the proxy sets and the
  // Disallow in robots.txt. Three cheap statements of the same thing, because
  // the failure mode is my traffic numbers turning up in a search result.
  robots: { index: false, follow: false },
};

// The sidebar's order, which is deliberately not config.ts's.
//
// That list is the ETL's, and it leads with `route` because that is how the
// dimensions were added. This one leads with Pages, because "which post" is
// the question I open this dashboard to answer, and Referrers third because it
// is the one that explains the other two.
const VERCEL_ORDER: readonly Dimension[] = [
  "requestPath",
  "route",
  "referrerHostname",
  "country",
  "deviceType",
  "browserName",
  "osName",
];

// The beacon half of the sidebar. These are not Vercel dimensions - there is
// no `by=engagement` - so they cannot live in lib/analytics/config.ts beside
// the ones that are passed straight to the API. They are views onto the rollup
// tables, and the sidebar is the only thing that treats them alike.
const BEACON_VIEWS = {
  engagement: "Engagement",
  outbound: "Outbound clicks",
  search: "Site searches",
} as const;

type BeaconView = keyof typeof BEACON_VIEWS;
type ViewKey = Dimension | BeaconView;

function parseView(value: string | undefined): ViewKey {
  if ((DIMENSIONS as readonly string[]).includes(value ?? "")) {
    return value as Dimension;
  }
  if (value && value in BEACON_VIEWS) return value as BeaconView;
  // Pages, not routes: /posts/[slug] is one route and eleven posts, and the
  // question I open this page to answer is which post.
  return "requestPath";
}

// How many rows the main table shows.
//
// The default was 50, and on this site that meant 57 paths, most of them one
// view apiece and a fair number of them bot probes for /signin and /app. The
// three pinned panels are meant to be on screen without a click, and 50 rows
// put them fifteen hundred pixels down, which is the same thing as burying
// them behind one. The tail is not information: anything below the top 25 here
// has a single digit against it.
const TABLE_ROWS = 15;

// What "expanded" means. Still a ceiling rather than everything, because the
// point of the fold is that the tail is single digit rows, and a dimension
// with a genuinely unbounded tail (referrers, once anything gets shared
// widely) should not be able to render a thousand rows into the page.
const TABLE_ROWS_EXPANDED = 200;

// The three pinned panels are a standing summary rather than a list to work
// through, and they sit side by side, so they get a shorter tail. They are fed
// by slicing the same queries the sidebar views use: fetching each list twice
// at two different limits is how "Referrers" in the sidebar ended up showing
// ten rows while every other dimension showed twenty five.
const PANEL_ROWS = 10;

// Shares for the ranked bars, computed against the largest row in the table
// rather than against the range total. A table whose top row is 8% of the
// total draws eight bars nobody can tell apart.
function shares(values: number[]): (index: number) => number {
  const max = Math.max(1, ...values);
  return (index) => (values[index] ?? 0) / max;
}

type SearchParams = Promise<{
  range?: string;
  dim?: string;
  from?: string;
  to?: string;
  rows?: string;
  /** The outcome of the last annotation write, as a code. */
  ann?: string;
}>;

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const view = parseView(params.dim);

  // The fold is a link, not a toggle, for the same reason the range and the
  // dimension are links: every piece of state on this page lives in the URL,
  // which makes any view of it bookmarkable and means the page ships no client
  // JavaScript at all. It also means the tail is not fetched or sent until
  // somebody asks for it.
  const expanded = params.rows === "all";

  // Narrowed against a fixed table rather than rendered. This value comes back
  // from a redirect and could equally have come from a link somebody sent me,
  // and a page that prints arbitrary query text in its own voice is a phishing
  // page I built myself. Anything unrecognised is simply not a message.
  const message: AnnotationMessage | null = isAnnotationMessage(params.ann)
    ? params.ann
    : null;

  // A custom pair outranks the preset when both are present and the pair
  // parses. parseCustomRange returns null on anything mangled, so a hand
  // edited URL degrades to the preset instead of an empty chart.
  const custom = parseCustomRange(params.from, params.to);
  const preset = parsePreset(params.range);
  const now = new Date();
  const range = custom ?? resolveRange(preset, now);

  const rangeQuery = custom
    ? `from=${toIsoDate(custom.from)}&to=${toIsoDate(custom.to)}`
    : `range=${preset}`;

  if (!isDbConfigured()) {
    return (
      <Shell
        preset={custom ? null : preset}
        view={view}
        custom={custom}
        rangeQuery={rangeQuery}
        syncedNote='no database'
        coverageNote='no data stored'
        nav={emptyNav()}
      >
        <Notice
          title='No database is configured here'
          body='DATABASE_URL is unset, so there is nothing to read. On Vercel it arrives with the Neon integration; locally, copy .env.example to .env.local.'
        />
      </Shell>
    );
  }

  let data: Awaited<ReturnType<typeof load>>;
  try {
    data = await load(range, view, now, expanded);
  } catch (error) {
    // A dashboard that throws a stack trace at me is less useful than one that
    // says which query died. This is the only reader, so the message is the
    // real message rather than a sanitised one.
    //
    // 42P01 is Postgres for "no such table", and it has exactly one cause
    // here: the connection works but schema.sql has never been applied. That
    // is a setup step with a command behind it, not a fault, so it gets an
    // answer rather than the raw error.
    const missingSchema = (error as { code?: string }).code === "42P01";
    return (
      <Shell
        preset={custom ? null : preset}
        view={view}
        custom={custom}
        rangeQuery={rangeQuery}
        syncedNote={missingSchema ? "no schema" : "read failed"}
        coverageNote='no data stored'
        nav={emptyNav()}
      >
        <Notice
          title={
            missingSchema
              ? "The database is reachable, but empty"
              : "The read failed"
          }
          body={
            missingSchema
              ? "None of the analytics tables exist yet. Run npm run analytics:backfill, which applies lib/analytics/schema.sql and then pulls everything Vercel still holds."
              : (error as Error).message
          }
        />
      </Shell>
    );
  }

  const { series, totals, previous, engagement, previousEngagement, intent, previousIntent, exactVisitors, counts, referrers, outbound, zeroSearches, pages, table, lastSynced, annotations, recentAnnotations, annotationCount, lifts, coverage } = data;

  const grain = pickGrain(range);
  const exact = exactVisitorBucket(range);

  const bounce =
    engagement && engagement.sessions > 0
      ? engagement.bounces / engagement.sessions
      : null;
  const previousBounce =
    previousEngagement && previousEngagement.sessions > 0
      ? previousEngagement.bounces / previousEngagement.sessions
      : null;

  const stats: Stat[] = [
    {
      label: "Visitors",
      value: formatCount(exactVisitors ?? totals.visitors),
      delta: formatDelta(totals.visitors, previous?.visitors ?? null),
      // The trap this marker exists for. `visitors` is a distinct count, so it
      // does not add: a reader who came back on five days is one visitor and
      // five daily rows. Only a range that is exactly one stored bucket can be
      // reported as uniques, which is what exactVisitorBucket decides.
      approximate: exact
        ? undefined
        : {
            badge: "sum",
            explain: `${totals.buckets} ${grain} buckets summed. Anyone who returned on more than one of them is counted more than once, so this is an upper bound on uniques rather than a distinct count.`,
          },
    },
    {
      label: "Page views",
      value: formatCount(totals.pageviews),
      delta: formatDelta(totals.pageviews, previous?.pageviews ?? null),
    },
    {
      label: "Bounce",
      value: formatRatio(bounce),
      delta: formatDeltaPoints(bounce, previousBounce),
    },
    {
      label: "Median read",
      value: formatDuration(engagement?.medianDwellMs ?? null),
      delta: formatDeltaDuration(
        engagement?.medianDwellMs ?? null,
        previousEngagement?.medianDwellMs ?? null,
      ),
    },
    {
      label: "Outbound",
      value: formatCount(intent.outbound),
      delta: formatDelta(intent.outbound, previousIntent.outbound),
    },
  ];

  const conclusion = buildConclusion({
    range,
    pageviews: totals.pageviews,
    previousPageviews: previous?.pageviews ?? null,
    topPage: pages[0]
      ? { value: pages[0].value, pageviews: pages[0].pageviews }
      : null,
    topReferrer: referrers[0]
      ? { value: referrers[0].value, pageviews: referrers[0].pageviews }
      : null,
    outbound: intent.outbound,
    zeroSearches: zeroSearches.map((row) => ({
      target: row.target,
      count: row.count,
    })),
  });

  const nav: NavGroup[] = [
    {
      title: "From Vercel",
      items: VERCEL_ORDER.map((dimension) => ({
        key: dimension,
        label: DIMENSION_LABELS[dimension],
        count: counts[dimension] ? formatCount(counts[dimension]) : null,
      })),
    },
    {
      title: "From the beacon",
      items: [
        // Engagement is a shape, not a set of values, so it has no count to
        // show. A zero here would read as "nothing happened".
        { key: "engagement", label: BEACON_VIEWS.engagement, count: null },
        {
          key: "outbound",
          label: BEACON_VIEWS.outbound,
          count: formatCount(intent.outbound),
        },
        {
          key: "search",
          label: BEACON_VIEWS.search,
          count: formatCount(intent.search + intent.search_zero),
        },
      ],
    },
    {
      // A third source, and the only one I write by hand. It gets its own
      // group rather than a row in either of the others, because the timeline
      // is not a way of slicing the traffic: it is the set of things the
      // traffic is being explained by.
      title: "Timeline",
      items: [
        {
          key: "annotations",
          label: "Annotations",
          count: formatCount(annotationCount),
          // Down the page rather than into a different table. Everything else
          // in this sidebar swaps the main table out; this one is a section
          // that is always rendered, so the link is an anchor.
          href: "#timeline",
        },
      ],
    },
  ];

  const topReferrers = referrers.slice(0, PANEL_ROWS);
  const topOutbound = outbound.slice(0, PANEL_ROWS);
  const topZeroSearches = zeroSearches.slice(0, PANEL_ROWS);

  const referrerShare = shares(topReferrers.map((row) => row.visitors));
  const outboundShare = shares(topOutbound.map((row) => row.count));
  const zeroShare = shares(topZeroSearches.map((row) => row.count));

  return (
    <Shell
      preset={custom ? null : preset}
      view={view}
      custom={custom}
      rangeQuery={rangeQuery}
      syncedNote={`production, synced ${formatSyncedAt(lastSynced, now)}`}
      coverageNote={formatCoverage(coverage.first, coverage.last)}
      nav={nav}
      timeline={
        <TimelineSection
          annotations={recentAnnotations}
          lifts={lifts}
          today={toIsoDate(now)}
          message={message}
        />
      }
      main={
        <>
          <div className='mb-4 flex flex-wrap items-baseline justify-between gap-2'>
            <h2 className='text-lg'>{table.title}</h2>
            <span className='font-mono text-[0.65rem] text-[var(--color-secondary)]'>
              {table.note}
            </span>
          </div>
          <DataTable
            headings={table.headings}
            rows={table.rows}
            empty={table.empty}
            monoLabels={table.mono}
          />

          {/* The fold. A link rather than a toggle: everything else on this
              page puts its state in the URL, and this way the tail is not
              queried or sent until it is asked for. */}
          {expanded ? (
            table.rows.length > TABLE_ROWS ? (
              <Fold href={`/insights?${rangeQuery}&dim=${view}`}>
                Show fewer
              </Fold>
            ) : null
          ) : (table.total ?? Infinity) > table.rows.length ? (
            <Fold href={`/insights?${rangeQuery}&dim=${view}&rows=all`}>
              {table.total === undefined
                ? "Show the rest"
                : `Show all ${formatCount(table.total)}`}
            </Fold>
          ) : null}
        </>
      }
      pinned={[
        {
          title: "Where they came from",
          sub: "Referrer hostname. Also a dimension in the sidebar, where it is a way in rather than a standing summary.",
          table: (
            <DataTable
              headings={["Source", "Visitors"]}
              rows={topReferrers.map((row, index) => ({
                label: row.value,
                share: referrerShare(index),
                values: [formatCount(row.visitors)],
              }))}
              empty='No referrers recorded in this range.'
              monoLabels
            />
          ),
        },
        {
          title: "Where they went next",
          sub: "Outbound clicks. On a site whose job is to be a professional profile this is the conversion, not the page view.",
          table: (
            <DataTable
              headings={["Destination", "Clicks"]}
              rows={topOutbound.map((row, index) => ({
                label: row.target,
                share: outboundShare(index),
                values: [formatCount(row.count)],
              }))}
              empty='Nobody clicked out in this range.'
              monoLabels
            />
          ),
        },
        {
          title: "What they looked for and did not find",
          sub: "Searches that returned nothing. Read this as the queue for what to write next.",
          table: (
            <DataTable
              headings={["Query", "Times", "Results"]}
              rows={topZeroSearches.map((row, index) => ({
                label: row.target,
                share: zeroShare(index),
                values: [formatCount(row.count), "0"],
              }))}
              empty='Every search in this range found something.'
            />
          ),
        },
      ]}
    >
      <div className='border-b border-[var(--color-border)] px-4 py-4'>
        <span className='font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-secondary)]'>
          {custom
            ? formatRangeLabel(range.from, range.to)
            : `${RANGE_LABELS[preset]} to ${formatRangeLabel(range.from, range.to).split(" to ")[1]}`}
        </span>
        <h2 className='mt-1 mb-1 text-xl text-balance'>{conclusion.headline}</h2>
        <p className='m-0 max-w-[74ch] text-sm text-[var(--color-secondary)]'>
          {conclusion.subline}
        </p>
      </div>

      <StatStrip stats={stats} />

      <div className='px-4 pt-4 pb-2'>
        <AreaChart
          points={series.map((point) => ({
            bucket: point.bucket,
            value: point.pageviews,
          }))}
          grain={grain}
          label={`Page views by ${grain} over the selected range`}
          markers={annotations.map((annotation) => ({
            at: annotation.at,
            kind: annotation.kind,
            label: annotation.label,
          }))}
        />
      </div>

      {/* The legend for the pins above. It carries the border the chart block
          used to, so the two read as one unit rather than as a chart and a
          list that happen to be adjacent. */}
      <AnnotationRail annotations={annotations} />
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function load(
  range: DateRange,
  view: ViewKey,
  now: Date,
  expanded: boolean,
) {
  const limit = expanded ? TABLE_ROWS_EXPANDED : TABLE_ROWS;
  const grain = pickGrain(range);
  const exact = exactVisitorBucket(range);

  // The window immediately before this one, of exactly the same length, which
  // is what every delta on the page is measured against. Comparing a week to
  // the calendar week before it would be a different and worse question: the
  // range on screen is rarely aligned to a calendar boundary.
  const span = range.to.getTime() - range.from.getTime();
  const previousRange: DateRange = {
    from: new Date(range.from.getTime() - span),
    to: range.from,
  };

  // One round trip each over Neon's HTTP driver, so they go together rather
  // than in sequence. Fourteen serial requests is most of a second of latency
  // for no reason.
  const [
    series,
    totals,
    previousTotals,
    earliestBucket,
    exactVisitors,
    counts,
    pages,
    referrers,
    engagement,
    previousEngagement,
    pageEngagement,
    intent,
    previousIntent,
    outbound,
    zeroSearches,
    lastSynced,
    pageBounce,
    annotations,
    recentAnnotations,
    annotationCount,
    coverage,
    fullSpan,
  ] = await Promise.all([
    queries.fetchSeries(grain, range),
    queries.fetchTotals(grain, range),
    queries.fetchTotals(grain, previousRange),
    queries.fetchEarliestBucket(grain),
    exact
      ? queries.fetchExactVisitors(exact.grain, exact.bucket)
      : Promise.resolve(null),
    queries.fetchDimensionCounts(grain, range),
    // Pages are fetched whatever the selected view: the conclusion sentence
    // needs the top one, and the pages table is the default view anyway.
    queries.fetchBreakdown("requestPath", grain, range, limit),
    queries.fetchBreakdown("referrerHostname", grain, range, limit),
    queries.fetchEngagement(range),
    queries.fetchEngagement(previousRange),
    queries.fetchPageEngagement(range),
    queries.fetchIntentTotals(range),
    queries.fetchIntentTotals(previousRange),
    queries.fetchIntent(range, "outbound", limit),
    queries.fetchIntent(range, "search_zero", limit),
    queries.fetchLastSynced(),
    queries.fetchPageBounce(range, now),
    // The markers inside the range, for the chart pins and the rail.
    queries.fetchAnnotations(range),
    // The editor's list, deliberately not range bound: a list that emptied
    // itself on the 24h preset would be a list I could not delete a mistake
    // from. See fetchRecentAnnotations.
    queries.fetchRecentAnnotations(),
    queries.fetchAnnotationCount(),
    // Two spans from one query shape. The range-bound one is the toolbar's
    // "this is what is behind the numbers you are looking at"; the absolute
    // one is what decides whether a marker has a baseline at all.
    queries.fetchDaySpan(range),
    queries.fetchDaySpan(),
  ]);

  // The selected dimension, unless it is one of the two already fetched above.
  const selected =
    view === "requestPath"
      ? pages
      : view === "referrerHostname"
        ? referrers
        : (DIMENSIONS as readonly string[]).includes(view)
          ? await queries.fetchBreakdown(view as Dimension, grain, range, limit)
          : [];

  const searches = (DIMENSIONS as readonly string[]).includes(view)
    ? []
    : view === "search"
      ? await queries.fetchIntent(range, "search", limit)
      : [];

  // Only compare against a window our history actually covers. Vercel held a
  // month when this mirror started, so the window before a 30 day range is
  // covered by a day or two of it, and a delta against that says "up 9,213%"
  // about a perfectly ordinary month. Null here means the strip shows no delta
  // and the conclusion falls through to something it can stand behind.
  const previous =
    earliestBucket !== null &&
    toIsoDate(previousRange.from) >= earliestBucket
      ? previousTotals
      : null;

  // The daily series the lift is measured off, fetched exactly as wide as the
  // markers on screen need and no wider. Always the day grain, whatever the
  // chart is drawn from: a lift computed off weekly buckets could not resolve
  // a marker at all, because the week containing the launch is also the week
  // containing the three days before it.
  //
  // One extra query, and only when there is something to measure.
  const lifts =
    recentAnnotations.length > 0 && fullSpan.first !== null
      ? liftsFor(
          recentAnnotations,
          await queries.fetchDailyPageviews(
            // The list is newest first, so the last row is the oldest marker,
            // and its baseline starts a window before it.
            shiftIsoDay(
              recentAnnotations[recentAnnotations.length - 1]!.at,
              -LIFT_WINDOW_DAYS,
            ),
            fullSpan.last ?? toIsoDate(now),
          ),
          fullSpan,
        )
      : new Map<number, Lift>();

  return {
    series,
    totals,
    previous,
    exactVisitors,
    counts,
    pages,
    referrers,
    engagement,
    previousEngagement,
    intent,
    previousIntent,
    outbound,
    zeroSearches,
    lastSynced,
    annotations,
    recentAnnotations,
    annotationCount,
    lifts,
    coverage,
    table: buildTable(view, {
      selected,
      pages,
      pageEngagement,
      pageBounce,
      outbound,
      searches,
      zeroSearches,
      // The distinct value count for the whole range, which is what makes
      // "top 25 of 57" possible. The sidebar shows the same number, so a
      // truncated table that did not say so would look like it disagreed
      // with the link that opened it.
      total: counts[view],
      limit,
    }),
  };
}

type TableSpec = {
  title: string;
  note: string;
  headings: string[];
  rows: TableRow[];
  empty: string;
  mono: boolean;
  /** How many rows exist in total, when that is knowable. */
  total?: number;
};

// Says so when the table is showing only the head of the list. A truncated
// table that stays quiet about it is the kind of thing you read a wrong
// conclusion off six months later.
function noteWithTotal(base: string, shown: number, total?: number): string {
  return total !== undefined && total > shown
    ? `top ${shown} of ${total}, ${base}`
    : base;
}

function buildTable(
  view: ViewKey,
  data: {
    selected: queries.BreakdownRow[];
    pages: queries.BreakdownRow[];
    pageEngagement: queries.PageEngagementRow[];
    pageBounce: Map<string, number>;
    outbound: queries.IntentRow[];
    searches: queries.IntentRow[];
    zeroSearches: queries.IntentRow[];
    total?: number;
    limit: number;
  },
): TableSpec {
  if (view === "requestPath") {
    // The one table that joins both sources: Vercel counts the views and the
    // visitors, the beacon knows how long people stayed and how far down they
    // got. Neither half can answer the question on its own.
    const engagementByPath = new Map(
      data.pageEngagement.map((row) => [row.path, row]),
    );
    const share = shares(data.pages.map((row) => row.pageviews));
    return {
      title: "Pages",
      total: data.total,
      note: noteWithTotal(
        "Vercel counts and beacon engagement",
        data.pages.length,
        data.total,
      ),
      headings: ["Page", "Views", "Visitors", "Median read", "Scroll", "Bounce"],
      mono: true,
      empty: "No pages recorded in this range.",
      rows: data.pages.map((row, index) => {
        const engagement = engagementByPath.get(row.value);
        return {
          label: row.value,
          share: share(index),
          values: [
            formatCount(row.pageviews),
            formatCount(row.visitors),
            formatDuration(engagement?.medianDwellMs ?? null),
            formatPercentPoints(engagement?.medianScroll ?? null),
            // "-" past the 90 day raw event retention, because bounce is a
            // property of a session and there is no rollup to recover it from
            // once the rows are pruned. A zero here would be a lie.
            formatRatio(data.pageBounce.get(row.value) ?? null),
          ],
        };
      }),
    };
  }

  if (view === "engagement") {
    // Fetched wider than it is shown, because the pages table above looks up
    // engagement by path and its top 25 by Vercel views is not the same set as
    // the top 25 by beacon views. Only the display is trimmed.
    const shown = data.pageEngagement.slice(0, data.limit);
    const share = shares(shown.map((row) => row.views));
    return {
      title: "Engagement",
      total: data.pageEngagement.length,
      note: noteWithTotal("beacon only", shown.length, data.pageEngagement.length),
      headings: ["Page", "Views", "Median read", "Scroll"],
      mono: true,
      empty: "The beacon has not recorded anything in this range.",
      rows: shown.map((row, index) => ({
        label: row.path,
        share: share(index),
        values: [
          formatCount(row.views),
          formatDuration(row.medianDwellMs),
          formatPercentPoints(row.medianScroll),
        ],
      })),
    };
  }

  if (view === "outbound") {
    const share = shares(data.outbound.map((row) => row.count));
    return {
      title: "Outbound clicks",
      total: data.outbound.length === data.limit ? undefined : data.outbound.length,
      note: "beacon only",
      headings: ["Destination", "Clicks"],
      mono: true,
      empty: "Nobody clicked out in this range.",
      rows: data.outbound.map((row, index) => ({
        label: row.target,
        share: share(index),
        values: [formatCount(row.count)],
      })),
    };
  }

  if (view === "search") {
    // Both kinds in one list, because the interesting comparison is between
    // them: a query asked often that always finds something is a page worth
    // linking better, and the same query finding nothing is a page to write.
    const rows = [
      ...data.zeroSearches.map((row) => ({ ...row, found: false })),
      ...data.searches.map((row) => ({ ...row, found: true })),
    ].sort((a, b) => b.count - a.count);
    const share = shares(rows.map((row) => row.count));
    return {
      title: "Site searches",
      total: rows.length === data.limit ? undefined : rows.length,
      note: "beacon only",
      headings: ["Query", "Times", "Found"],
      mono: false,
      empty: "Nobody searched in this range.",
      rows: rows.map((row, index) => ({
        label: row.target,
        share: share(index),
        values: [formatCount(row.count), row.found ? "yes" : "no"],
      })),
    };
  }

  const share = shares(data.selected.map((row) => row.pageviews));
  return {
    title: DIMENSION_LABELS[view as Dimension],
    total: data.total,
    note: noteWithTotal("Vercel mirror", data.selected.length, data.total),
    headings: [DIMENSION_LABELS[view as Dimension], "Views", "Visitors"],
    mono: view === "referrerHostname" || view === "route",
    empty: "Nothing recorded for this dimension in this range.",
    rows: data.selected.map((row, index) => ({
      label: row.value,
      share: share(index),
      values: [formatCount(row.pageviews), formatCount(row.visitors)],
    })),
  };
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

function emptyNav(): NavGroup[] {
  return [
    {
      title: "From Vercel",
      items: VERCEL_ORDER.map((dimension) => ({
        key: dimension,
        label: DIMENSION_LABELS[dimension],
        count: null,
      })),
    },
    {
      title: "From the beacon",
      items: (Object.keys(BEACON_VIEWS) as BeaconView[]).map((key) => ({
        key,
        label: BEACON_VIEWS[key],
        count: null,
      })),
    },
  ];
}

function Fold({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className='mt-3 inline-block font-mono text-[0.7rem] text-[var(--color-secondary)] transition-colors hover:text-[var(--color-link)]'
    >
      {children}
    </Link>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className='px-4 py-10'>
      <h2 className='mb-2 text-lg'>{title}</h2>
      <p className='m-0 max-w-[62ch] text-sm text-[var(--color-secondary)]'>
        {body}
      </p>
    </div>
  );
}

type PinnedPanel = { title: string; sub: string; table: React.ReactNode };

function Shell({
  preset,
  view,
  custom,
  rangeQuery,
  syncedNote,
  coverageNote,
  nav,
  children,
  main,
  timeline,
  pinned,
}: {
  preset: RangePreset | null;
  view: ViewKey;
  custom: DateRange | null;
  rangeQuery: string;
  syncedNote: string;
  coverageNote: string;
  nav: NavGroup[];
  children?: React.ReactNode;
  main?: React.ReactNode;
  /** The annotation editor, between the table and the pinned panels. */
  timeline?: React.ReactNode;
  pinned?: PinnedPanel[];
}) {
  return (
    // Wider than container-page's 44rem. That measure exists to keep prose at
    // a readable line length, and none of this is prose: a six column table
    // squeezed into a reading column is unreadable for the opposite reason.
    <div className='mx-auto w-11/12 max-w-[1180px] py-8'>
      <p className='font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-secondary)]'>
        nunorralves.pt / insights
      </p>
      <h1 className='mt-2 mb-6 text-3xl'>Insights</h1>

      <div className='overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]'>
        <RangeToolbar
          active={preset}
          dimension={view}
          custom={
            custom
              ? { from: toIsoDate(custom.from), to: toIsoDate(custom.to) }
              : null
          }
          syncedNote={syncedNote}
          coverageNote={coverageNote}
        />

        {children}

        {main ? (
          // The sidebar and the table share a row on a desktop and stack on a
          // phone. 196px is the mockup's, and it is the width at which
          // "Operating systems" fits on one line.
          <div className='grid md:[grid-template-columns:196px_1fr]'>
            <DimensionNav groups={nav} active={view} query={rangeQuery} />
            <div className='min-w-0 px-4 py-4'>{main}</div>
          </div>
        ) : null}

        {timeline}

        {pinned ? (
          // Pinned, not tabbed. These three answer the questions I actually
          // open this page for, and a dimension nobody thinks to click is a
          // dimension nobody reads.
          <div className='grid border-t border-[var(--color-border)] [grid-template-columns:repeat(auto-fit,minmax(17rem,1fr))]'>
            {pinned.map((panel) => (
              <section
                key={panel.title}
                className='min-w-0 border-r border-[var(--color-border)] px-4 py-4 last:border-r-0'
              >
                <h3 className='mb-1 text-base'>{panel.title}</h3>
                <p className='mb-3 text-xs text-[var(--color-secondary)]'>
                  {panel.sub}
                </p>
                {panel.table}
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
