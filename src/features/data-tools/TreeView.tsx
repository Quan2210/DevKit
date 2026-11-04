import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";
import type { TreeNode } from "./model";

/** Children rendered per node before "show more"; keeps huge arrays responsive. */
const PAGE = 100;
/** Nodes at this depth or shallower start open. */
const OPEN_DEPTH = 1;

const valueClass: Record<string, string> = {
  string: "text-success-fg",
  number: "text-warning-fg",
  boolean: "text-warning-fg",
  null: "text-text-muted italic",
  attribute: "text-success-fg",
  text: "text-text",
};

function Row({ node, depth }: { node: TreeNode; depth: number }) {
  const t = useT();
  const [open, setOpen] = useState(depth <= OPEN_DEPTH);
  const [shown, setShown] = useState(PAGE);
  const children = node.children ?? [];
  const container = node.kind === "object" || node.kind === "array" || node.kind === "element";
  const expandable = container && children.length > 0;
  const isIndex = node.kind !== "element" && /^\d+$/.test(node.label) && node.index !== undefined;

  const summary =
    node.kind === "array"
      ? t("tree.items", { count: node.count ?? 0 })
      : node.kind === "object"
        ? t("tree.keys", { count: node.count ?? 0 })
        : null;

  return (
    <li>
      <div className="flex min-h-7 items-center gap-1.5 rounded-sm px-1 hover:bg-surface-muted">
        {expandable ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={node.label}
            onClick={() => setOpen(!open)}
            className="grid size-5 shrink-0 place-items-center rounded-sm text-text-muted hover:text-text"
          >
            {open ? (
              <ChevronDown aria-hidden className="size-4" />
            ) : (
              <ChevronRight aria-hidden className="size-4" />
            )}
          </button>
        ) : (
          <span aria-hidden className="size-5 shrink-0" />
        )}
        <span
          className={cn(
            "font-mono text-[13px]",
            isIndex ? "text-text-muted" : "text-info-fg",
            node.kind === "element" && "font-semibold",
          )}
        >
          {node.label}
        </span>
        {node.kind === "element" && node.index !== undefined ? (
          <span className="rounded bg-surface-muted px-1 font-mono text-xs text-text-muted">
            {t("tree.nth", { index: node.index, count: node.count ?? 0 })}
          </span>
        ) : null}
        {summary ? (
          <span className="rounded bg-surface-muted px-1.5 text-xs text-text-muted">{summary}</span>
        ) : node.kind === "element" && children.length > 0 ? (
          <span className="rounded bg-surface-muted px-1.5 text-xs text-text-muted">
            {t("tree.children", { count: children.length })}
          </span>
        ) : null}
        {node.value !== undefined ? (
          <>
            <span aria-hidden className="text-text-muted">
              {":"}
            </span>
            <span className={cn("font-mono text-[13px] break-all", valueClass[node.kind])}>
              {node.kind === "string" ? JSON.stringify(node.value) : node.value}
            </span>
          </>
        ) : null}
      </div>
      {expandable && open ? (
        <ul className="ml-2.5 border-l border-border pl-2">
          {children.slice(0, shown).map((child) => (
            <Row key={child.id} node={child} depth={depth + 1} />
          ))}
          {children.length > shown ? (
            <li>
              <button
                type="button"
                onClick={() => setShown(shown + PAGE)}
                className="ml-6 min-h-7 text-sm text-primary underline"
              >
                {t("tree.more", { count: children.length - shown })}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}

export function TreeView({ root, label }: { root: TreeNode; label: string }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be keyboard reachable
    <div className="h-full overflow-auto p-2" role="region" aria-label={label} tabIndex={0}>
      <ul>
        <Row node={root} depth={0} />
      </ul>
    </div>
  );
}
