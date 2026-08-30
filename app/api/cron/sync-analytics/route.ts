import { NextResponse } from "next/server";
import { syncContentAnnotations } from "lib/analytics/annotations-store";
import { VERCEL_RETENTION_DAYS } from "lib/analytics/config";
import { describeDatabaseUrlEnv, isDbConfigured } from "lib/analytics/db";
import { rollupBeaconEvents } from "lib/analytics/rollup";
import { syncFromVercel } from "lib/analytics/sync";
import { missingVercelEnv } from "lib/analytics/vercel-api";

// Nothing about this route is cacheable or prerenderable: it writes.
export const dynamic = "force-dynamic";

// The run makes roughly two dozen sequential calls to Vercel plus the writes
// behind them, which is comfortably past the default function timeout. 60s is
// the Hobby ceiling and is far more headroom than the job needs.
export const maxDuration = 60;

/**
 * Nightly ETL. Pulls the rolling window from Vercel Web Analytics into Neon,
 * folds any beacon events into their permanent daily rollups, and rebuilds the
 * content half of the timeline from post and project frontmatter.
 *
 * Scheduled from vercel.json. Vercel sends CRON_SECRET as a bearer token on
 * cron invocations, and this refuses anything else, because the path itself is
 * public: the repository is open source, so the URL is known to everyone and
 * is not, and must not be, the thing keeping this closed.
 *
 * `?days=N` widens the window to N days for every grain, which is what
 * scripts/backfill-analytics.mjs uses to pull everything Vercel still holds.
 * Vercel's cron never sends it, so the nightly behaviour is untouched. It sits
 * behind the same bearer token as everything else here: a stranger being able
 * to make the server do 24 extra API calls is a small thing, but it is not
 * nothing, and there is no reason to give it away.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clamped rather than trusted. Past the retention line Vercel has nothing to
  // give, so a larger number would only widen the request for no extra rows,
  // and a zero or negative one would ask for an empty window.
  const requested = new URL(request.url).searchParams.get("days");
  const parsed = requested === null ? undefined : Number(requested);
  if (parsed !== undefined && !Number.isFinite(parsed)) {
    return NextResponse.json(
      { error: "days must be a number" },
      { status: 400 },
    );
  }
  const days =
    parsed === undefined
      ? undefined
      : Math.min(VERCEL_RETENTION_DAYS, Math.max(1, Math.round(parsed)));

  // Answered before the sync rather than as a driver error thirty seconds in.
  // "Database connection string format for `neon()` should be ..." says
  // nothing about which variable was wrong, which is the only thing you need
  // to know when a deployment has several of them.
  if (!isDbConfigured()) {
    return NextResponse.json(
      { ok: false, error: `No usable database connection string. Found: ${describeDatabaseUrlEnv()}.` },
      { status: 500 },
    );
  }

  // Same idea one layer up. Without this the credentials check happens inside
  // each of the twenty four queries, so a deployment that is missing them
  // answers with twenty four identical errors and buries the one fact worth
  // reading. Named together, and before any work, because both come from the
  // same page of the Vercel dashboard and there is no reason to make you go
  // back twice.
  const missing = missingVercelEnv();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Not set in this environment: ${missing.join(", ")}. Add them in Project Settings -> Environment Variables. See .env.example.`,
      },
      { status: 500 },
    );
  }

  try {
    const sync = await syncFromVercel(new Date(), { days });
    const rollup = await rollupBeaconEvents();

    // The timeline's automatic half, rebuilt from the .mdx files on disk. This
    // is why it needs no publish hook and no manual step: a post goes live
    // when a file lands on main, and the next run of this reads it. Every
    // write is an upsert on the external key, so re-running moves markers
    // whose frontmatter dates changed and duplicates nothing.
    //
    // Its own try/catch because it is the one step here that touches the
    // filesystem rather than an API. A content file with unreadable
    // frontmatter must not cost me the Vercel sync that already succeeded
    // above and cannot be redone once the retention window has moved.
    let annotations: { written: number; removed: number } | null = null;
    let annotationsError: string | null = null;
    try {
      annotations = await syncContentAnnotations();
    } catch (error) {
      annotationsError = (error as Error).message;
    }

    // A partial sync still moves history forward, so errors are reported
    // rather than thrown. The status code carries the difference so a failing
    // dimension is visible in Vercel's cron log instead of silently passing.
    const clean = sync.errors.length === 0 && annotationsError === null;
    return NextResponse.json(
      { ok: clean, sync, rollup, annotations, annotationsError },
      { status: clean ? 200 : 207 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
