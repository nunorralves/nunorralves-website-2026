import { getProjectDetailHref } from "lib/links";
import {
  getAllPostsMetadataWithSlug,
  getAllProjectsMetadataWithSlug,
} from "lib/helpers";
import {
  contentAnnotations,
  type ContentItem,
  type NewAnnotation,
} from "./annotations";
import { asRows, getSql } from "./db";

// Every write to the annotations table, and nothing else. Reads live in
// queries.ts beside the rest of the dashboard's.
//
// Server only, and more strictly than the rest of lib/analytics: this imports
// lib/helpers.ts, which reads the filesystem with `fs`. Nothing the beacon, a
// card or any client component touches may import this file, directly or
// through a chain, or the bundler will try to follow `fs` into the browser.
// The two callers are the nightly cron route and the annotation write routes,
// both of which are server side by construction.

/**
 * Rebuild the content half of the timeline from frontmatter.
 *
 * Run on every nightly sync rather than on publish, because there is no
 * publish step: a post goes live when a file lands on main, and nothing calls
 * a webhook afterwards. Reading the frontmatter each night means the markers
 * for everything already written appeared the first time this ran, with no
 * backfill to remember, and a post added tomorrow appears the night after
 * without my doing anything at all.
 *
 * Three properties, in the order they matter:
 *
 *   - Upsert on the external key, so re-running never duplicates. The nightly
 *     job runs unconditionally and a backfill re-runs it by hand.
 *   - Editing a frontmatter date moves the marker, because the key is the
 *     slug and the date is an updated column, not part of the identity.
 *   - Content rows whose file has gone (deleted, or `published: false`) are
 *     removed. The UI cannot delete them, on purpose, so this is the only
 *     thing standing between an unpublished post and a marker that outlives it
 *     forever.
 */
export async function syncContentAnnotations(): Promise<{
  written: number;
  removed: number;
}> {
  const [posts, projects] = await Promise.all([
    getAllPostsMetadataWithSlug(),
    getAllProjectsMetadataWithSlug(),
  ]);

  const postItems: ContentItem[] = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    href: `/posts/${post.slug}`,
  }));

  // A project with neither a body nor a write-up has no page of its own, and
  // getProjectDetailHref is the one place that decides so. Null here rather
  // than a guessed /projects/<slug> that would 404 from the timeline.
  const projectItems: ContentItem[] = projects.map((project) => ({
    slug: project.slug,
    title: project.title,
    date: project.date,
    href: getProjectDetailHref(project),
  }));

  const rows = contentAnnotations(postItems, projectItems);
  const sql = getSql();

  let written = 0;
  if (rows.length > 0) {
    // One multi-row statement, same shape as the Vercel upserts in sync.ts:
    // every call to Neon's HTTP driver is a round trip, and this runs beside
    // two dozen of them already.
    await sql`
      insert into annotations (at, kind, label, url, source, external_key)
      select unnest(${rows.map((row) => row.at)}::date[]),
             unnest(${rows.map((row) => row.kind)}::text[]),
             unnest(${rows.map((row) => row.label)}::text[]),
             unnest(${rows.map((row) => row.url)}::text[]),
             'content',
             unnest(${rows.map((row) => row.externalKey)}::text[])
      on conflict (external_key) where external_key is not null
      do update set at    = excluded.at,
                    kind  = excluded.kind,
                    label = excluded.label,
                    url   = excluded.url
    `;
    written = rows.length;
  }

  // Anything derived that is no longer derivable. Scoped to source='content'
  // so a manual marker can never be swept up by a content pass, whatever its
  // key looks like.
  const keys = rows.map((row) => row.externalKey!);
  const removedRows = asRows(await sql`
    delete from annotations
    where source = 'content'
      and (external_key is null or not (external_key = any(${keys}::text[])))
    returning id
  `);

  return { written, removed: removedRows.length };
}

/** Add a marker I typed in. Validated by the caller; see parseAnnotationInput. */
export async function createManualAnnotation(
  row: NewAnnotation,
): Promise<number> {
  const rows = asRows(await getSql()`
    insert into annotations (at, kind, label, url, source, external_key)
    values (${row.at}, ${row.kind}, ${row.label}, ${row.url}, 'manual', null)
    returning id
  `);
  return Number(rows[0]?.id ?? 0);
}

/**
 * Delete a marker, if it is one of mine to delete.
 *
 * `source = 'manual'` in the WHERE clause is the actual guard. The disabled
 * button beside a content row is a courtesy to me; this is what holds when the
 * request arrives as a curl with the cookie attached and an id I picked out of
 * the page. Returns false when nothing matched, which covers both "no such
 * marker" and "that one comes from frontmatter" without telling the caller
 * which - there is only one caller and it is me.
 */
export async function deleteManualAnnotation(id: number): Promise<boolean> {
  const rows = asRows(await getSql()`
    delete from annotations where id = ${id} and source = 'manual'
    returning id
  `);
  return rows.length > 0;
}
