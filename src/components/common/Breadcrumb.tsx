import { ChevronRight, Pencil } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useT } from "../../i18n/useT";
import { IconButton } from "./IconButton";

export interface BreadcrumbProps {
  /** Segment labels from the root, for example ["sections", "0", "type"]. */
  items: ReadonlyArray<string>;
  /** Called with how many segments to keep (0 selects the root). */
  onSelect: (depth: number) => void;
  /** Text shown in the edit box, for example `sections[0].type`. */
  editValue: string;
  /** Called with the typed path; returns an error message, or null when the jump worked. */
  onSubmitEdit: (value: string) => string | null;
  disabled?: boolean;
}

/** Path of the selected node. Pick a segment to select it, or edit the whole path as text. */
export function Breadcrumb({
  items,
  onSelect,
  editValue,
  onSubmitEdit,
  disabled = false,
}: BreadcrumbProps) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(editValue);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  const startEdit = () => {
    setDraft(editValue);
    setError(null);
    setEditing(true);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const problem = onSubmitEdit(draft);
      setError(problem);
      if (!problem) setEditing(false);
    }
  };

  const link =
    "min-h-7 shrink-0 rounded-sm px-1.5 font-mono text-[13px] hover:bg-surface-muted disabled:opacity-50";

  return (
    <nav
      aria-label={t("breadcrumb.node")}
      className="flex min-h-10 items-center gap-1 border-b border-border px-2 text-sm"
    >
      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            ref={input}
            aria-label={t("breadcrumb.input")}
            aria-invalid={error ? true : undefined}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setEditing(false)}
            spellCheck={false}
            className="min-h-8 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-2 font-mono text-[13px]"
          />
          {error ? (
            <span role="alert" className="shrink-0 text-danger">
              {error}
            </span>
          ) : null}
        </div>
      ) : (
        <ol className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          <li className="flex items-center">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(0)}
              aria-current={items.length === 0 ? "location" : undefined}
              className={link}
            >
              {t("breadcrumb.root")}
            </button>
          </li>
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-0.5">
              <ChevronRight aria-hidden className="size-3.5 shrink-0 text-text-muted" />
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(index + 1)}
                aria-current={index === items.length - 1 ? "location" : undefined}
                className={link}
              >
                {item}
              </button>
            </li>
          ))}
        </ol>
      )}
      <IconButton
        label={t("breadcrumb.edit")}
        icon={<Pencil aria-hidden className="size-4" />}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={startEdit}
      />
    </nav>
  );
}
