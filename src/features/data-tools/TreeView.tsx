import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MenuButton, type MenuItem } from "../../components/common/MenuButton";
import type { MessageKey } from "../../i18n";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";
import { InlineEdit } from "./InlineEdit";
import { defaultExpanded, isContainer, type TreeNode } from "./model";
import type { DiffMarks, NodeAction, ValueKind } from "./types";

const KIND_LABEL: Record<ValueKind, MessageKey> = {
  string: "kind.string",
  number: "kind.number",
  boolean: "kind.boolean",
  null: "kind.null",
  object: "kind.object",
  array: "kind.array",
};
const KINDS = Object.keys(KIND_LABEL) as ValueKind[];

const scalarKind = (node: TreeNode): "string" | "number" | "boolean" | null =>
  node.kind === "string" || node.kind === "number" || node.kind === "boolean" ? node.kind : null;

export type EditField = "key" | "value";

/** Children rendered per node before "show more"; keeps huge arrays responsive. */
const PAGE = 100;

const valueClass: Record<string, string> = {
  string: "text-success-fg",
  number: "text-warning-fg",
  boolean: "text-warning-fg",
  null: "text-text-muted italic",
  attribute: "text-success-fg",
  text: "text-text",
};

type Entry =
  | { type: "row"; node: TreeNode; depth: number; parent: TreeNode | null }
  | { type: "more"; owner: TreeNode; depth: number; remaining: number }
  /** The closing } or ] under an open object or array. */
  | { type: "close"; node: TreeNode; depth: number };

/** The rows currently on screen, in order: open containers contribute their (paged) children. */
function flatten(
  root: TreeNode,
  expanded: ReadonlySet<string>,
  shown: ReadonlyMap<string, number>,
): Entry[] {
  const out: Entry[] = [];
  const visit = (node: TreeNode, depth: number, parent: TreeNode | null) => {
    out.push({ type: "row", node, depth, parent });
    const children = node.children ?? [];
    if (!isContainer(node) || children.length === 0 || !expanded.has(node.id)) return;
    const limit = shown.get(node.id) ?? PAGE;
    for (const child of children.slice(0, limit)) visit(child, depth + 1, node);
    if (children.length > limit) {
      out.push({ type: "more", owner: node, depth: depth + 1, remaining: children.length - limit });
    }
    if (node.kind === "object" || node.kind === "array") out.push({ type: "close", node, depth });
  };
  visit(root, 0, null);
  return out;
}

export interface TreeViewProps {
  root: TreeNode;
  label: string;
  /** Open containers; null means the default (the root and its children). */
  expanded?: ReadonlySet<string> | null;
  onExpandedChange?: (next: Set<string>) => void;
  selectedId?: string | null;
  onSelect?: (node: TreeNode) => void;
  /** Ids to tint (search hits) and the one the search is on. */
  matches?: ReadonlySet<string>;
  currentMatchId?: string | null;
  /** Compare mode: tints changed nodes (with +, − or ~) and flags the containers that hold changes. */
  diff?: DiffMarks;
  /** Turns on in-place editing, the node menu and the Enter, F2, Delete and Ctrl+D keys. */
  editable?: boolean;
  /** The key or value being edited right now. */
  editing?: { id: string; field: EditField } | null;
  onStartEdit?: (node: TreeNode, field: EditField) => void;
  onCancelEdit?: () => void;
  /** Returns an error message to keep editing, or null when the change was accepted. */
  onCommitEdit?: (node: TreeNode, field: EditField, text: string) => string | null;
  onAction?: (node: TreeNode, action: NodeAction) => void;
}

