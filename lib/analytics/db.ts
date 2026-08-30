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
const POSTGRES_SCHEME = /^postgres(ql)?:\/\//;

/**
 * Clean up the ways a connection string arrives mangled.
 *
 * Neon's dashboard offers the string as `psql 'postgresql://...'`, ready to
 * paste into a terminal, and a UI that does not strip quotes keeps them. Both
 * produce a value that is right apart from its wrapper, and both fail with the
 * driver's rather opaque "connection string format should be" error.
 */
function normalise(value: string): string {
  let out = value.trim();
  if (out.startsWith("psql ")) out = out.slice(5).trim();
  const quoted =
    (out.startsWith('"') && out.endsWith('"')) ||
    (out.startsWith("'") && out.endsWith("'"));
  if (quoted) out = out.slice(1, -1).trim();
  return out;
}

/** Every variable that might hold it, most specific first. */
function candidates(): string[] {
  const exact = process.env.DATABASE_URL ? ["DATABASE_URL"] : [];
  const prefixed = Object.keys(process.env)
    .filter(
      (key) =>
        key !== "DATABASE_URL" &&
        key.endsWith("_DATABASE_URL") &&
        process.env[key],
    )
    .sort();
  return [...exact, ...prefixed];
}

export function databaseUrl(): string | undefined {
  // Checked rather than trusted. The scan above matches on a name, and a name
  // is not a promise: the first thing it found in production was something
  // that ended in _DATABASE_URL and did not contain a connection string, which
  // surfaced as the driver complaining about the format rather than as
  // anything pointing at the variable. A candidate that is not a Postgres URL
  // is skipped, so a decoy cannot mask the real one sitting behind it.
  for (const name of candidates()) {
    const value = normalise(process.env[name]!);
    if (POSTGRES_SCHEME.test(value)) return value;
  }
  return undefined;
}

/**
 * What was found, for the error message, by name and scheme only.
 *
 * Never the value: this comes back over HTTP to whoever holds CRON_SECRET, and
 * a connection string carries a password. The scheme is the whole of what is
 * diagnostic here, because the failure is always "that is not a Postgres URL".
 */
export function describeDatabaseUrlEnv(): string {
  const names = candidates();
  if (names.length === 0) {
    return "nothing is set under DATABASE_URL or any name ending in _DATABASE_URL";
  }
  return names
    .map((name) => {
      const value = normalise(process.env[name]!);
      const at = value.indexOf("://");
      return `${name} starts with ${at > 0 ? `${value.slice(0, at + 3)}` : "no scheme at all"}`;
    })
    .join("; ");
}

export function getSql() {
  if (!client) {
    const url = databaseUrl();
    if (!url) {
      throw new Error(
        `No usable database connection string. Looked for DATABASE_URL and for anything ending in _DATABASE_URL, which is what Vercel's Neon integration sets when the store is attached with a prefix, and required a postgres:// or postgresql:// value. Found: ${describeDatabaseUrlEnv()}.`,
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
