// The timeline, as pure logic: what an annotation is, how content turns into
// one, what a submitted form has to survive, and how a marker's lift is
// measured against the days around it.
//
// Deliberately free of `fs`, of any database import and of React, for the same
// reason ranges.ts and summary.ts are. The lift calculation in particular is
// the piece most likely to be wrong in a way nothing on screen would betray -
// a plausible looking percentage next to a marker is worse than no percentage
// at all - so it has to be testable without a connection and without a page.

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

// Mirrors the check constraint in schema.sql. Two statements of the same list
// is one more than I would like, but the database has to defend itself against
// anything that reaches it by another route, and the form has to reject a bad
// value before it ever gets that far.
export const ANNOTATION_KINDS = [
  "post",
  "project",
  "profile",
  "external",
  "note",
] as const;

export type AnnotationKind = (typeof ANNOTATION_KINDS)[number];

// Where the row came from, which is also what decides whether it can be
// deleted from the dashboard. `content` rows are a projection of frontmatter
// and are rebuilt on every nightly run, so deleting one would either resurrect
// it the next night or, worse, quietly not.
export const ANNOTATION_SOURCES = ["content", "manual"] as const;

export type AnnotationSource = (typeof ANNOTATION_SOURCES)[number];

export const KIND_LABELS: Record<AnnotationKind, string> = {
  post: "Post",
  project: "Project",
  profile: "Profile",
  external: "External",
  note: "Note",
};

// One colour per kind, as CSS custom properties so both themes are handled in
// app/globals.css rather than here. These are read into SVG attributes and
// inline styles, which is why they are full var() expressions and not bare
// token names: a Tailwind class built by string concatenation would not
// survive the compiler's static scan.
export const KIND_COLORS: Record<AnnotationKind, string> = {
  post: "var(--color-ann-post)",
  project: "var(--color-ann-project)",
  profile: "var(--color-ann-profile)",
  external: "var(--color-ann-external)",
  note: "var(--color-ann-note)",
};

export type Annotation = {
  id: number;
  /** YYYY-MM-DD. A date, because everything it is compared against is a day. */
  at: string;
  kind: AnnotationKind;
  label: string;
  url: string | null;
  source: AnnotationSource;
  externalKey: string | null;
};

/** An annotation before it has an id, which is what both writers produce. */
export type NewAnnotation = {
  at: string;
  kind: AnnotationKind;
  label: string;
  url: string | null;
  source: AnnotationSource;
  externalKey: string | null;
};

// ---------------------------------------------------------------------------
// Day arithmetic
//
// Done on integer day numbers rather than with date-fns, because every date
// here arrives as a YYYY-MM-DD string out of Postgres and the round trip
// through a JS Date is exactly where this kind of code goes wrong: the driver
// parses a `date` at local midnight, and addDays then walks the local calendar
// while toISOString reports UTC. One timezone west of Greenwich and every
// window silently shifts by a day. Integers cannot do that.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since the epoch, or null if this is not a real calendar date. */
export function dayNumber(iso: string): number | null {
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const stamp = Date.UTC(year, month - 1, day);
  if (Number.isNaN(stamp)) return null;
  // Rejects 2026-02-31, which Date.UTC would happily roll forward into March.
  const back = new Date(stamp);
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() !== month - 1 ||
    back.getUTCDate() !== day
  ) {
    return null;
  }
  return stamp / MS_PER_DAY;
}

