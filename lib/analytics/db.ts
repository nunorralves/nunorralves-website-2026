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

export function getSql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Add the Neon integration to the project, or copy .env.example to .env.local for local work.",
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
  return Boolean(process.env.DATABASE_URL);
}

// The driver's return type is a union covering every output mode it supports
// (array rows, object rows, a full result envelope). We only ever use the
// default, which is object rows, so this narrows once here instead of at every
// call site.
export type Row = Record<string, unknown>;

export function asRows(result: unknown): Row[] {
  return result as Row[];
}
