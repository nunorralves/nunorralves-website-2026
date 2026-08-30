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

type AreaChartProps = {
  points: ChartPoint[];
  grain: string;
  label: string;
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

export default function AreaChart({ points, grain, label }: AreaChartProps) {
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
