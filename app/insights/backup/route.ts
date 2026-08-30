import { BACKUP_TABLES } from "lib/analytics/backup-tables.mjs";
import { getSql, isDbConfigured } from "lib/analytics/db";

// Reads a database, so it can never be prerendered or cached.
export const dynamic = "force-dynamic";

// Dumping every aggregate table is more work than a page render, and the whole
// history goes over one HTTP connection to Neon per table.
export const maxDuration = 60;

/**
 * Download a copy of the analytics database as JSON.
 *
 * Why a button and not just the script: Neon's free plan keeps a six hour
 * restore window. Six hours, on the store whose entire purpose is to hold the
 * history Vercel throws away after 31 days. scripts/backup-analytics.mjs
 * already does this, and doing it needs a terminal, a checkout and
 * DATABASE_URL to hand, which in practice means it happens when I remember it.
 * This is the same dump, one click from the page I already open.
 *
 * There is deliberately no matching restore. Restore is a write path across
 * every table at once, and behind a single password a leaked cookie would
 * become arbitrary database writes. It stays a script that needs a terminal
 * and the connection string: the asymmetry is the point, because the damage a
 * read can do is bounded and the damage a write can do is not.
 *
 * The table list and its keys come from lib/analytics/backup-tables.mjs, the
 * same module the script reads, so a table added to one is added to both. A
 * dump that silently omits a table looks exactly like a complete one right up
 * until the day it matters.
 *
 * `events` is not in that list. Raw beacon rows are a 90 day working set the
 * rollups already summarise, they are the largest table by a wide margin, and
 * they are the only one holding anything visitor-derived. Leaving them out
 * makes the file smaller, more useful and less sensitive at once.
 */
export async function GET() {
  if (!isDbConfigured()) {
    return Response.json(
      { error: "No database is configured here, so there is nothing to back up." },
      { status: 503 },
    );
  }

  const sql = getSql();
  const takenAt = new Date().toISOString();
  const encoder = new TextEncoder();

  // Streamed table by table rather than assembled into one object and
  // stringified. Neon's HTTP driver has no cursor, so each table still arrives
  // whole, but only one is ever in memory at a time and the download starts
  // before the last query has run.
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      try {
        push(`{\n "takenAt": ${JSON.stringify(takenAt)},\n "tables": {\n`);

        const tables = Object.keys(BACKUP_TABLES);
        for (const [index, table] of tables.entries()) {
          // Table names come from the constant, never from the request, so
          // this interpolation cannot be turned into an injection. There is no
          // parameter form for an identifier anyway.
          //
          // sql.query, not sql(). Since @neondatabase/serverless 1.x the bare
          // call form is reserved for tagged templates and throws on a string.
          const rows = await sql.query(`select * from ${table} order by 1, 2`);
          push(`  ${JSON.stringify(table)}: ${JSON.stringify(rows)}`);
          push(index === tables.length - 1 ? "\n" : ",\n");
        }

        push(" }\n}\n");
        controller.close();
      } catch (error) {
        // The response has already started, so there is no status code left to
        // change. Closing mid-object leaves invalid JSON, which is the honest
        // outcome: a truncated backup that parses is a backup you would trust.
        console.error("backup: dump failed", error);
        controller.error(error);
      }
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Dated, because the point of this file is to sit in a folder next to
      // the ones taken before it.
      "content-disposition": `attachment; filename="analytics-${takenAt.slice(0, 10)}.json"`,
      // Belt and braces with dynamic above. This is the whole database.
      "cache-control": "no-store, private",
    },
  });
}
