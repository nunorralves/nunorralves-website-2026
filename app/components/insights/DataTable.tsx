import RankedBar from "./RankedBar";

// One table for every ranked list on the page: the main dimension table and
// all three pinned panels. They differ only in their columns, and three
// near-identical <table> blocks is how the pinned panels end up with different
// padding from the main one after the second edit.

export type TableRow = {
  label: string;
  /** 0..1 against the largest row, for the ranked bar. */
  share: number;
  /** Already formatted. This component does no arithmetic. */
  values: string[];
};

type DataTableProps = {
  /** Heading for the label column, then one per numeric column. */
  headings: string[];
  rows: TableRow[];
  empty: string;
  /** Rendered in the label column's font-mono, for paths and hostnames. */
  monoLabels?: boolean;
};

export default function DataTable({
  headings,
  rows,
  empty,
  monoLabels = false,
}: DataTableProps) {
  if (rows.length === 0) {
    return <p className='py-4 text-sm text-[var(--color-secondary)]'>{empty}</p>;
  }

  const [first, ...numeric] = headings;

  return (
    // The one place on this page that is allowed to scroll sideways. A table
    // of paths and five figures does not fit a phone, and the alternative -
    // letting it push the page wide - breaks every other block on it.
    <div className='overflow-x-auto'>
      <table className='w-full border-collapse text-sm'>
        <thead>
          <tr>
            <th className='border-b border-[var(--color-border)] pb-2 pr-3 text-left font-mono text-[0.6rem] font-normal uppercase tracking-[0.09em] text-[var(--color-secondary)]'>
              {first}
            </th>
            <th className='w-16 border-b border-[var(--color-border)] pb-2 pr-3' />
            {numeric.map((heading) => (
              <th
                key={heading}
                className='border-b border-[var(--color-border)] pb-2 pr-3 text-right font-mono text-[0.6rem] font-normal uppercase tracking-[0.09em] text-[var(--color-secondary)] whitespace-nowrap'
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td
                className={`max-w-[22rem] truncate border-b border-[var(--color-border)] py-2 pr-3 ${monoLabels ? "font-mono text-xs" : ""}`}
                title={row.label}
              >
                {row.label}
              </td>
              <td className='border-b border-[var(--color-border)] py-2 pr-3'>
                <RankedBar share={row.share} />
              </td>
              {row.values.map((value, index) => (
                <td
                  key={`${numeric[index] ?? index}`}
                  className='border-b border-[var(--color-border)] py-2 pr-3 text-right font-mono text-xs tabular-nums whitespace-nowrap'
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
