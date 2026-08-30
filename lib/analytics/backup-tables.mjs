// What a backup contains, and what each table is keyed on.
//
// A .mjs file in a TypeScript project, deliberately. This list has two
// consumers that cannot share a module format: scripts/backup-analytics.mjs is
// a plain node script run with --env-file and no build step, and
// app/insights/backup/route.ts is TypeScript compiled by Next. Node cannot
// import the .ts and the script has no bundler to make it, so the definition
// lives in the one format both can read. `allowJs` in tsconfig.json is what
// lets the route import it, and lib/analytics/backup-tables.d.mts gives it a
// type.
//
// Keeping it in one place is not tidiness. The two halves are a backup and a
// restore of the same data, and a table added to one and forgotten in the
// other is a backup that looks complete and silently is not - which is a fact
// you discover on the day you need it.

/**
 * Table name to primary key columns. The keys are what a restore upserts on,
 * which is why every table here has to have one.
 */
export const BACKUP_TABLES = {
  vercel_totals: ["grain", "bucket"],
  vercel_breakdown: ["grain", "bucket", "dimension", "value"],
  daily_engagement: ["day"],
  daily_page_engagement: ["day", "path"],
  daily_intent: ["day", "kind", "target"],
  // The timeline. Small, hand-made in half and irreplaceable in that half:
  // "open sourced agentflows on the 21st" exists nowhere else, where the rows
  // above can at least be partly rebuilt from Vercel.
  annotations: ["id"],
  // Raw events are deliberately excluded. They are a 90 day working set that
  // the rollups above already summarise, they are far and away the largest
  // table, and they are the only one holding anything visitor-derived. A
  // backup that carries them would be bigger, less useful, and more sensitive
  // than one that does not.
};
