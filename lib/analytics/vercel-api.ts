import { BREAKDOWN_LIMIT, type Dimension, type Grain } from "./config";

const API_BASE = "https://api.vercel.com/v1/query/web-analytics";

// One row as we want it, whatever shape Vercel handed back. `value` is null
// for the totals query, which has no dimension attached.
export type AggregateRow = {
  bucket: string; // ISO date, the start of the grain's bucket
  value: string | null;
  pageviews: number;
  visitors: number;
};

type VercelRow = Record<string, unknown> & {
  timestamp?: string;
  pageviews?: number;
  visitors?: number;
};

// Everything this module needs before it can ask Vercel anything.
const REQUIRED_ENV = ["VERCEL_PROJECT_ID", "VERCEL_ANALYTICS_TOKEN"] as const;

/**
 * Which of them are missing, all of them at once.
 *
 * The per-call `requireEnv` below throws on the first one it touches, and the
 * sync catches per query, so a deployment missing both variables answers with
 * twenty four copies of "VERCEL_PROJECT_ID is not set" and no hint that the
 * token is absent too. You fix the one it named, run again, and get twenty
 * four copies of the next one. Checking up front turns two round trips through
 * the Vercel dashboard into one.
 */
export function missingVercelEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. See .env.example.`);
  }
  return value;
}

/**
 * Query Vercel Web Analytics for one grain and at most one dimension.
 *
 * Two things worth knowing about this endpoint that are not obvious from the
 * call site:
 *
 * 1. `by` takes at most two dimensions, and at most one of them may be a time
 *    grain. That ceiling is the reason the schema stores marginal totals per
 *    dimension rather than one wide fact table: asking for day, country and
 *    route together is simply not expressible, so "visitors from Portugal to
 *    /posts/x" cannot be answered from this source at any price. The beacon
 *    covers that gap for traffic after launch.
 *
 * 2. `filter` defaults to production only when omitted, which is exactly what
 *    we want, so there is deliberately no filter here. Passing one would mean
 *    having to restate the production constraint ourselves.
 */
export async function fetchAggregate(options: {
  grain: Grain;
  dimension?: Dimension;
  since: Date;
  until: Date;
}): Promise<AggregateRow[]> {
  const { grain, dimension, since, until } = options;

  const params = new URLSearchParams();
  params.set("projectId", requireEnv("VERCEL_PROJECT_ID"));
  params.set("since", since.toISOString());
  params.set("until", until.toISOString());
  params.set("limit", String(BREAKDOWN_LIMIT));
  // Array parameters repeat the key rather than using a bracket or comma
  // syntax. Order matters to the response shape, so the time grain goes first.
  params.append("by", grain);
  if (dimension) params.append("by", dimension);

  const res = await fetch(`${API_BASE}/visits/aggregate?${params}`, {
    headers: {
      Authorization: `Bearer ${requireEnv("VERCEL_ANALYTICS_TOKEN")}`,
    },
    // The cron is the only caller and it wants today's truth, not a copy of
    // whatever the last invocation saw.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Vercel Analytics ${res.status} for grain=${grain} dimension=${dimension ?? "none"}: ${body.slice(0, 300)}`,
    );
  }

  const json = (await res.json()) as { data?: VercelRow[] };
  const rows = json.data ?? [];

  return rows.map((row) => {
    // Vercel returns the dimension under its own field name, so we read it by
    // the same key we asked for. Values can legitimately be absent (a direct
    // visit has no referrer hostname), and an empty string would collide with
    // a real value in the primary key, so those collapse to a single explicit
    // bucket instead.
    const raw = dimension ? row[dimension] : null;
    const value =
      dimension === undefined
        ? null
        : raw === null || raw === undefined || raw === ""
          ? "(none)"
          : String(raw);

    return {
      bucket: String(row.timestamp ?? "").slice(0, 10),
      value,
      pageviews: Number(row.pageviews ?? 0),
      visitors: Number(row.visitors ?? 0),
    };
  })
  // A row without a timestamp cannot be keyed and would upsert onto garbage.
  .filter((row) => row.bucket.length === 10);
}
