import type { PostMetadata } from "./types";

// How old a post has to be before it picks up an age notice on its own.
// Everything about the notice - when it fires, what it says, and how a post
// opts out of it - lives in this file, so changing the threshold or the
// wording never means touching a component or a template.
export const OUTDATED_AFTER_YEARS = 3;

export interface OutdatedNotice {
  // The sentence to render. Custom text is authored markdown and goes through
  // the MDX pipeline; the generic wording is plain and never does.
  text: string;
  isCustom: boolean;
}

// The subset of frontmatter the decision actually depends on
type OutdatedInput = Pick<PostMetadata, "date" | "outdated" | "outdatedNote">;

function genericNotice(date: PostMetadata["date"]): string {
  const year = new Date(date).getFullYear();
  return `This post is from ${year} and may be out of date.`;
}

function isOlderThanThreshold(date: PostMetadata["date"], now: Date): boolean {
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - OUTDATED_AFTER_YEARS);
  return new Date(date).getTime() < cutoff.getTime();
}

// Precedence, highest first:
//   1. `outdated: false` suppresses the notice, even if a note was left behind
//   2. `outdatedNote` replaces the generic wording with its own text
//   3. `outdated: true` forces the generic wording on regardless of age
//   4. otherwise, age against OUTDATED_AFTER_YEARS decides
//
// `now` is a parameter rather than a `new Date()` inside so tests can pin a
// date instead of drifting with the calendar. In the app it defaults to build
// time: pages are statically generated, so a post crosses the threshold on
// the next deploy rather than on its anniversary.
export function getOutdatedNotice(
  metadata: OutdatedInput,
  now: Date = new Date(),
): OutdatedNotice | null {
  if (metadata.outdated === false) return null;

  const custom = metadata.outdatedNote?.trim();
  if (custom) return { text: custom, isCustom: true };

  if (metadata.outdated === true || isOlderThanThreshold(metadata.date, now)) {
    return { text: genericNotice(metadata.date), isCustom: false };
  }

  return null;
}
