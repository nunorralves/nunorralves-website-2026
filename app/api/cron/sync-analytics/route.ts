import { NextResponse } from "next/server";
import { rollupBeaconEvents } from "lib/analytics/rollup";
import { syncFromVercel } from "lib/analytics/sync";

// Nothing about this route is cacheable or prerenderable: it writes.
export const dynamic = "force-dynamic";

// The run makes roughly two dozen sequential calls to Vercel plus the writes
// behind them, which is comfortably past the default function timeout. 60s is
// the Hobby ceiling and is far more headroom than the job needs.
export const maxDuration = 60;

/**
 * Nightly ETL. Pulls the rolling window from Vercel Web Analytics into Neon,
 * then folds any beacon events into their permanent daily rollups.
 *
 * Scheduled from vercel.json. Vercel sends CRON_SECRET as a bearer token on
 * cron invocations, and this refuses anything else, because the path itself is
 * public: the repository is open source, so the URL is known to everyone and
 * is not, and must not be, the thing keeping this closed.
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

  try {
    const sync = await syncFromVercel();
    const rollup = await rollupBeaconEvents();

    // A partial sync still moves history forward, so errors are reported
    // rather than thrown. The status code carries the difference so a failing
    // dimension is visible in Vercel's cron log instead of silently passing.
    return NextResponse.json(
      { ok: sync.errors.length === 0, sync, rollup },
      { status: sync.errors.length === 0 ? 200 : 207 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
