import Link from "next/link";
import {
  KIND_COLORS,
  type Annotation,
  type AnnotationKind,
} from "lib/analytics/annotations";
import { formatBucket } from "lib/analytics/format";

// The legend under the chart. The pins on the chart carry a colour and a date
// and nothing else, because five labels along a 900 unit axis overlap into
// mush; this is where they get their names, with enough room to read them.
//
// It is a legend and a list at once, which is the point: the colour maps a pin
// to a row, and the row says what the pin means. A separate colour key would
// be a third thing to look at.

type AnnotationRailProps = {
  annotations: Annotation[];
};

/** The little triangle, matching the pin drawn on the chart above. */
export function KindPin({ kind }: { kind: AnnotationKind }) {
  return (
    <span
      aria-hidden='true'
      className='inline-block h-0 w-0 shrink-0 border-x-4 border-t-[7px] border-x-transparent'
      style={{ borderTopColor: KIND_COLORS[kind] }}
    />
  );
}

export default function AnnotationRail({
  annotations,
}: AnnotationRailProps) {
  if (annotations.length === 0) {
    return (
      <div className='border-b border-[var(--color-border)] px-4 pb-3'>
        <p className='m-0 text-xs text-[var(--color-secondary)]'>
          Nothing on the timeline in this range. Posts and projects arrive here
          on their own; everything else gets added below.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-wrap gap-x-4 gap-y-1.5 border-b border-[var(--color-border)] px-4 pb-3.5'>
      {annotations.map((annotation) => {
        const body = (
          <>
            <KindPin kind={annotation.kind} />
            <span className='font-mono text-[0.65rem] text-[var(--color-secondary)]'>
              {/* Always a day, even when the chart is drawn in months. The
                  thing happened on a day, and "Aug 2026" beside a launch is
                  less information than "21 Aug". */}
              {formatBucket(annotation.at, "day")}
            </span>
            <span>{annotation.label}</span>
          </>
        );

        // A marker with a link becomes one. Half the time the question after
        // "did that work" is "which post was that", and the answer is one
        // click away rather than a search.
        return annotation.url ? (
          <Link
            key={annotation.id}
            href={annotation.url}
            className='inline-flex items-center gap-[7px] text-xs text-[var(--color-secondary)] transition-colors hover:text-[var(--color-link)]'
          >
            {body}
          </Link>
        ) : (
          <span
            key={annotation.id}
            className='inline-flex items-center gap-[7px] text-xs text-[var(--color-secondary)]'
          >
            {body}
          </span>
        );
      })}
    </div>
  );
}
