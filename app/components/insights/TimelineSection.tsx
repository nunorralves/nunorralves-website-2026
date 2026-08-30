import {
  ANNOTATION_KINDS,
  ANNOTATION_MESSAGES,
  formatLift,
  type Annotation,
  type AnnotationMessage,
  type Lift,
} from "lib/analytics/annotations";
import { KindPin } from "./AnnotationRail";

// The Timeline editor: the form that adds a marker, and the list of what is
// already there.
//
// Two halves with different rules, and the split is the whole design. Content
// rows are a projection of post and project frontmatter, rebuilt every night,
// so they are listed read-only: a delete button on one would either be undone
// by the next cron run or, worse, not be, and the automatic half would start
// disagreeing with the files it is derived from. Manual rows are the ones with
// no source of truth outside the table, so those are mine to add and remove.
//
// No client JavaScript, like everything else on this page. The form is a plain
// POST and each delete is its own one button form.

type TimelineSectionProps = {
  annotations: Annotation[];
  /** Lift by annotation id. Missing means it was not computed. */
  lifts: Map<number, Lift>;
  /** Prefilled into the date field, so the common case is one click. */
  today: string;
  /** The outcome of the last write, if this render follows one. */
  message: AnnotationMessage | null;
};

export default function TimelineSection({
  annotations,
  lifts,
  today,
  message,
}: TimelineSectionProps) {
  return (
    <section
      id='timeline'
      className='border-t border-[var(--color-border)] px-4 py-4'
    >
      <h3 className='mb-1 text-base'>Timeline</h3>
      <p className='mb-3 max-w-[74ch] text-xs text-[var(--color-secondary)]'>
        Posts and projects appear here on their own, read from their frontmatter
        dates. Add everything else by hand: a talk, a launch, a profile change,
        anything you want a spike explained by. The lift beside each one is the
        traffic in the days after it against the same number of days before.
      </p>

      {message ? (
        // The text comes from a fixed table keyed by a code in the query
        // string, never from the query string itself. See ANNOTATION_MESSAGES.
        <p
          role='status'
          className='mb-3 rounded-md border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-secondary)]'
        >
          {ANNOTATION_MESSAGES[message]}
        </p>
      ) : null}

      <form
        action='/insights/annotations'
        method='post'
        className='mb-3 grid items-end gap-2 [grid-template-columns:1fr_1fr] md:[grid-template-columns:9rem_8rem_1fr_1fr_auto]'
      >
        <Field label='Date' htmlFor='ann-at'>
          <input
            id='ann-at'
            type='date'
            name='at'
            defaultValue={today}
            required
            className={FIELD}
          />
        </Field>

        <Field label='Kind' htmlFor='ann-kind'>
          <select id='ann-kind' name='kind' defaultValue='note' className={FIELD}>
            {ANNOTATION_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </Field>

        <Field label='Label' htmlFor='ann-label'>
          <input
            id='ann-label'
            type='text'
            name='label'
            required
            // Every one of these is re-checked server side. The browser is the
            // one place none of them are actually enforced.
            maxLength={120}
            placeholder='Updated LinkedIn headline'
            className={FIELD}
          />
        </Field>

        <Field label='Link (optional)' htmlFor='ann-url'>
          <input
            id='ann-url'
            type='text'
            name='url'
            maxLength={500}
            placeholder='https://... or /posts/...'
            className={FIELD}
          />
        </Field>

        <button
          type='submit'
          className='rounded-md border border-[var(--color-link)] px-3 py-2 text-[0.8rem] text-[var(--color-link)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-link)_12%,transparent)]'
        >
          Add marker
        </button>
      </form>

      {annotations.length === 0 ? (
        <p className='m-0 text-sm text-[var(--color-secondary)]'>
          Nothing on the timeline yet. Posts and projects land here on the next
          nightly sync.
        </p>
      ) : (
        <div className='border-t border-[var(--color-border)]'>
          {annotations.map((annotation) => (
            <Row
              key={annotation.id}
              annotation={annotation}
              lift={lifts.get(annotation.id) ?? null}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const FIELD =
  "w-full min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-[0.8rem]";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className='flex min-w-0 flex-col gap-1'>
      <label
        htmlFor={htmlFor}
        className='font-mono text-[0.55rem] uppercase tracking-[0.09em] text-[var(--color-secondary)]'
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Row({
  annotation,
  lift,
}: {
  annotation: Annotation;
  lift: Lift | null;
}) {
  const fromContent = annotation.source === "content";

  return (
    <div className='grid items-center gap-x-3 gap-y-1 border-b border-[var(--color-border)] py-2 text-sm [grid-template-columns:4.5rem_1fr] md:[grid-template-columns:5rem_5rem_1fr_7rem_auto]'>
      <span className='font-mono text-[0.7rem] text-[var(--color-secondary)]'>
        {annotation.at}
      </span>

      <span
        className={`hidden justify-self-start rounded-[3px] border px-1.5 py-px font-mono text-[0.55rem] uppercase tracking-[0.06em] md:block ${
          fromContent
            ? "border-[var(--color-border)] text-[var(--color-secondary)]"
            : "border-[var(--color-link)] text-[var(--color-link)]"
        }`}
      >
        {annotation.source}
      </span>

      <span className='flex min-w-0 items-center gap-2'>
        <KindPin kind={annotation.kind} />
        <span className='truncate' title={annotation.label}>
          {annotation.label}
        </span>
      </span>

      {/* The lift, and the reason there is not one. A percentage that cannot
          be stood behind is replaced by the word for why, and the sentence
          behind it is in the title. "too recent" is not a smaller number than
          "up 34%", it is a different kind of answer. */}
      <span
        className='font-mono text-[0.7rem] tabular-nums text-[var(--color-secondary)] md:text-right'
        title={lift?.note ?? undefined}
      >
        {lift ? formatLift(lift) : "-"}
      </span>

      {fromContent ? (
        // Not a disabled button in a form, because there is no form: the row
        // has nothing to post. The server refuses these too, on source rather
        // than on anything the page sent, so this is only the explanation.
        <span
          className='hidden text-right font-mono text-[0.6rem] text-[var(--color-secondary)] opacity-60 md:block'
          title='Derived from frontmatter, and rebuilt every night. Change the .mdx file instead.'
        >
          frontmatter
        </span>
      ) : (
        <form action='/insights/annotations/delete' method='post'>
          <input type='hidden' name='id' value={annotation.id} />
          <button
            type='submit'
            className='px-1 py-1 font-mono text-[0.65rem] text-[var(--color-secondary)] transition-colors hover:text-[var(--color-ann-external)]'
          >
            Remove
          </button>
        </form>
      )}
    </div>
  );
}
