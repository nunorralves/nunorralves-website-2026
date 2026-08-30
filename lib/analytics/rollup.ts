import { RAW_EVENT_RETENTION_DAYS } from "./config";
import { asRows, getSql } from "./db";

// How many days of raw events to re-aggregate on each run. Events arrive when
// a tab is closed, which can be well after the pageview they describe, so the
// last couple of days are never final when the cron first sees them.
const ROLLUP_WINDOW_DAYS = 3;

export type RollupReport = {
  daysRolled: number;
  rawRowsPruned: number;
};

/**
 * Fold raw beacon events into the permanent daily tables, then prune the raw
 * rows that have aged out.
 *
 * The rollups are what make the retention policy safe: `events` is a working
 * set that gets deleted after 90 days, but everything computed from it is kept
 * forever, so engagement history survives long after the rows behind it are
 * gone. Without this pass, honouring the 90 day prune would mean losing the
 * history the whole project exists to accumulate.
 */
export async function rollupBeaconEvents(): Promise<RollupReport> {
  const sql = getSql();

  // Site wide sessions, bounce and engagement medians.
  //
  // Both bounce definitions are computed here. `bounces` requires a single
  // pageview AND under ten seconds of dwell, because on a site made of long
  // posts the conventional definition is actively misleading: a reader who
  // lands on one essay, reads it through and leaves has done exactly what the
  // site is for, and the one-pageview rule files that under failure.
  await sql`
    with windowed as (
      select * from events
      where ts >= current_date - make_interval(days => ${ROLLUP_WINDOW_DAYS})
    ),
    per_session as (
      select
        (ts at time zone 'UTC')::date as day,
        session_id,
        count(*) filter (where type = 'pageview') as views,
        coalesce(sum(dwell_ms) filter (where type = 'engagement'), 0) as dwell_ms
      from windowed
      group by 1, 2
    ),
    sessions as (
      select
        day,
        count(*)::int as sessions,
        count(*) filter (where views <= 1 and dwell_ms < 10000)::int as bounces,
        count(*) filter (where views <= 1)::int as single_page,
        percentile_cont(0.5) within group (order by dwell_ms)::int as median_dwell_ms
      from per_session
      group by day
    ),
    scroll as (
      select
        (ts at time zone 'UTC')::date as day,
        percentile_cont(0.5) within group (order by scroll_pct)::int as median_scroll
      from windowed
      where type = 'engagement' and scroll_pct is not null
      group by 1
    )
    insert into daily_engagement (day, sessions, bounces, single_page, median_dwell_ms, median_scroll)
    select s.day, s.sessions, s.bounces, s.single_page, s.median_dwell_ms, scroll.median_scroll
    from sessions s
    left join scroll on scroll.day = s.day
    on conflict (day) do update
      set sessions        = excluded.sessions,
          bounces         = excluded.bounces,
          single_page     = excluded.single_page,
          median_dwell_ms = excluded.median_dwell_ms,
          median_scroll   = excluded.median_scroll
  `;

  // Per page engagement. Kept in its own table so the site wide figures above
  // stay one cheap row per day rather than something the dashboard has to
  // re-derive from a page level scan on every load.
  await sql`
    insert into daily_page_engagement (day, path, views, median_dwell_ms, median_scroll)
    select
      (ts at time zone 'UTC')::date,
      path,
      count(*) filter (where type = 'pageview')::int,
      (percentile_cont(0.5) within group (order by dwell_ms)
        filter (where type = 'engagement' and dwell_ms is not null))::int,
      (percentile_cont(0.5) within group (order by scroll_pct)
        filter (where type = 'engagement' and scroll_pct is not null))::int
    from events
    where ts >= current_date - make_interval(days => ${ROLLUP_WINDOW_DAYS})
      and path is not null
    group by 1, 2
    on conflict (day, path) do update
      set views           = excluded.views,
          median_dwell_ms = excluded.median_dwell_ms,
          median_scroll   = excluded.median_scroll
  `;

  // Outbound clicks and site searches. Searches that returned nothing get
  // their own kind rather than a flag, because they are read as a list of
  // their own: every row is somebody who wanted something the site does not
  // have, which is the closest thing here to an editorial to-do list.
  const rolled = asRows(await sql`
    insert into daily_intent (day, kind, target, count)
    select
      (ts at time zone 'UTC')::date,
      case
        when type = 'outbound' then 'outbound'
        when coalesce(result_count, 0) = 0 then 'search_zero'
        else 'search'
      end,
      target,
      count(*)::int
    from events
    where ts >= current_date - make_interval(days => ${ROLLUP_WINDOW_DAYS})
      and type in ('outbound', 'search')
      and target is not null
    group by 1, 2, 3
    on conflict (day, kind, target) do update
      set count = excluded.count
    returning day
  `);

  const pruned = asRows(await sql`
    delete from events
    where ts < now() - make_interval(days => ${RAW_EVENT_RETENTION_DAYS})
    returning id
  `);

  return {
    daysRolled: new Set(rolled.map((r) => String(r.day))).size,
    rawRowsPruned: pruned.length,
  };
}
