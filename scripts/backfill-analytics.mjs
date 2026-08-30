#!/usr/bin/env node
// Set up the analytics database, then pull everything Vercel still holds.
//
// Two jobs, both of which are run-once by nature:
//
// 1. Apply lib/analytics/schema.sql. It is idempotent, so this is safe to
//    repeat. It lives here rather than in a psql invocation because psql is a
//    Postgres install nobody needs otherwise, and the Neon driver is already a
//    dependency.
//
// 2. Ask the running app to sync with the widest window Vercel will answer.
//    Hobby keeps 30 days; everything before that is already gone. The normal
//    nightly run only re-reads a week, which is right for keeping a live
//    mirror honest and wrong for a database that starts empty.
//
// Why this drives the app's own endpoint rather than calling Vercel itself:
// the fetch, the "(none)" collapsing, the bucket keys and the upserts all live
// in lib/analytics, and a second copy of them here would be the one that drifts
// and starts writing subtly different rows. Going through the endpoint means
// this script exercises the exact code that runs every night, which is also
// the thing worth proving before trusting the cron.
//
// Usage:
//   npm run analytics:backfill
//   npm run analytics:backfill -- --url https://nunorralves.pt
//   npm run analytics:backfill -- --days 30 --schema-only
//
// Locally the dev server has to be up (npm run dev) because that is the app
// being asked. Against production, --url points at the deployment and no local
// server is involved at all.

import { neon } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

const VERCEL_RETENTION_DAYS = 30;

function flag(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

const baseUrl = (flag("url", "http://localhost:3000") ?? "").replace(/\/$/, "");
const days = Number(flag("days", String(VERCEL_RETENTION_DAYS)));
const schemaOnly = process.argv.includes("--schema-only");

// The same rule lib/analytics/db.ts uses, restated because a plain .mjs cannot
// import the TypeScript that owns it: Vercel's Neon integration prefixes the
// variables it manages, so production has WEBSITE_DATABASE_URL rather than
// DATABASE_URL. Exact name first, then anything ending in _DATABASE_URL.
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const prefixed = Object.keys(process.env)
    .filter((key) => key.endsWith("_DATABASE_URL") && process.env[key])
    .sort();
  return prefixed.length > 0 ? process.env[prefixed[0]] : undefined;
}

const connection = databaseUrl();
if (!connection) {
  console.error(
    "No database connection string found.\n" +
      "Looked for DATABASE_URL and for anything ending in _DATABASE_URL.\n" +
      "Paste the Neon connection string into .env.local, then run:\n" +
      "  npm run analytics:backfill",
  );
  process.exit(1);
}

const sql = neon(connection);

await applySchema();
if (!schemaOnly) await backfill();
await report();

/**
 * Run schema.sql one statement at a time.
 *
 * Neon's HTTP driver sends a single statement per round trip, so the file has
 * to be split. Every comment in schema.sql is a whole line of its own, which
 * is what makes the naive split safe here: strip the comment lines, then cut
 * on semicolons. If a `--` ever ends up mid-line or a semicolon inside a
 * string literal, this needs a real parser rather than a regex.
 */
async function applySchema() {
  const file = await readFile("lib/analytics/schema.sql", "utf8");
  const statements = file
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  console.log(`Applying schema: ${statements.length} statements`);
  for (const statement of statements) {
    // sql.query, not sql(). Since @neondatabase/serverless 1.x the bare call
    // form is reserved for tagged templates and throws on a plain string, so
    // anything with no interpolation to do has to go through .query. The
    // statements come from a file in this repository, never from input.
    await sql.query(statement);
  }
  console.log("  every create is IF NOT EXISTS, so nothing was dropped\n");
}

async function backfill() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(
      "CRON_SECRET is not set, and the sync endpoint refuses callers without it.\n" +
        "It only has to match between this script and the server it is calling.\n" +
        "Add this to .env.local (and to the Vercel project, if you want the same one there):\n\n" +
        `  CRON_SECRET=${randomBytes(32).toString("hex")}\n\n` +
        "Then restart the dev server so it picks the value up, and run this again.",
    );
    process.exit(1);
  }

  const target = `${baseUrl}/api/cron/sync-analytics?days=${days}`;
  console.log(`Backfilling ${days} days via ${target}`);
  console.log("  roughly two dozen calls to Vercel, so give it a minute\n");

  let res;
  try {
    res = await fetch(target, {
      headers: { authorization: `Bearer ${secret}` },
    });
  } catch (error) {
    console.error(
      `Could not reach ${baseUrl}: ${error.message}\n` +
        "If this is the local server, is `npm run dev` running?",
    );
    process.exit(1);
  }

  const body = await res.json().catch(() => ({}));

  if (res.status === 401) {
    console.error(
      "401 from the sync endpoint: CRON_SECRET here does not match the one the\n" +
        "server booted with. Restart the server after editing .env.local.",
    );
    process.exit(1);
  }

  if (!res.ok && res.status !== 207) {
    console.error(`${res.status} from the sync endpoint:`, body);
    process.exit(1);
  }

  const { sync = {}, rollup = {} } = body;
  console.log(`  ${sync.queries ?? 0} queries to Vercel`);
  console.log(`  ${sync.rowsWritten ?? 0} rows written`);
  console.log(`  beacon rollup: ${rollup.daysRolled ?? 0} days\n`);

  // 207 means some dimensions failed and the rest went through. Worth shouting
  // about, not worth failing on: a partial sync still moved history forward,
  // and every write is an upsert so re-running costs nothing.
  for (const error of sync.errors ?? []) console.error(`  failed: ${error}`);
}

/** What actually landed, read straight back out of the database. */
async function report() {
  const totals = await sql.query(`
    select grain, count(*) as buckets,
           min(bucket)::text as first, max(bucket)::text as last,
           sum(pageviews) as pageviews
    from vercel_totals group by grain order by grain
  `);

  if (totals.length === 0) {
    console.log("vercel_totals is empty. Nothing was written.");
    return;
  }

  console.log("Stored now:");
  for (const row of totals) {
    console.log(
      `  ${String(row.grain).padEnd(6)} ${String(row.buckets).padStart(4)} buckets` +
        `  ${row.first} to ${row.last}` +
        `  ${String(row.pageviews).padStart(6)} page views`,
    );
  }

  const breakdown = await sql.query(
    `select dimension, count(*) as rows from vercel_breakdown group by dimension order by dimension`,
  );
  if (breakdown.length > 0) {
    console.log("\nBreakdown rows:");
    for (const row of breakdown) {
      console.log(`  ${String(row.dimension).padEnd(18)} ${row.rows}`);
    }
  }

  console.log(
    "\nFrom here the nightly cron in vercel.json keeps this current;\n" +
      "nothing else needs running by hand.",
  );
}
