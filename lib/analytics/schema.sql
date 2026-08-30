-- Schema for the private analytics store. Idempotent: safe to re-run.
-- Apply with:  psql "$DATABASE_URL" -f lib/analytics/schema.sql

-- ---------------------------------------------------------------------------
-- Source A: the mirror of Vercel Web Analytics.
--
-- Vercel only lets a Hobby project read back 30 days. These two tables are the
-- whole point of the project: once a bucket lands here it is ours forever,
-- long after Vercel has stopped answering questions about it.
-- ---------------------------------------------------------------------------

-- Site wide totals, with no dimension attached. Kept separate from the
-- breakdown table rather than stored as a dimension with one value, because
-- these are the only figures not subject to the 100 row "Others" truncation,
-- which makes them the numbers to trust for headline counts.
create table if not exists vercel_totals (
  grain      text        not null check (grain in ('day', 'week', 'month')),
  bucket     date        not null,
  pageviews  integer     not null,
  visitors   integer     not null,
  fetched_at timestamptz not null default now(),
  primary key (grain, bucket)
);

-- One table for all seven dimensions rather than seven near identical tables.
-- The ETL becomes a loop over a config array and the dashboard becomes one
-- parameterised query, so adding a dimension later (UTM, if the plan ever
-- changes) is a change to lib/analytics/config.ts and nothing else.
create table if not exists vercel_breakdown (
  grain      text        not null check (grain in ('day', 'week', 'month')),
  bucket     date        not null,
  dimension  text        not null,
  value      text        not null,
  pageviews  integer     not null,
  visitors   integer     not null,
  fetched_at timestamptz not null default now(),
  primary key (grain, bucket, dimension, value)
);

-- The dashboard always filters by dimension and grain first, then scans a
-- bucket range, so lead with those. The primary key index has bucket second
-- and cannot serve this shape.
create index if not exists vercel_breakdown_lookup
  on vercel_breakdown (dimension, grain, bucket);

-- ---------------------------------------------------------------------------
-- Source B: the first party beacon.
--
-- Everything Vercel cannot answer. Bounce rate does not exist in the Vercel
-- API at all, and custom events need a Pro plan, so sessions, scroll depth,
-- outbound clicks and site search all have to come from here.
-- ---------------------------------------------------------------------------

create table if not exists events (
  id            bigserial   primary key,
  ts            timestamptz not null default now(),
  -- Salted hash, not an identifier. See lib/analytics/session.ts: the salt is
  -- regenerated daily and never written down, so these cannot be joined
  -- across days and cannot be walked back to an IP address.
  session_id    text        not null,
  type          text        not null check (type in ('pageview', 'engagement', 'outbound', 'search')),
  path          text,
  referrer_host text,
  country       text,
  scroll_pct    smallint,
  dwell_ms      integer,
  -- Overloaded on purpose: the outbound destination for 'outbound', the query
  -- string for 'search'. Two sparse columns would say the same thing with
  -- more schema.
  target        text,
  -- Result count for 'search'. Zero here is the single most useful row in
  -- this table: somebody looked for something the site does not have.
  result_count  integer
);

create index if not exists events_ts on events (ts);
create index if not exists events_type_ts on events (type, ts);
create index if not exists events_session on events (session_id, ts);

-- Nightly rollup of the raw events above. Survives the 90 day pruning of
-- `events`, so engagement history is permanent even though the rows it was
-- computed from are not.
create table if not exists daily_engagement (
  day             date    primary key,
  sessions        integer not null,
  -- A session with one pageview AND under ten seconds of dwell. This is the
  -- number to trust.
  bounces         integer not null,
  -- A session with one pageview, whatever the dwell. Recorded only because it
  -- is what conventional analytics tools call a bounce, and it flatters this
  -- site badly: someone who lands on a long post, reads it to the end and
  -- leaves is the best outcome there is, and this column calls that a bounce.
  single_page     integer not null,
  median_dwell_ms integer,
  median_scroll   smallint
);

-- Per page engagement, same rollup pass. Kept apart from daily_engagement so
-- the site wide numbers stay a single cheap row per day.
create table if not exists daily_page_engagement (
  day             date    not null,
  path            text    not null,
  views           integer not null,
  median_dwell_ms integer,
  median_scroll   smallint,
  primary key (day, path)
);

-- Outbound clicks and site searches, rolled up and kept forever. For a site
-- whose job is to be a professional profile, "somebody clicked through to my
-- LinkedIn" is the conversion, and a search that returned nothing is a
-- content gap stated out loud.
create table if not exists daily_intent (
  day    date    not null,
  kind   text    not null check (kind in ('outbound', 'search', 'search_zero')),
  target text    not null,
  count  integer not null,
  primary key (day, kind, target)
);

-- ---------------------------------------------------------------------------
-- Source C: the timeline.
--
-- A spike is not information. "Visitors doubled on the 21st" is a fact with no
-- use until something is standing next to it, and the thing standing next to
-- it is almost always something I did: published a post, open sourced a
-- project, changed a profile, got linked from somewhere. These rows are what
-- turn the chart from a shape into an answer to "did that work".
--
-- Two sources, and the split is the whole design. `content` rows are derived
-- from post and project frontmatter on every nightly run, so they need no
-- manual step and backfill instantly for everything already written. `manual`
-- rows are the ones only I know about, added from the dashboard.
-- ---------------------------------------------------------------------------

create table if not exists annotations (
  id           bigserial   primary key,
  -- A date, not a timestamp. Everything this is compared against is a daily
  -- bucket, so an hour would be precision the rest of the pipeline cannot use.
  at           date        not null,
  kind         text        not null check (kind in ('post', 'project', 'profile', 'external', 'note')),
  label        text        not null,
  url          text,
  source       text        not null check (source in ('content', 'manual')),
  -- Stable identity for a content-derived row, e.g. 'post:2026-08-03-pi-extensions'.
  -- This is what makes the nightly sync an upsert rather than an append: a
  -- re-run finds the same key and updates in place, and an edited frontmatter
  -- date moves the marker instead of leaving a second one behind. Null for
  -- manual rows, which have no source of truth outside this table.
  external_key text,
  created_at   timestamptz not null default now()
);

-- Partial, because null is the normal case for manual rows and a plain unique
-- index would still allow many nulls but would carry them for nothing. This is
-- also the index the nightly upsert infers its conflict target from.
create unique index if not exists annotations_external_key
  on annotations (external_key)
  where external_key is not null;

-- The dashboard reads a date range, newest first, on every page load.
create index if not exists annotations_at on annotations (at desc);
