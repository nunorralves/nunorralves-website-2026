// The one hand-maintained surface on the home page. Everything else there -
// selected work, corrections, writing - derives from frontmatter and updates
// itself. This does not, so it carries its own review date rather than
// pretending to be as fresh as the rest of the page.
//
// tests/e2e/now-freshness.spec.ts fails the build once `reviewed` is more
// than 90 days old, the same trick tests/e2e/content-dates.spec.ts already
// runs on post frontmatter: a stale field here is worse than none, because
// nothing else on the site will ever flag it.

export interface CurrentlyField {
  label: string;
  value: string;
}

export const CURRENTLY: CurrentlyField[] = [
  {
    label: "At work",
    value:
      "Platform at Entrust, identity verification. Workflow orchestration, the public APIs, and the reliability work nobody notices until it is missing.",
  },
  {
    label: "Thinking about",
    value:
      "Where agentic systems belong in a platform org, and what determinism they cost you.",
  },
  {
    label: "Building",
    value: "agentflows, coded agent workflows.",
  },
];

// The only line on the page that never goes stale. It started as the second
// paragraph of /about's "What I do now"; that paragraph has since been
// reworded so the two pages do not read as a verbatim duplicate, and this is
// the version that keeps the original, more clipped phrasing.
export const STANDING_LINE =
  "Decide what we own. Decide who owns it. Keep the architecture and the org chart from drifting apart.";

export const REVIEWED = "2026-08-28";
