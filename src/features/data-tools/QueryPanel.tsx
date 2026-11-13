import { useId, type KeyboardEvent } from "react";
import { Button } from "../../components/common/Button";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";
import type { QuerySpec } from "./types";

export interface QueryPanelProps {
  /** Name of the pane, so two panes can be told apart by a screen reader. */
  title: string;
  spec: QuerySpec;
  onChange: (spec: QuerySpec) => void;
  /** What the query found, or null while there is nothing to run. */
  summary: { matched: number; total: number; base: string } | null;
  error: string | null;
  onApply: () => void;
  onCancel: () => void;
}

const field =
  "min-h-11 sm:min-h-9 w-full rounded-md border bg-surface px-2 font-mono text-[13px] placeholder:text-text-muted";

/** The query bar of one pane: Filter, Project and Sort boxes written like MongoDB Compass, plus the result count. */
export function QueryPanel({
  title,
  spec,
  onChange,
  summary,
  error,
  onApply,
  onCancel,
}: QueryPanelProps) {
  const t = useT();
  const uid = useId();
  const errorId = `${uid}-error`;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };
  const box = (key: keyof QuerySpec, label: string, placeholder: string, wide = false) => (
    <label className={cn("flex min-w-0 flex-col gap-1 text-xs font-medium", wide && "col-span-2")}>
      {label}
      <input
        aria-label={`${label} · ${title}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={spec[key]}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => onChange({ ...spec, [key]: event.target.value })}
        className={cn(field, error ? "border-danger" : "border-border-strong")}
      />
    </label>
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Esc closes the bar from any of its fields
    <section
      aria-label={`${t("query.title")} · ${title}`}
      onKeyDown={onKeyDown}
      className="space-y-2 border-b border-border p-2"
    >
      <div className="grid grid-cols-2 gap-2">
        {box("filter", t("query.filter"), t("query.filterPh"), true)}
        {box("project", t("query.project"), t("query.projectPh"))}
        {box("sort", t("query.sort"), t("query.sortPh"))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          id={errorId}
          role={error ? "alert" : "status"}
          className={cn("min-w-0 flex-1 text-sm", error ? "text-danger" : "text-text-muted")}
        >
          {error ??
            (summary
              ? `${t("query.summary", { matched: summary.matched, total: summary.total })} · ${t("query.base", { path: summary.base })}`
              : t("query.help"))}
        </p>
        <div className="flex gap-1.5">
          <Button variant="secondary" onClick={onCancel}>
            {t("action.cancel")}
          </Button>
          <Button onClick={onApply} disabled={!summary || !!error}>
            {t("query.apply")}
          </Button>
        </div>
      </div>
    </section>
  );
}
