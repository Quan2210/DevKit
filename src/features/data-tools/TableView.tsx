import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";
import { InlineEdit } from "./InlineEdit";
import type { TableData } from "./model";
import type { TreeNode } from "./model";

const MAX_ROWS = 1000;

type SortState = { column: number; direction: 1 | -1 } | null;
type Cell = { row: number; column: number };

const scalarKind = (node: TreeNode | undefined): "string" | "number" | "boolean" | null =>
  node && (node.kind === "string" || node.kind === "number" || node.kind === "boolean")
    ? node.kind
    : null;

export interface TableViewProps {
  table: TableData;
  label: string;
  /** Turns on cell editing (double-click, or Enter and F2 on the active cell). */
  editable?: boolean;
  /** Returns an error message to keep editing, or null when the change was accepted. */
  onCommitCell?: (node: TreeNode, text: string) => string | null;
}

/**
 * The rows of an array as a table. Click a header to sort by that column (this changes the view, not
 * the document). Arrow keys move the active cell; Enter or F2 edits it.
 */
export function TableView({ table, label, editable = false, onCommitCell }: TableViewProps) {
  const t = useT();
  const [sort, setSort] = useState<SortState>(null);
  const [active, setActive] = useState<Cell | null>(null);
  const [editing, setEditing] = useState<Cell | null>(null);

  // `shown[i]` is the row at screen position i; each keeps its number in the document.
  const shown = useMemo(() => {
    const rows = table.rows.slice(0, MAX_ROWS).map((row, index) => ({ row, index }));
    if (!sort) return rows;
    const { column, direction } = sort;
    return rows.sort((a, b) => {
      const left = a.row.nodes[column];
      const right = b.row.nodes[column];
      if (!left || !right) return left ? -1 : right ? 1 : a.index - b.index;
      const order =
        left.kind === "number" && right.kind === "number"
          ? Number(left.value) - Number(right.value)
          : (a.row.cells[column] ?? "") < (b.row.cells[column] ?? "")
            ? -1
            : (a.row.cells[column] ?? "") > (b.row.cells[column] ?? "")
              ? 1
              : 0;
      return order !== 0 ? order * direction : a.index - b.index;
    });
  }, [table.rows, sort]);

  const toggleSort = (column: number) =>
    setSort((current) =>
      current?.column !== column
        ? { column, direction: 1 }
        : current.direction === 1
          ? { column, direction: -1 }
          : null,
    );

  const startEdit = (cell: Cell) => {
    if (!editable) return;
    if (scalarKind(shown[cell.row]?.row.nodes[cell.column])) setEditing(cell);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (editing || event.target !== event.currentTarget || shown.length === 0) return;
    const columns = table.columns.length;
    const cell = active ?? { row: 0, column: 0 };
    const move = (row: number, column: number) =>
      setActive({
        row: Math.min(Math.max(row, 0), shown.length - 1),
        column: Math.min(Math.max(column, 0), columns - 1),
      });
    switch (event.key) {
      case "ArrowDown":
        move(cell.row + 1, cell.column);
        break;
      case "ArrowUp":
        move(cell.row - 1, cell.column);
        break;
      case "ArrowRight":
        move(cell.row, cell.column + 1);
        break;
      case "ArrowLeft":
        move(cell.row, cell.column - 1);
        break;
      case "Home":
        move(cell.row, 0);
        break;
      case "End":
        move(cell.row, columns - 1);
        break;
      case "Enter":
      case "F2":
        if (!editable || !active) return;
        startEdit(active);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- keys move the active cell; the region is the one keyboard stop of the table
    <div
      className="h-full overflow-auto"
      role="region"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be keyboard reachable; arrows move the active cell
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <table className="w-max min-w-full border-collapse text-left font-mono text-[13px]">
        <thead className="sticky top-0 bg-surface-muted">
          <tr>
            <th scope="col" className="border-b border-border px-2 py-1 text-text-muted">
              {"#"}
            </th>
            {table.columns.map((column, c) => (
              <th
                key={column}
                scope="col"
                aria-sort={
                  sort?.column === c
                    ? sort.direction === 1
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                className="border-b border-border px-2 py-1 font-semibold"
              >
                <button
                  type="button"
                  title={t("table.sortBy", { column })}
                  onClick={() => toggleSort(c)}
                  className="inline-flex items-center gap-1 rounded-sm font-semibold hover:text-primary"
                >
                  {column}
                  {sort?.column === c ? (
                    sort.direction === 1 ? (
                      <ArrowUp aria-hidden className="size-3.5" />
                    ) : (
                      <ArrowDown aria-hidden className="size-3.5" />
                    )
                  ) : null}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map(({ row, index }, r) => (
            <tr key={row.id} className="odd:bg-surface even:bg-surface-muted/40">
              <th scope="row" className="px-2 py-1 font-normal text-text-muted">
                {index}
              </th>
              {row.cells.map((cell, c) => {
                const node = row.nodes[c];
                const kind = scalarKind(node);
                const isEditing = editing?.row === r && editing.column === c;
                const isActive = active?.row === r && active.column === c;
                return (
                  <td
                    key={c}
                    onClick={() => setActive({ row: r, column: c })}
                    onDoubleClick={() => startEdit({ row: r, column: c })}
                    className={cn(
                      "max-w-[28rem] truncate px-2 py-1",
                      isActive && "outline outline-1 -outline-offset-1 outline-primary",
                    )}
                    title={isEditing ? undefined : cell}
                  >
                    {isEditing && node && kind ? (
                      <InlineEdit
                        kind={kind}
                        initial={node.value ?? ""}
                        label={t("table.editCell", { column: table.columns[c] ?? "", row: index })}
                        onCommit={(text) => {
                          const problem = onCommitCell?.(node, text) ?? null;
                          if (problem === null) setEditing(null);
                          return problem;
                        }}
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      cell
                    )}
                  </td>
                );
              })}
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