export function isoFromDayNumber(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * A day, moved. Negative goes backwards.
 *
 * Used to size the daily window a lift needs to be computed over, which is
 * "as far back as the oldest marker's baseline reaches" and nothing wider.
 * Returns the input unchanged if it is not a date, so a caller building a
 * query bound gets something harmless rather than "Invalid Date".
 */
export function shiftIsoDay(iso: string, days: number): string {
  const day = dayNumber(iso);
  return day === null ? iso : isoFromDayNumber(day + days);
}

/**
 * Whatever frontmatter put in `date`, as YYYY-MM-DD.
 *
 * Post frontmatter carries a mix of quoted strings and bare YAML dates, so
 * gray-matter hands back a Date for some files and a string for others. A Date
 * is read in UTC because that is how YAML parsed it; anything else is trusted
 * to the platform parser and then re-read the same way.
 */
export function toIsoDay(value: Date | string | number): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Content derived annotations
// ---------------------------------------------------------------------------

/** The only three things this needs from a post or a project. */
export type ContentItem = {
  slug: string;
  title: string;
  date: Date | string;
  /** Where the thing lives, when it has a page of its own. */
  href?: string | null;
};

/**
 * Posts and projects as timeline markers.
 *
 * These need no manual step ever and they backfill instantly, because the
 * dates already exist in frontmatter and always have. That is the entire
 * argument for deriving them rather than asking me to type them in: a timeline
 * I have to maintain by hand is a timeline that is complete for three weeks.
 *
 * The external key is what makes the nightly write an upsert. Re-running finds
 * the same key and updates in place, so nothing duplicates, and editing a
 * post's frontmatter date moves its marker rather than leaving the old one
 * behind next to a new one.
 *
 * Anything with an unreadable date is dropped rather than defaulted. A marker
 * on the wrong day is worse than no marker, because it will be read as a cause.
 */
export function contentAnnotations(
  posts: ContentItem[],
  projects: ContentItem[],
): NewAnnotation[] {
  const rows: NewAnnotation[] = [
    ...posts.map((item) => build(item, "post", "Published")),
    ...projects.map((item) => build(item, "project", "Launched")),
  ].filter((row): row is NewAnnotation => row !== null);

  // Newest first, which is the order the dashboard lists them in and the order
  // a reader thinks in. Sorting here rather than in SQL means the same order
  // holds for the tests and for anything else that reuses this.
  return rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

function build(
  item: ContentItem,
  kind: "post" | "project",
  verb: string,
): NewAnnotation | null {
  const at = toIsoDay(item.date);
  if (at === null) return null;

  const title = collapse(item.title ?? "");
  if (title === "") return null;

  return {
    at,
    kind,
    // "Published: Pi Extensions" rather than the bare title, so a marker reads
    // as an event next to the traffic it is meant to explain.
    label: clamp(`${verb}: ${title}`, MAX_LABEL_LENGTH),
    url: item.href ?? null,
    source: "content",
    externalKey: `${kind}:${item.slug}`,
  };
}

// ---------------------------------------------------------------------------
// Validation
//
// These routes sit behind the proxy's session check, so everything reaching
// them is already me. That is not a reason to trust the form: the browser is
// the one place none of these rules are enforced, a hand-rolled curl with the
// cookie attached bypasses every `maxlength` and `required` on the page, and a
// 20MB label would be accepted straight into a table that has no size limit of
// its own. Cheap to check, and the alternative is a database I cannot clean up
// from the UI that wrote to it.
// ---------------------------------------------------------------------------

export const MAX_LABEL_LENGTH = 120;
export const MAX_URL_LENGTH = 500;

// A marker before 2000 is a typo, and one more than a year out is a plan
// rather than a cause. Both are bounds on nonsense, not on ambition.
const EARLIEST_ANNOTATION = "2000-01-01";
const FUTURE_ALLOWANCE_DAYS = 365;

function collapse(value: string): string {
  // Control characters included, because a newline inside a label breaks the
  // single-line rows it is rendered into and a NUL is rejected by Postgres
  // outright, as a driver error rather than as anything I could show.
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 3).trim()}...`;
}

/**
 * Every outcome a write can have, as a closed set of codes and the sentence
 * each one shows.
 *
 * Codes rather than the message itself, because the routes answer with a
 * redirect and the result has to survive the round trip through the query
 * string. Putting the prose in the URL would mean rendering whatever text a
 * link happened to carry back into my own dashboard, and while React escapes
 * it so it cannot become script, "your session expired, sign in here" rendered
 * in the site's own voice is a phishing page I built myself. A code that has
 * to match a key here cannot say anything I did not write.
 */
export const ANNOTATION_MESSAGES = {
  added: "Marker added.",
  deleted: "Marker deleted.",
  date: "The date has to be a real day, as YYYY-MM-DD.",
  "date-range":
    "The date has to fall between 2000 and a year from today. Anything else is a typo.",
  kind: `Kind has to be one of ${ANNOTATION_KINDS.join(", ")}.`,
  label: "A marker needs a label, of 120 characters or fewer.",
  url: "The link has to be a full http(s) URL or a path starting with a single /.",
  "not-found":
    "Nothing was deleted. Either that marker is gone already, or it comes from frontmatter and is not mine to remove here.",
  failed: "The write failed. The message is in the function log.",
} as const;

export type AnnotationMessage = keyof typeof ANNOTATION_MESSAGES;

export function isAnnotationMessage(
  value: string | undefined,
): value is AnnotationMessage {
  return value !== undefined && value in ANNOTATION_MESSAGES;
}

export type ParsedAnnotation =
  | { ok: true; value: NewAnnotation }
  | { ok: false; error: AnnotationMessage };

/**
 * A submitted form as a row, or the reason it is not one.
 *
 * `now` is a parameter so the future bound is testable without waiting.
 */
export function parseAnnotationInput(
  input: { at?: unknown; kind?: unknown; label?: unknown; url?: unknown },
  now = new Date(),
): ParsedAnnotation {
  const at = typeof input.at === "string" ? input.at.trim() : "";
  const day = dayNumber(at);
  if (day === null) return { ok: false, error: "date" };

  const earliest = dayNumber(EARLIEST_ANNOTATION)!;
  const latest =
    Math.floor(now.getTime() / MS_PER_DAY) + FUTURE_ALLOWANCE_DAYS;
  if (day < earliest || day > latest) return { ok: false, error: "date-range" };

  const kind = typeof input.kind === "string" ? input.kind : "";
  if (!(ANNOTATION_KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: "kind" };
  }

  const label = collapse(typeof input.label === "string" ? input.label : "");
  if (label === "" || label.length > MAX_LABEL_LENGTH) {
    return { ok: false, error: "label" };
  }

  const rawUrl = typeof input.url === "string" ? input.url.trim() : "";
  let url: string | null = null;
  if (rawUrl !== "") {
    if (rawUrl.length > MAX_URL_LENGTH) return { ok: false, error: "url" };

    // A site-relative path is the common case (my own post), an absolute
    // http(s) URL is the other one (the Hacker News thread). Nothing else:
    // javascript: and data: would be rendered into an href on a page I open
    // every day, which is a stored XSS on the one account that matters.
    if (rawUrl.startsWith("/")) {
      // "//evil.example" is protocol-relative and leaves the site, so it is
      // not the local path it looks like.
      if (rawUrl.startsWith("//")) return { ok: false, error: "url" };
      url = rawUrl;
    } else {
      let parsed: URL;
      try {
        parsed = new URL(rawUrl);
      } catch {
        return { ok: false, error: "url" };
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { ok: false, error: "url" };
      }
      url = parsed.toString();
    }
  }

  return {
    ok: true,
    value: {
      at,
      kind: kind as AnnotationKind,
      label,
      url,
      source: "manual",
      // Manual rows have no source of truth outside the table, so nothing to
      // key them against. Null is what keeps them out of the nightly upsert.
      externalKey: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Lift
//
// The payoff, and the part with the most ways to lie.
//
// The question is "did that work", and the cheapest honest answer is the
// traffic in the N days from the marker against the N days before it. Cheap,
// and wrong in three specific ways that the code below refuses to paper over:
//
//   - A marker three days old has no window after it yet. Showing "up 300%"
//     off two days against seven is not an early read, it is a wrong number.
//   - A marker near the start of the mirror has no window before it. Vercel
//     only ever held 31 days, so on a young database the baseline for anything
//     early is one or two days of history.
//   - Two markers close together share their windows. If I published a post on
//     the 20th and got linked from elsewhere on the 22nd, neither one owns the
//     week that follows.
//
// The first two are refused outright. The third is handled by shrinking both
// windows symmetrically so neither one contains another marker, and refusing
// once that leaves too little to compare.
// ---------------------------------------------------------------------------

/** The window each side, in days, when nothing forces it shorter. */
export const LIFT_WINDOW_DAYS = 7;

/** Below this a comparison is two or three days against two or three days,
 *  which on this site is one link being shared rather than a trend. */
export const MIN_LIFT_WINDOW_DAYS = 3;

export type LiftStatus =
  /** A real comparison, both windows full and uncontested. */
  | "ok"
  /** Traffic before was zero, so a percentage would divide by nothing. */
  | "from-zero"
  /** Too recent: the window after it has not finished happening. */
  | "pending"
  /** The mirror does not reach far enough back to have a baseline. */
  | "no-baseline"
  /** Another marker is too close for either to own the change. */
  | "crowded";

export type Lift = {
  status: LiftStatus;
  /** Days compared each side, after any shrinking for close neighbours. */
  window: number;
  /** Page views in the window before, when there was one. */
  before: number | null;
  /** Page views from the marker's own day onward, when the window is full. */
  after: number | null;
  /** Fractional change, only ever set when status is "ok". */
  change: number | null;
  /** One sentence for the UI. Always set, including when the answer is no. */
  note: string;
};

export type LiftInput = {
  /** The marker being measured, YYYY-MM-DD. */
  at: string;
  /** Every other marker's date. The caller excludes this one. */
  others: string[];
  /** Page views by day. A missing day is zero, not missing data. */
  daily: Map<string, number>;
  /** The first and last day the mirror holds anything for. */
  first: string | null;
  last: string | null;
  window?: number;
};

export function computeLift(input: LiftInput): Lift {
  const requested = input.window ?? LIFT_WINDOW_DAYS;
  const day = dayNumber(input.at);

  if (day === null) {
    return refuse("crowded", requested, "That date cannot be read.");
  }

  const neighbours = input.others
    .map(dayNumber)
    .filter((value): value is number => value !== null);

  // Same day is the one case shrinking cannot rescue: two things happened at
  // once and no arithmetic can say which one moved the traffic.
  if (neighbours.some((other) => other === day)) {
    return refuse(
      "crowded",
      requested,
      "Another marker falls on the same day, so neither can claim the change.",
    );
  }

  // The after window runs from the marker's own day, because a post published
  // in the morning gets its traffic that afternoon. So it may reach at most as
  // far as the day before the next marker: w days covers [day, day + w - 1].
  const next = smallest(neighbours.filter((other) => other > day));
  const maxAfter = next === null ? requested : next - day;

  // The before window is [day - w, day - 1], which must stay clear of the
  // previous marker: day - w > prev.
  const previous = largest(neighbours.filter((other) => other < day));
  const maxBefore = previous === null ? requested : day - previous - 1;

  // Both sides take the same width. An eight day after against a two day
  // before is not a comparison, it is a ratio of two different questions.
  const window = Math.min(requested, maxAfter, maxBefore);

  if (window < MIN_LIFT_WINDOW_DAYS) {
    return refuse(
      "crowded",
      Math.max(0, window),
      "Another marker sits too close for either to own the change.",
    );
  }

  const firstDay = input.first === null ? null : dayNumber(input.first);
  const lastDay = input.last === null ? null : dayNumber(input.last);

  if (firstDay === null || lastDay === null) {
    return refuse("no-baseline", window, "There is no stored traffic to compare.");
  }

  const lastNeeded = day + window - 1;
  if (lastNeeded > lastDay) {
    const toGo = lastNeeded - lastDay;
    return {
      status: "pending",
      window,
      before: null,
      after: null,
      change: null,
      note: `Too recent - ${toGo} more ${toGo === 1 ? "day" : "days"} of traffic before the ${window} day window is full.`,
    };
  }

  if (day - window < firstDay) {
    return refuse(
      "no-baseline",
      window,
      `The mirror starts on ${input.first}, so there is no full ${window} day baseline before this.`,
    );
  }

  const before = sum(input.daily, day - window, day - 1);
  const after = sum(input.daily, day, day + window - 1);

  if (before === 0) {
    return {
      status: "from-zero",
      window,
      before,
      after,
      change: null,
      // A percentage against zero is either infinity or a shrug. The two
      // counts say the same thing and cannot be misread.
      note: `${after} views in the ${window} days from here, against none before.`,
    };
  }

  const change = (after - before) / before;
  return {
    status: "ok",
    window,
    before,
    after,
    change,
    note: `${after} views in the ${window} days from here against ${before} in the ${window} before.`,
  };
}

function refuse(status: LiftStatus, window: number, note: string): Lift {
  return { status, window, before: null, after: null, change: null, note };
}

function sum(daily: Map<string, number>, from: number, to: number): number {
  let total = 0;
  for (let day = from; day <= to; day += 1) {
    total += daily.get(isoFromDayNumber(day)) ?? 0;
  }
  return total;
}

function smallest(values: number[]): number | null {
  return values.length === 0 ? null : Math.min(...values);
}

function largest(values: number[]): number | null {
  return values.length === 0 ? null : Math.max(...values);
}

/**
 * The lift for every annotation in one pass.
 *
 * Each one is measured against all the others, which is why this takes the
 * whole list rather than being called per row: whether a marker can claim a
 * change depends entirely on what else is near it.
 */
export function liftsFor(
  annotations: Annotation[],
  daily: Map<string, number>,
  span: { first: string | null; last: string | null },
  window = LIFT_WINDOW_DAYS,
): Map<number, Lift> {
  const lifts = new Map<number, Lift>();
  for (const annotation of annotations) {
    lifts.set(
      annotation.id,
      computeLift({
        at: annotation.at,
        others: annotations
          .filter((other) => other.id !== annotation.id)
          .map((other) => other.at),
        daily,
        first: span.first,
        last: span.last,
        window,
      }),
    );
  }
  return lifts;
}

/** The lift as the short string that sits next to a marker in the list. */
export function formatLift(lift: Lift): string {
  switch (lift.status) {
    case "ok": {
      const percent = Math.abs(lift.change! * 100);
      if (percent < 1) return "level";
      return `${lift.change! > 0 ? "▲" : "▼"} ${percent.toFixed(0)}%`;
    }
    case "from-zero":
      return "from zero";
    case "pending":
      return "too recent";
    case "no-baseline":
      return "no baseline";
    case "crowded":
      return "crowded";
  }
}
