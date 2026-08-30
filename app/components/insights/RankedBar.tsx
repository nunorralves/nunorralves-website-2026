// The second of the two shapes this dashboard needs, and the same argument as
// AreaChart: known at request time, so it is drawn on the server as SVG.
//
// A bar next to a number is doing something the number cannot. "612" and "401"
// are two figures to compare by reading; two bars are one glance. It is
// deliberately narrow, because the number is still the fact and the bar is
// only the ranking.

type RankedBarProps = {
  /** 0..1, this row's value against the largest in its table. */
  share: number;
};

export default function RankedBar({ share }: RankedBarProps) {
  // Clamped rather than trusted. A share above 1 means the caller's max is
  // wrong, and a bar overflowing its box would look like a rendering bug
  // rather than the data bug it is.
  const clamped = Math.max(0, Math.min(1, Number.isFinite(share) ? share : 0));

  return (
    <svg
      viewBox='0 0 100 8'
      width='100%'
      height={8}
      preserveAspectRatio='none'
      aria-hidden='true'
      className='block'
    >
      <rect x={0} y={2} width={100} height={4} rx={2} fill='var(--color-border)' />
      {/* A hairline minimum, so a row with one hit still shows something. A
          bar of zero width reads as no data rather than as a small number. */}
      <rect
        x={0}
        y={2}
        width={Math.max(1.5, clamped * 100)}
        height={4}
        rx={2}
        fill='var(--color-link)'
      />
    </svg>
  );
}
