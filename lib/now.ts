import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { resolveContentDirectory } from "./content-path";

// The one hand-maintained surface on the home page. Everything else there
// (selected work, corrections, writing) derives from frontmatter and updates
// itself. This does not, so it carries its own review date rather than
// pretending to be as fresh as the rest of the page.
//
// The content lives in content/now/currently.md, next to the posts and
// projects, because every editable word on this site belongs under content/.
// This file only reads it.
//
// tests/e2e/now-freshness.spec.ts fails the build once `reviewed` is more
// than 90 days old, the same trick tests/e2e/content-dates.spec.ts already
// runs on post frontmatter: a stale value here is worse than none, because
// nothing else on the site will ever flag it.

const NOW_FILE = path.join(resolveContentDirectory("now"), "currently.md");

export interface CurrentlyField {
  label: string;
  value: string;
}

export interface Now {
  fields: CurrentlyField[];
  // The body of the file. The only line on the page that never goes stale,
  // so it is deliberately not one of the dated fields above.
  standingLine: string;
  // ISO date, YYYY-MM-DD.
  reviewed: string;
}

// Throws rather than rendering an empty rail. Like lib/series.ts, bad content
// data should fail the build loudly: a Currently block that quietly lost its
// fields would look like a design choice rather than a broken file.
export function getNow(): Now {
  const { data, content } = matter(fs.readFileSync(NOW_FILE, "utf8"));

  const fields = (data.fields ?? []) as CurrentlyField[];
  if (fields.length === 0) {
    throw new Error(`${NOW_FILE} has no \`fields\``);
  }
  for (const field of fields) {
    if (!field?.label || !field?.value) {
      throw new Error(`${NOW_FILE} has a field missing its label or value`);
    }
  }

  if (!data.reviewed) {
    throw new Error(`${NOW_FILE} has no \`reviewed\` date`);
  }

  const standingLine = content.trim();
  if (standingLine.length === 0) {
    throw new Error(`${NOW_FILE} has no standing line in its body`);
  }

  return {
    fields,
    standingLine,
    // YAML parses an unquoted date into a Date, a quoted one into a string.
    // Normalise so callers only ever see YYYY-MM-DD and the file stays
    // forgiving about which one you type.
    reviewed:
      data.reviewed instanceof Date
        ? data.reviewed.toISOString().slice(0, 10)
        : String(data.reviewed),
  };
}
