import { NextResponse } from "next/server";
import { getSql, isDbConfigured } from "lib/analytics/db";
import { clientIpFrom, sessionIdFor } from "lib/analytics/session";

export const dynamic = "force-dynamic";

// The four things the beacon is allowed to say. Anything else is dropped
// rather than stored, so the `type` column can never hold a value the rollup
// queries do not know how to fold.
const TYPES = new Set(["pageview", "engagement", "outbound", "search"]);

// Hard ceilings on everything that reaches the database. This endpoint is a
// public write path into a schema that anyone can read in the repository, so
// the assumption is that every field will eventually arrive full of garbage.
const MAX_BODY_BYTES = 2_000;
const MAX_PATH = 512;
const MAX_TARGET = 512;
const MAX_HOST = 253;

// Best effort rate limiting, deliberately not oversold: this map lives in one
// serverless instance and is lost on every cold start, so a determined flood
// spread across instances gets through. It exists to stop the ordinary case,
// a loop or a stuck client hammering the endpoint, cheaply and without a
// round trip. The real bounds on damage are the field caps above and the 90
// day prune, which together mean abuse costs storage for a while and nothing
// else.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const seen = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string, now: number): boolean {
  const entry = seen.get(key);
  if (!entry || now > entry.resetAt) {
    seen.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    // Opportunistic sweep so the map cannot grow without bound on a long
    // lived instance.
    if (seen.size > 5_000) {
      for (const [k, v] of seen) if (now > v.resetAt) seen.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return trimmed.slice(0, max);
}

function int(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * The first party beacon endpoint.
 *
 * Everything Vercel cannot tell us lands here: sessions, dwell, scroll depth,
 * outbound clicks and site searches. Custom events need a Pro plan, so on
 * Hobby this is the only route to any of it, and it has the useful side
 * effect of not counting against the 50k monthly event allowance.
 *
 * Always answers 204, even when it drops the payload. A beacon has nobody to
 * report an error to, and telling a prospective abuser which field failed
 * validation is free help.
 */
export async function POST(request: Request) {
  if (!isDbConfigured() || !process.env.ANALYTICS_SECRET) {
    return new NextResponse(null, { status: 204 });
  }

  // Production only, and this is a data integrity rule rather than a
  // performance one.
  //
  // DATABASE_URL in .env.local points at the same Neon database the deployed
  // site writes to, so every page I opened while building this wrote real
  // looking sessions into real analytics. The first backfill surfaced it as a
  // "median read" of three and a half minutes, which was a preview tab left
  // open on my own machine. Dev traffic is not traffic.
  //
  // The Vercel half of the pipeline never had this problem: its API defaults
  // to production and answers nothing else. This is the beacon catching up.
  //
  // Set ANALYTICS_ALLOW_LOCAL_BEACON=1 to write from a local run anyway, which
  // is the only way to exercise this endpoint end to end. Keep it out of
  // Vercel, where VERCEL_ENV already says the truth.
  const isProduction = process.env.VERCEL_ENV === "production";
  const allowLocal = process.env.ANALYTICS_ALLOW_LOCAL_BEACON === "1";
  if (!isProduction && !allowLocal) {
    return new NextResponse(null, { status: 204 });
  }

  // Off site callers have no business here. Not a security boundary, since
  // the header is trivially forged, but it filters the casual case.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && !origin.endsWith(host)) {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 });
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  if (typeof body !== "object" || body === null) {
    return new NextResponse(null, { status: 204 });
  }

  const payload = body as Record<string, unknown>;
  const type = str(payload.type, 20);
  if (!type || !TYPES.has(type)) {
    return new NextResponse(null, { status: 204 });
  }

  const headers = request.headers;
  const userAgent = headers.get("user-agent") ?? "";

  let sessionId: string;
  try {
    sessionId = sessionIdFor({ ip: clientIpFrom(headers), userAgent });
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  if (rateLimited(sessionId, Date.now())) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const sql = getSql();
    await sql`
      insert into events (session_id, type, path, referrer_host, country, scroll_pct, dwell_ms, target, result_count)
      values (
        ${sessionId},
        ${type},
        ${str(payload.path, MAX_PATH)},
        ${str(payload.referrer, MAX_HOST)},
        ${headers.get("x-vercel-ip-country")},
        ${int(payload.scroll, 0, 100)},
        ${int(payload.dwell, 0, 86_400_000)},
        ${str(payload.target, MAX_TARGET)},
        ${int(payload.results, 0, 10_000)}
      )
    `;
  } catch {
    // A write failure must never surface to the visitor. Analytics is not
    // worth a console error on a page somebody came to read.
  }

  return new NextResponse(null, { status: 204 });
}
