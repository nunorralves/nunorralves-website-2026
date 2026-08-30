import { differenceInCalendarDays } from "date-fns";
import type { DateRange } from "./ranges";

// The sentence above the numbers.
//
// Pure, and free of any database or React import, for the same reason
// ranges.ts is: it is the piece most likely to be wrong in a way a chart would
// not show, so it has to be testable without a connection.
//
// The rule it follows is "say the largest true thing". A dashboard that always
// opens with "1,584 visitors, up 12%" trains you to stop reading the sentence,
// because it says the same shape every time whether or not anything happened.
// So the candidates below are ordered by how much each would change what I do
// next, and the first one that clears its threshold wins.

export type SummaryInput = {
  range: DateRange;
  pageviews: number;
  /** Null when there is no comparable earlier window to measure against. */
  previousPageviews: number | null;
  topPage: { value: string; pageviews: number } | null;
  topReferrer: { value: string; pageviews: number } | null;
  outbound: number;
  zeroSearches: { target: string; count: number }[];
};

export type Summary = { headline: string; subline: string };

// Below this, a percentage swing is noise on a site this size: a single link
// shared anywhere moves a week by ten percent.
const NOTABLE_CHANGE = 0.2;

// A page has to be carrying most of the range before "this one post is the
// story" is a fair thing to say.
const DOMINANT_SHARE = 0.4;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function spanWords(range: DateRange): string {
  const days = Math.max(1, differenceInCalendarDays(range.to, range.from));
  return plural(days, "day", "days");
}

export function buildConclusion(input: SummaryInput): Summary {
  if (input.pageviews === 0) {
    return {
      headline: "Nothing has arrived for this range yet.",
      subline:
        "Either the range predates the first sync, or the nightly job has not run since it started.",
    };
  }

  return {
    headline: pickHeadline(input) ?? fallbackHeadline(input),
    subline: buildSubline(input),
  };
}

function pickHeadline(input: SummaryInput): string | null {
  const { pageviews, previousPageviews, topPage, topReferrer } = input;

  // 1. A real move against the previous window of the same length. The only
  //    candidate that says something changed rather than something is.
  if (previousPageviews !== null && previousPageviews > 0) {
    const change = (pageviews - previousPageviews) / previousPageviews;
    if (Math.abs(change) >= NOTABLE_CHANGE) {
      const direction = change > 0 ? "rose" : "fell";
      return `Reading ${direction} ${percent(Math.abs(change))} against the previous ${spanWords(input.range)}.`;
    }
  }

  // 2. One page carrying the range. On a site of a dozen posts this is usually
  //    the truest single sentence available.
  if (topPage && topPage.pageviews / pageviews >= DOMINANT_SHARE) {
    return `${topPage.value} carried ${percent(topPage.pageviews / pageviews)} of everything read in this range.`;
  }

  // 3. Where it came from, when no single page owns it. "(none)" is what the
  //    ETL writes for a direct visit, and "most of it was direct" is not an
  //    insight, so that value is skipped rather than reported.
  if (
    topReferrer &&
    topReferrer.value !== "(none)" &&
    topReferrer.pageviews / pageviews >= DOMINANT_SHARE
  ) {
    return `Most of this range arrived from ${topReferrer.value}.`;
  }

  return null;
}

// Nothing cleared a threshold, which is itself the finding: a quiet range.
function fallbackHeadline(input: SummaryInput): string {
  return `${input.pageviews.toLocaleString("en-GB")} page views over ${spanWords(input.range)}, and nothing in the range stands out.`;
}

/**
 * The second line, always about what people did rather than how many they
 * were. Outbound clicks are the conversion on a site whose job is to be a
 * professional profile, and a search that found nothing is a content gap
 * stated out loud, so those two crowd out everything else.
 */
function buildSubline(input: SummaryInput): string {
  const parts: string[] = [];

  if (input.outbound > 0) {
    parts.push(plural(input.outbound, "outbound click", "outbound clicks"));
  }

  const zero = input.zeroSearches;
  if (zero.length > 0) {
    const times = zero.reduce((sum, row) => sum + row.count, 0);
    const top = zero[0]!;
    parts.push(
      top.count > 1
        ? `${plural(times, "search", "searches")} found nothing, ${top.count} of them for "${top.target}"`
        : `${plural(times, "search", "searches")} found nothing`,
    );
  }

  if (parts.length === 0) {
    return "No outbound clicks and no empty searches in this range.";
  }

  // " - " rather than a dash, matching the rest of the site's copy.
  return `${parts.join(" - ")}.`;
}
