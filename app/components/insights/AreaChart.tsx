import { KIND_COLORS, dayNumber, type AnnotationKind } from "lib/analytics/annotations";
import { formatBucket, formatCount } from "lib/analytics/format";

// Hand-written SVG, rendered on the server, no library.
//
// A charting library would be the largest dependency on the site by an order
// of magnitude, and every one of them ships a client bundle to draw shapes
// that are fully known at request time. The site currently sends almost no
// JavaScript to a reader; sending 40kB of it to the one page only I look at
// would be the wrong trade twice over.
//
// The cost is that the chart cannot have a hover tooltip. In exchange every
// bucket's value is in the <title> of its own hit area, so hovering still
// gives a native browser tooltip, and a screen reader gets the same text.

export type ChartPoint = { bucket: string; value: number };

/** A timeline annotation, reduced to what drawing it needs. */
export type ChartMarker = {
  /** YYYY-MM-DD, the day the thing happened. */
  at: string;
  kind: AnnotationKind;
  label: string;
};

type AreaChartProps = {
  points: ChartPoint[];
  grain: string;
  label: string;
  markers?: ChartMarker[];
};

// A fixed user-space viewBox scaled to whatever width the container has.
// Nothing here depends on the real pixel width, which is what lets this render
// on the server without measuring anything.
const W = 900;
const H = 172;
const PAD = 16;

function scale(points: ChartPoint[]) {
  // The floor of 1 keeps a range of all zeroes from dividing by zero and
  // drawing NaN into the path, which silently blanks the whole element.
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  return {
    max,
    x: (i: number) => PAD + i * step,
    y: (v: number) => H - PAD - (v / max) * (H - PAD * 2),
  };
}

/**
 * Where a marker sits along the axis, as a fractional bucket index.
 *
 * A day-grain chart has one bucket per day and this is exact. A week or month
 * chart does not: the launch on the 21st falls inside the bucket starting on
 * the 17th, and pinning it to the start of that bucket would draw it four days
 * early, which on a chart whose entire job is to put a cause next to an effect
 * is the one error that matters. So it interpolates between the two buckets it
 * falls between.
 *
 * Null for anything outside the drawn range, which is not an error: the rail
 * below lists markers for the range and the chart only draws the ones the axis
 * can honestly place.
 */
function markerIndex(days: number[], at: string): number | null {
  const day = dayNumber(at);
  if (day === null || days.length === 0) return null;

  const first = days[0]!;
  const last = days[days.length - 1]!;
  if (day < first || day > last) return null;

  for (let i = days.length - 1; i >= 0; i -= 1) {
    const start = days[i]!;
    if (day < start) continue;
    const next = days[i + 1];
    if (next === undefined || next === start) return i;
    return i + (day - start) / (next - start);
  }
  return null;
}

export default function AreaChart({
  points,
  grain,
  label,
  markers = [],
}: AreaChartProps) {
  if (points.length === 0) {
    return (
      <p className='py-10 text-center text-sm text-[var(--color-secondary)]'>
        No buckets stored for this range.
      </p>
    );
  }

  // One stored bucket is a legitimate range (a single day, "24h" on a quiet
  // site), and a one point line has no length. Doubling it draws a flat band
  // across the width, which is the honest picture of one value.
  const series = points.length === 1 ? [points[0]!, points[0]!] : points;
  const { max, x, y } = scale(series);

  const line = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(series.length - 1).toFixed(1)} ${H - PAD} L${PAD} ${H - PAD} Z`;

  const last = series[series.length - 1]!;
  const gridRows = 3;

  // Positions resolved once, and markers the axis cannot place are dropped
  // rather than clamped to an edge. A marker pinned to the left edge because
  // it predates the window would be read as "this happened at the start of
  // this chart", which is a claim the data does not make.
  const bucketDays = series
    .map((point) => dayNumber(point.bucket))
    .map((day) => day ?? 0);
  const placed = markers
    .map((marker) => ({ marker, index: markerIndex(bucketDays, marker.at) }))
    .filter(
      (entry): entry is { marker: ChartMarker; index: number } =>
        entry.index !== null,
    );

  return (
    <figure className='m-0'>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width='100%'
        height={H}
        preserveAspectRatio='none'
        role='img'
        aria-label={`${label}. ${formatBucket(points[0]!.bucket, grain)} to ${formatBucket(points[points.length - 1]!.bucket, grain)}, peaking at ${formatCount(max)}.`}
      >
        {Array.from({ length: gridRows + 1 }, (_, i) => {
          const gy = PAD + ((H - PAD * 2) / gridRows) * i;
          return (
            <line
              key={i}
              x1={PAD}
              y1={gy}
              x2={W - PAD}
              y2={gy}
              stroke='var(--color-border)'
              strokeWidth={1}
            />
          );
        })}

        {/* The fill is the link colour at low alpha rather than a new token:
            the palette has no chart colours and this page is not the place to
            start inventing them. */}
        <path
          d={area}
          fill='color-mix(in srgb, var(--color-link) 14%, transparent)'
        />
        <path
          d={line}
          fill='none'
          stroke='var(--color-link)'
          strokeWidth={2}
          strokeLinejoin='round'
          vectorEffect='non-scaling-stroke'
        />

        {/* Annotation markers, drawn over the area and under the hit areas so
            the browser's own tooltip still names the bucket beneath them. A
            dashed line rather than a solid one, and a small pin rather than a
            label: at four or five markers the labels overlap into mush, so the
            names live in the rail underneath where they have room. */}
        {placed.map(({ marker, index }) => {
          const mx = x(index);
          const color = KIND_COLORS[marker.kind];
          return (
            <g key={`${marker.at}-${marker.label}`}>
              <line
                x1={mx}
                y1={PAD + 12}
                x2={mx}
                y2={H - PAD}
                stroke={color}
                strokeWidth={1}
                strokeDasharray='2 3'
                opacity={0.85}
                vectorEffect='non-scaling-stroke'
              />
              <polygon
                points={`${(mx - 4).toFixed(1)},${PAD + 4} ${(mx + 4).toFixed(1)},${PAD + 4} ${mx.toFixed(1)},${PAD + 11}`}
                fill={color}
              >
                <title>{`${marker.at}: ${marker.label}`}</title>
              </polygon>
            </g>
          );
        })}

        {/* One invisible full height rect per bucket, purely so the browser's
            own tooltip can name the value under the cursor. This is the whole
            of the chart's interactivity and it costs no JavaScript. */}
        {series.map((p, i) => (
          <rect
            key={`${p.bucket}-${i}`}
            x={x(i) - (W - PAD * 2) / series.length / 2}
            y={PAD}
            width={(W - PAD * 2) / series.length}
            height={H - PAD * 2}
            fill='transparent'
          >
            <title>{`${formatBucket(p.bucket, grain)}: ${formatCount(p.value)}`}</title>
          </rect>
        ))}

        <circle
          cx={x(series.length - 1)}
          cy={y(last.value)}
          r={3.5}
          fill='var(--color-link)'
          stroke='var(--color-card)'
          strokeWidth={2}
        />
      </svg>

      {/* The axis, as two labels rather than a ruler. Every bucket named turns
          into unreadable overlap past about a fortnight, and the only question
          the axis has to answer here is where the window starts and ends. */}
      <figcaption className='flex justify-between font-mono text-[0.65rem] text-[var(--color-secondary)]'>
        <span>{formatBucket(points[0]!.bucket, grain)}</span>
        <span>peak {formatCount(max)}</span>
        <span>{formatBucket(points[points.length - 1]!.bucket, grain)}</span>
      </figcaption>
    </figure>
  );
}