export function TreeView({
  root,
  label,
  expanded = null,
  onExpandedChange,
  selectedId = null,
  onSelect,
  matches,
  currentMatchId = null,
  diff,
  editable = false,
  editing = null,
  onStartEdit,
  onCancelEdit,
  onCommitEdit,
  onAction,
}: TreeViewProps) {
  const t = useT();
  const uid = useId();
  const [localExpanded, setLocalExpanded] = useState<Set<string> | null>(null);
  const [shown, setShown] = useState<ReadonlyMap<string, number>>(new Map());
  const rowRefs = useRef(new Map<string, HTMLElement>());

  const open = useMemo(
    () => expanded ?? localExpanded ?? defaultExpanded(root),
    [expanded, localExpanded, root],
  );
  const entries = useMemo(() => flatten(root, open, shown), [root, open, shown]);
  const setOpen = (next: Set<string>) => {
    setLocalExpanded(next);
    onExpandedChange?.(next);
  };
  const toggle = (node: TreeNode, force?: boolean) => {
    const next = new Set(open);
    const want = force ?? !next.has(node.id);
    if (want) next.add(node.id);
    else next.delete(node.id);
    setOpen(next);
  };

  const selectedIndex = entries.findIndex(
    (entry) => entry.type === "row" && entry.node.id === selectedId,
  );

  useEffect(() => {
    if (selectedId) rowRefs.current.get(selectedId)?.scrollIntoView?.({ block: "nearest" });
  }, [selectedId, entries.length]);

  const menuItems = (node: TreeNode, parent: TreeNode | null): MenuItem[] => {
    const items: MenuItem[] = [];
    if (scalarKind(node)) {
      items.push({ label: t("edit.value"), onSelect: () => onStartEdit?.(node, "value") });
    }
    if (parent?.kind === "object") {
      items.push({ label: t("edit.key"), onSelect: () => onStartEdit?.(node, "key") });
    }
    if (parent) {
      items.push(
        { label: t("edit.insertBefore"), onSelect: () => onAction?.(node, "insertBefore") },
        { label: t("edit.insertAfter"), onSelect: () => onAction?.(node, "insertAfter") },
      );
    }
    if (isContainer(node)) {
      items.push({ label: t("edit.addChild"), onSelect: () => onAction?.(node, "addChild") });
    }
    if (parent) {
      items.push(
        { label: t("edit.duplicate"), onSelect: () => onAction?.(node, "duplicate") },
        { label: t("edit.remove"), onSelect: () => onAction?.(node, "remove") },
      );
    }
    for (const to of KINDS) {
      if (to === node.kind) continue;
      items.push({
        label: `${t("edit.changeType")} ${t(KIND_LABEL[to])}`,
        onSelect: () => onAction?.(node, { type: "changeType", to }),
      });
    }
    return items;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    // Keys from the editor field or the node menu belong to them, not to the tree.
    if (editing || event.target !== event.currentTarget) return;
    const rows = entries.filter((entry) => entry.type === "row");
    const at = rows.findIndex((entry) => entry.node.id === selectedId);
    const current = at >= 0 ? rows[at] : undefined;
    const go = (index: number) => {
      const target = rows[Math.min(Math.max(index, 0), rows.length - 1)];
      if (target) onSelect?.(target.node);
    };
    switch (event.key) {
      case "ArrowDown":
        go(at + 1);
        break;
      case "ArrowUp":
        go(at < 0 ? 0 : at - 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(rows.length - 1);
        break;
      case "ArrowRight":
        if (!current) go(0);
        else if (isContainer(current.node) && current.node.children?.length) {
          if (!open.has(current.node.id)) toggle(current.node, true);
          else go(at + 1);
        }
        break;
      case "ArrowLeft":
        if (current) {
          if (open.has(current.node.id) && isContainer(current.node)) toggle(current.node, false);
          else if (current.parent) onSelect?.(current.parent);
        }
        break;
      case "Enter":
      case "F2":
        if (!editable || !current) return;
        if (scalarKind(current.node)) onStartEdit?.(current.node, "value");
        else if (current.parent?.kind === "object") onStartEdit?.(current.node, "key");
        break;
      case "Delete":
        if (!editable || !current?.parent) return;
        onAction?.(current.node, "remove");
        break;
      case "d":
      case "D":
        if (!editable || !current?.parent || !(event.ctrlKey || event.metaKey)) return;
        onAction?.(current.node, "duplicate");
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div className="h-full overflow-auto p-2" role="region" aria-label={label}>
      <ul
        role="tree"
        aria-label={label}
        tabIndex={0}
        aria-activedescendant={selectedIndex >= 0 ? `${uid}-${selectedIndex}` : undefined}
        onKeyDown={onKeyDown}
        className="rounded-sm"
      >
        {entries.map((entry, index) => {
          const pad = { paddingLeft: `calc(${entry.depth} * 1rem)` };
          if (entry.type === "close") {
            return (
              <li
                key={`close:${entry.node.id}`}
                role="none"
                style={{ paddingLeft: `calc(${entry.depth} * 1rem + 1.75rem)` }}
                className="min-h-6 font-mono text-[13px] text-text-muted"
              >
                <span aria-hidden>{entry.node.kind === "array" ? "]" : "}"}</span>
              </li>
            );
          }
          if (entry.type === "more") {
            return (
              <li key={`more:${entry.owner.id}`} role="none" style={pad}>
                <button
                  type="button"
                  onClick={() =>
                    setShown(
                      new Map(shown).set(
                        entry.owner.id,
                        (shown.get(entry.owner.id) ?? PAGE) + PAGE,
                      ),
                    )
                  }
                  className="ml-6 min-h-7 text-sm text-primary underline"
                >
                  {t("tree.more", { count: entry.remaining })}
                </button>
              </li>
            );
          }
          const { node } = entry;
          const children = node.children ?? [];
          const expandable = isContainer(node) && children.length > 0;
          const isOpen = expandable && open.has(node.id);
          const isIndex =
            node.kind !== "element" && /^\d+$/.test(node.label) && node.index !== undefined;
          const summary =
            node.kind === "array"
              ? t("tree.items", { count: node.count ?? 0 })
              : node.kind === "object"
                ? t("tree.keys", { count: node.count ?? 0 })
                : null;
          const selected = node.id === selectedId;
          const hit = matches?.has(node.id) ?? false;
          const mark = diff?.marks.get(node.id);
          const holdsDiff = !mark && (diff?.containers.has(node.id) ?? false);
          const editingKey = editing?.id === node.id && editing.field === "key";
          const editingValue = editing?.id === node.id && editing.field === "value";
          const scalar = scalarKind(node);
          const canRename = editable && entry.parent?.kind === "object";
          const name = node.label;
          return (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled on the tree (aria-activedescendant)
            <li
              key={node.id}
              id={`${uid}-${index}`}
              ref={(element) => {
                if (element) rowRefs.current.set(node.id, element);
                else rowRefs.current.delete(node.id);
              }}
              role="treeitem"
              aria-level={entry.depth + 1}
              aria-expanded={expandable ? isOpen : undefined}
              aria-selected={selected}
              onClick={() => onSelect?.(node)}
              style={pad}
              className={cn(
                "flex min-h-7 cursor-default items-center gap-1.5 rounded-sm border-l-2 px-1 hover:bg-surface-muted",
                selected ? "border-primary" : "border-transparent",
                selected && !mark && "bg-surface-muted",
                mark === "added" && "bg-success/20",
                mark === "removed" && "bg-danger/20",
                mark === "changed" && "bg-warning/25",
                hit && !selected && "bg-warning/25",
                node.id === currentMatchId && "ring-1 ring-warning",
              )}
            >
              {expandable ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(node);
                  }}
                  className="grid size-5 shrink-0 place-items-center rounded-sm text-text-muted hover:text-text"
                >
                  {isOpen ? (
                    <ChevronDown aria-hidden className="size-4" />
                  ) : (
                    <ChevronRight aria-hidden className="size-4" />
                  )}
                </button>
              ) : (
                <span aria-hidden className="size-5 shrink-0" />
              )}
              {mark ? (
                <span aria-hidden className="w-3 shrink-0 text-center font-mono text-xs font-bold">
                  {mark === "added" ? "+" : mark === "removed" ? "−" : "~"}
                </span>
              ) : null}
              {mark ? (
                <span className="sr-only">
                  {t(
                    mark === "added"
                      ? "diff.added"
                      : mark === "removed"
                        ? "diff.removed"
                        : "diff.changed",
                  )}
                </span>
              ) : null}
              {editingKey ? (
                <InlineEdit
                  kind="key"
                  initial={node.label}
                  label={t("edit.keyLabel", { key: name })}
                  onCommit={(text) => onCommitEdit?.(node, "key", text) ?? null}
                  onCancel={() => onCancelEdit?.()}
                />
              ) : (
                <span
                  onDoubleClick={canRename ? () => onStartEdit?.(node, "key") : undefined}
                  className={cn(
                    "font-mono text-[13px]",
                    isIndex ? "text-text-muted" : "text-info-fg",
                    node.kind === "element" && "font-semibold",
                  )}
                >
                  {node.label}
                </span>
              )}
              {node.kind === "element" && node.index !== undefined ? (
                <span className="rounded bg-surface-muted px-1 font-mono text-xs text-text-muted">
                  {t("tree.nth", { index: node.index, count: node.count ?? 0 })}
                </span>
              ) : null}
              {node.kind === "object" || node.kind === "array" ? (
                <>
                  <span aria-hidden className="text-text-muted">
                    {":"}
                  </span>
                  <span aria-hidden className="font-mono text-[13px] text-text-muted">
                    {node.kind === "array"
                      ? !children.length
                        ? "[]"
                        : isOpen
                          ? "["
                          : "[…]"
                      : !children.length
                        ? "{}"
                        : isOpen
                          ? "{"
                          : "{…}"}
                  </span>
                </>
              ) : null}
              {summary ? (
                <span className="rounded bg-surface-muted px-1.5 text-xs text-text-muted">
                  {summary}
                </span>
              ) : node.kind === "element" && children.length > 0 ? (
                <span className="rounded bg-surface-muted px-1.5 text-xs text-text-muted">
                  {t("tree.children", { count: children.length })}
                </span>
              ) : null}
              {holdsDiff ? (
                <span title={t("diff.holds")} className="text-warning-fg">
                  <span aria-hidden>{"●"}</span>
                  <span className="sr-only">{t("diff.holds")}</span>
                </span>
              ) : null}
              {node.value !== undefined ? (
                <>
                  <span aria-hidden className="text-text-muted">
                    {":"}
                  </span>
                  {editingValue && scalar ? (
                    <InlineEdit
                      kind={scalar}
                      initial={node.value}
                      label={t("edit.valueLabel", { key: name })}
                      onCommit={(text) => onCommitEdit?.(node, "value", text) ?? null}
                      onCancel={() => onCancelEdit?.()}
                    />
                  ) : (
                    <span
                      onDoubleClick={
                        editable && scalar ? () => onStartEdit?.(node, "value") : undefined
                      }
                      className={cn("font-mono text-[13px] break-all", valueClass[node.kind])}
                    >
                      {node.kind === "string" ? JSON.stringify(node.value) : node.value}
                    </span>
                  )}
                </>
              ) : null}
              {editable && selected && !editing ? (
                <span
                  role="presentation"
                  className="ml-auto shrink-0"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MenuButton
                    iconOnly
                    alignEnd
                    label={t("edit.menu")}
                    icon={<MoreHorizontal aria-hidden className="size-4" />}
                    items={menuItems(node, entry.parent)}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
