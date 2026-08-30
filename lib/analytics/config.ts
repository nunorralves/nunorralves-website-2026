// Shared vocabulary for both halves of the pipeline: the ETL that pulls from
// Vercel and the dashboard that reads back out. Keeping the lists here means
// adding a dimension is a one line change that the cron loop, the database
// constraint and the dashboard all pick up together, instead of three edits
// that drift apart.

// The dimensions we mirror from Vercel Web Analytics. These names are Vercel's
// own, passed straight through as the `by` parameter, so they must match the
// API's enum exactly. Deliberately absent: the UTM dimensions, which need the
// Web Analytics Plus add-on, and `environment`, which we never group by
// because the API already filters to production for us.
export const DIMENSIONS = [
  "route",
  "requestPath",
  "country",
  "deviceType",
  "browserName",
  "osName",
  "referrerHostname",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

// Human labels for the dashboard. Vercel's `route` is the framework pattern
// (/posts/[slug]) and `requestPath` is the concrete URL (/posts/my-post), a
// distinction that is invisible if you just title-case the field name.
export const DIMENSION_LABELS: Record<Dimension, string> = {
  route: "Routes",
  requestPath: "Pages",
  country: "Countries",
  deviceType: "Devices",
  browserName: "Browsers",
  osName: "Operating systems",
  referrerHostname: "Referrers",
};

// Why three grains rather than just storing days and summing them: `visitors`
// is a distinct count, and distinct counts do not add up. A reader who visits
// on ten days in a month is ten daily visitors but one monthly visitor, so
// summing the daily figures over a month overstates uniques badly. We ask
// Vercel for each grain separately and read whichever one matches the range
// being displayed. Pageviews would be fine to sum; visitors never are.
export const GRAINS = ["day", "week", "month"] as const;

export type Grain = (typeof GRAINS)[number];

// Vercel caps `limit` at 100 and rolls everything past it into a single
// "Others" row. At the site's current size (11 posts, 4 projects) nothing
// comes close, but referrers are the one dimension with an unbounded tail, so
// this is the number to watch once the site grows.
export const BREAKDOWN_LIMIT = 100;

// How much history Vercel Web Analytics will still answer questions about on
// a Hobby plan. This is the number the whole project exists because of: past
// this line the data is gone from Vercel for good, so it is also the widest
// window a first run or a backfill can possibly recover.
//
// 31, measured against the live API rather than read off the pricing page.
// `since` 31 days back returns 32 daily buckets; 32 days back is refused with
// "the hobby plan only grants access to the latest 31 days of data". Asking
// for more than this is not a bigger answer, it is a 400 for the whole query,
// which is what makes clamping to it in windowFor a correctness fix and not
// an optimisation.
//
// A second, separate ceiling worth knowing about: day granularity is also
// capped at a 62 day span per request, whatever the plan. It never binds here
// because 31 is the tighter limit, but it is why a paid plan could not simply
// raise this number without also splitting the request.
export const VERCEL_RETENTION_DAYS = 31;

// How far back each nightly run re-reads. Vercel's numbers can still move
// after the fact, and a cron that fails or is skipped would otherwise leave a
// permanent hole, because Hobby only lets us look back a month. Re-pulling a
// week every night means up to six consecutive failures self heal on the next
// success. Every write is an upsert, so redoing work costs nothing but time.
export const BACKFILL_DAYS = 7;

// Raw beacon rows are pruned at this age. The daily rollups built from them
// are kept forever, so history is not lost, only the row level detail that
// nothing reads after it has been aggregated. This is what keeps the database
// inside Neon's free tier no matter how many years accumulate.
export const RAW_EVENT_RETENTION_DAYS = 90;
