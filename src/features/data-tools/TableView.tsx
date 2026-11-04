import { useT } from "../../i18n/useT";
import type { TableData } from "./model";

const MAX_ROWS = 1000;

export function TableView({ table, label }: { table: TableData; label: string }) {
  const t = useT();
  const rows = table.rows.slice(0, MAX_ROWS);
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be keyboard reachable
    <div className="h-full overflow-auto" role="region" aria-label={label} tabIndex={0}>
      <table className="w-max min-w-full border-collapse text-left font-mono text-[13px]">
        <thead className="sticky top-0 bg-surface-muted">
          <tr>
            <th scope="col" className="border-b border-border px-2 py-1 text-text-muted">
              {"#"}
            </th>
            {table.columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="border-b border-border px-2 py-1 font-semibold"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="odd:bg-surface even:bg-surface-muted/40">
              <th scope="row" className="px-2 py-1 font-normal text-text-muted">
                {index}
              </th>
              {row.cells.map((cell, i) => (
                <td key={i} className="max-w-[28rem] truncate px-2 py-1" title={cell}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.rows.length > MAX_ROWS ? (
        <p className="p-2 text-sm text-text-muted">
          {t("table.truncated", { shown: MAX_ROWS, total: table.rows.length })}
        </p>
      ) : null}
    </div>
  );
}
