import { neon } from "@neondatabase/serverless";

// The database handle, created on first use and never at module scope.
//
// This matters more than it looks. `next build` evaluates modules while
// prerendering, and CI has no DATABASE_URL, so a top level
// `const sql = neon(process.env.DATABASE_URL!)` would throw during the build
// and take the whole GitHub Actions run down with it. Everything analytics
// related is dynamic or cron driven, so nothing legitimately needs a
// connection at build time. Deferring the constructor keeps the build green
// on a machine that has never heard of the database.
let client: ReturnType<typeof neon> | null = null;

/**
 * The connection string, under whichever name it happens to be filed.
 *
 * Vercel's Neon integration lets you prefix every variable it manages when a
 * store is attached, and this project's is attached with a WEBSITE_ prefix. So
 * production has WEBSITE_DATABASE_URL and no DATABASE_URL at all, and the cron
 * answered "DATABASE_URL is not set" while sitting next to a perfectly good
 * connection string.
 *
 * The obvious fix is to paste the value into a second, unprefixed variable.
 * That works right up until Neon rotates the credential: the integration
 * updates the variable it owns, the hand-made copy goes stale, and the nightly
 * job starts failing in a way nobody looks at for a week. Reading whatever the
 * integration actually set means rotation keeps working by itself.
 *
 * The exact name still wins, so .env.local and any deliberate override behave
 * as before. Candidates are sorted so that a project with two attached stores
 * resolves the same way on every cold start, rather than by whatever order the
 * environment happens to enumerate in. `_DATABASE_URL_UNPOOLED`, which Neon
 * also sets, does not match, which is correct: the HTTP driver wants the
 * pooled endpoint.
 */
export function databaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const prefixed = Object.keys(process.env)
    .filter((key) => key.endsWith("_DATABASE_URL") && process.env[key])
    .sort();

  return prefixed.length > 0 ? process.env[prefixed[0]!] : undefined;
}

export function getSql() {
  if (!client) {
    const url = databaseUrl();
    if (!url) {
      throw new Error(
        "No database connection string found. Looked for DATABASE_URL and for anything ending in _DATABASE_URL, which is what Vercel's Neon integration sets when the store is attached with a prefix. Add the Neon integration to the project, or copy .env.example to .env.local for local work.",
      );
    }
    client = neon(url);
  }
  return client;
}

// Whether the database is even configured. The dashboard uses this to render
// a "not connected yet" state rather than a stack trace, which is the normal
// situation on a fresh clone or a preview deployment without the integration.
export function isDbConfigured() {
  return Boolean(databaseUrl());
}

// The driver's return type is a union covering every output mode it supports
// (array rows, object rows, a full result envelope). We only ever use the
// default, which is object rows, so this narrows once here instead of at every
// call site.
export type Row = Record<string, unknown>;

export function asRows(result: unknown): Row[] {
  return result as Row[];
}
