#!/usr/bin/env node
// Take a local copy of the analytics database, or push one back.
//
// Why this exists at all: Neon's Free plan keeps a six hour restore window.
// Six hours. The entire point of this project is to accumulate history that
// Vercel throws away after 30 days, and on the free plan that history has no
// backstop worth the name. Vercel does not back up the database for you
// either - the marketplace integration provisions it and stops there.
//
// The trailing 30 days can always be rebuilt by re-running the sync, because
// Vercel still holds them. Everything older than that exists in exactly one
// place, and this script is what makes that untrue.
//
// Usage:
//   node --env-file=.env.local scripts/backup-analytics.mjs
//   node --env-file=.env.local scripts/backup-analytics.mjs --restore backups/analytics-2026-08-30.json
//
// Restore is an upsert, not a wipe and reload. Every table here has a primary
// key and the nightly sync already writes with ON CONFLICT DO UPDATE, so
// replaying a backup over a live database converges instead of destroying
// whatever arrived since. That means it is safe to run when you are not sure
// you need it, which is the only kind of restore anybody ever actually runs.

import { neon } from "@neondatabase/serverless";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { BACKUP_TABLES } from "../lib/analytics/backup-tables.mjs";

// The table list and its keys live in lib/analytics/backup-tables.mjs, shared
// verbatim with app/insights/backup/route.ts. The dashboard's download button
// and this script are a backup and a restore of the same data, and the failure
// mode of two copies of the list is a dump that looks complete and is not.
const TABLES = BACKUP_TABLES;

// The same rule lib/analytics/db.ts uses, restated because a plain .mjs cannot
// import the TypeScript that owns it: Vercel's Neon integration prefixes the
// variables it manages, so production has WEBSITE_DATABASE_URL rather than
// DATABASE_URL. Exact name first, then anything ending in _DATABASE_URL.
function databaseUrl() {
  const candidates = [
    ...(process.env.DATABASE_URL ? ["DATABASE_URL"] : []),
    ...Object.keys(process.env)
      .filter((k) => k !== "DATABASE_URL" && k.endsWith("_DATABASE_URL") && process.env[k])
      .sort(),
  ];
  for (const name of candidates) {
    // Neon's dashboard hands the string over as `psql '...'`, and a UI that
    // does not strip quotes keeps them. Both are right apart from the wrapper.
    let value = process.env[name].trim();
    if (value.startsWith("psql ")) value = value.slice(5).trim();
    if (/^(".*"|'.*')$/s.test(value)) value = value.slice(1, -1).trim();
    if (/^postgres(ql)?:\/\//.test(value)) return value;
  }
  return undefined;
}

const url = databaseUrl();
if (!url) {
  console.error("No database connection string found. Try: node --env-file=.env.local scripts/backup-analytics.mjs");
  process.exit(1);
}

const sql = neon(url);
const restoreArg = process.argv.indexOf("--restore");

if (restoreArg === -1) {
  await backup();
} else {
  const file = process.argv[restoreArg + 1];
  if (!file) {
    console.error("--restore needs a file path");
    process.exit(1);
  }
  await restore(file);
}

async function backup() {
  const dump = { takenAt: new Date().toISOString(), tables: {} };
  let total = 0;

  for (const table of Object.keys(TABLES)) {
    // Table names come from the constant above, never from input, so the
    // interpolation here cannot be turned into an injection.
    //
    // sql.query, not sql(). Since @neondatabase/serverless 1.x the bare call
    // form is reserved for tagged templates and throws on a plain string.
    const rows = await sql.query(`select * from ${table} order by 1, 2`);
    dump.tables[table] = rows;
    total += rows.length;
    console.log(`  ${table.padEnd(24)} ${String(rows.length).padStart(7)} rows`);
  }

  const day = new Date().toISOString().slice(0, 10);
  const path = join("backups", `analytics-${day}.json`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(dump, null, 1));

  console.log(`\n${total} rows -> ${path}`);
  console.log("Keep this somewhere that is not Neon and not Vercel.");
}

async function restore(file) {
  const dump = JSON.parse(await readFile(file, "utf8"));
  console.log(`Restoring from ${file}, taken ${dump.takenAt}\n`);

  for (const [table, keys] of Object.entries(TABLES)) {
    const rows = dump.tables?.[table] ?? [];
    if (rows.length === 0) {
      console.log(`  ${table.padEnd(24)} nothing to restore`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const updatable = columns.filter((c) => !keys.includes(c));

    // One statement per row. Slower than a bulk load, but a restore runs
    // approximately never, and doing it row at a time means one malformed
    // row cannot take the whole file down with it.
    let written = 0;
    for (const row of rows) {
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const setters = updatable.map((c) => `${c} = excluded.${c}`).join(", ");
      await sql.query(
        `insert into ${table} (${columns.join(", ")}) values (${placeholders})
         on conflict (${keys.join(", ")}) do update set ${setters}`,
        columns.map((c) => row[c]),
      );
      written += 1;
    }
    console.log(`  ${table.padEnd(24)} ${String(written).padStart(7)} rows upserted`);
  }

  console.log("\nDone. Nothing was deleted; rows present here and absent from the backup were left alone.");
}
