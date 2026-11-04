import {
  ArrowDownAZ,
  ArrowUpDown,
  ArrowUpZA,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  FileText,
  ListTree,
  Redo2,
  Shrink,
  Table2,
  Undo2,
} from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "../../components/common/Button";
import { Checkbox } from "../../components/common/Checkbox";
import { CopyButton } from "../../components/common/CopyButton";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { IconButton } from "../../components/common/IconButton";
import { Panel } from "../../components/common/Panel";
import { Segmented } from "../../components/common/Segmented";
import { StatusBadge } from "../../components/common/StatusBadge";
import {
  CodeEditor,
  type CodeEditorHandle,
  type CodeEditorLanguage,
  type LineHighlight,
} from "../../components/editors/CodeEditor";
import { SplitWorkspace } from "../../components/layout/SplitWorkspace";
import { ToolShell } from "../../components/layout/ToolShell";
import { useDebounced } from "../../hooks/useDebounced";
import { useHotkeys } from "../../hooks/useHotkeys";
import { getGuide } from "../../i18n";
import { formatNumber } from "../../i18n/format";
import { useT } from "../../i18n/useT";
import { downloadText } from "../../lib/io/download";
import type { Result, ToolError } from "../../lib/result";
import type { ToolMeta } from "../../registry/tools.meta";
import { findTable, type TreeNode } from "./model";
import { TableView } from "./TableView";
import { TreeView } from "./TreeView";

export type Side = "left" | "right";
export type View = "text" | "minify" | "tree" | "table";
export type Indent = 2 | 4;
export type Sort = "off" | "asc" | "desc";

const ICON = "size-4";
const NEXT_SORT: Record<Sort, Sort> = { off: "asc", asc: "desc", desc: "off" };

export interface CompareResult {
  count: number;
  left: LineHighlight[];
  right: LineHighlight[];
}

/** What differs between JSON and XML; the panes, views and actions are shared. */
export interface DataAdapter {
  language: CodeEditorLanguage;
  /** Validates and returns the tree for the Tree and Table views. */
  analyze: (text: string) => Result<TreeNode, ToolError>;
  format: (text: string, indent: Indent, sort: Sort) => Result<string, ToolError>;
  minify: (text: string) => Result<string, ToolError>;
  /** Present when sorting keys makes sense (JSON). */
  sortable?: boolean;
  /** Present when two texts can be compared (JSON). Null when either side is not valid. */
  compare?: (left: string, right: string) => CompareResult | null;
  download?: { filename: string; mime: string };
}

export interface DataLabels {
  /** Names of the two editors (textbox accessible names). */
  leftEditor: string;
  rightEditor: string;
  placeholder: string;
  sample: string;
  location: (line: number, column: number) => string;
}

interface PaneState {
  text: string;
  view: View;
  indent: Indent;
  sort: Sort;
}

const initialPane: PaneState = { text: "", view: "text", indent: 2, sort: "off" };
const BLANK = (text: string) => text.trim() === "";

export interface DualPaneToolProps {
  tool: ToolMeta;
  adapter: DataAdapter;
  labels: DataLabels;
  /** Extra notices below the error banner (for example XML encoding). */
  extraNotice?: (texts: Record<Side, string>) => ReactNode;
}

export function DualPaneTool({ tool, adapter, labels, extraNotice }: DualPaneToolProps) {
  const t = useT();
  const [panes, setPanes] = useState<Record<Side, PaneState>>({
    left: initialPane,
    right: initialPane,
  });
  const [compare, setCompare] = useState(false);
  const [jump, setJump] = useState(0);
  const [actionError, setActionError] = useState<{ side: Side; error: ToolError } | null>(null);
  const editors = { left: useRef<CodeEditorHandle>(null), right: useRef<CodeEditorHandle>(null) };

  const patch = (side: Side, change: Partial<PaneState>) =>
    setPanes((current) => ({ ...current, [side]: { ...current[side], ...change } }));
  const setText = (side: Side, text: string) => {
    setActionError((current) => (current?.side === side ? null : current));
    setPanes((current) =>
      current[side].text === text ? current : { ...current, [side]: { ...current[side], text } },
    );
  };

  const leftDebounced = useDebounced(panes.left.text, 250);
  const rightDebounced = useDebounced(panes.right.text, 250);
  const analyses = useMemo(
    () => ({
      left: BLANK(leftDebounced) ? null : adapter.analyze(leftDebounced),
      right: BLANK(rightDebounced) ? null : adapter.analyze(rightDebounced),
    }),
    [adapter, leftDebounced, rightDebounced],
  );

  const comparison = useMemo(() => {
    if (!compare || !adapter.compare) return null;
    return { result: adapter.compare(leftDebounced, rightDebounced) };
  }, [adapter, compare, leftDebounced, rightDebounced]);
  const diff = comparison?.result ?? null;

  const formatInto = (to: Side) => {
    const from: Side = to === "right" ? "left" : "right";
    const source = panes[from];
    if (BLANK(source.text)) return;
    const result = adapter.format(source.text, source.indent, source.sort);
    if (!result.ok) {
      setActionError({ side: from, error: result.error });
      return;
    }
    setActionError(null);
    patch(to, { text: result.value });
  };
  const copyInto = (to: Side) => {
    const from: Side = to === "right" ? "left" : "right";
    setText(to, panes[from].text);
  };

  const nextDiff = () => {
    if (!diff) return;
    const targets = [
      ...diff.left.map((mark) => ({ side: "left" as const, line: mark.line })),
      ...diff.right
        .filter((mark) => mark.kind === "added")
        .map((mark) => ({ side: "right" as const, line: mark.line })),
    ];
    const target = targets[jump % Math.max(targets.length, 1)];
    if (!target) return;
    setJump(jump + 1);
    editors[target.side].current?.goTo(target.line, 1);
  };

  useHotkeys([{ key: "Enter", mod: true, allowInInput: true, handler: () => formatInto("right") }]);

  // The first problem to show: a failed action, else the left text, else the right one.
  const problem = (() => {
    if (actionError) return actionError;
    for (const side of ["left", "right"] as const) {
      const analysis = analyses[side];
      if (analysis && !analysis.ok) return { side, error: analysis.error };
    }
    return null;
  })();
  const compareInvalid = compare && adapter.compare && diff === null;

  const sideName = (side: Side) => t(side === "left" ? "pane.left" : "pane.right");

  const renderPane = (side: Side) => {
    const pane = panes[side];
    const analysis = side === "left" ? analyses.left : analyses.right;
    const editorLabel = side === "left" ? labels.leftEditor : labels.rightEditor;
    const marks = diff ? diff[side] : undefined;
    const blank = BLANK(pane.text);
    const texting = pane.view === "text";

    const body = (() => {
      if (pane.view === "minify") {
        const minified = blank ? null : adapter.minify(pane.text);
        return (
          <CodeEditor
            language={adapter.language}
            readOnly
            value={minified?.ok ? minified.value : ""}
            ariaLabel={`${editorLabel} · ${t("view.minify")}`}
          />
        );
      }
      if (pane.view === "tree" || pane.view === "table") {
        // Fresh parse, not the debounced one, so switching view shows what is in the editor now.
        const current = blank ? null : adapter.analyze(pane.text);
        if (!current) return <p className="p-3 text-sm text-text-muted">{labels.placeholder}</p>;
        if (!current.ok)
          return <p className="p-3 text-sm text-text-muted">{t("tree.unavailable")}</p>;
        if (pane.view === "tree") {
          return <TreeView root={current.value} label={t("view.tree")} />;
        }
        const table = findTable(current.value);
        return table ? (
          <TableView table={table} label={t("view.table")} />
        ) : (
          <p className="p-3 text-sm text-text-muted">{t("table.noData")}</p>
        );
      }
      return null;
    })();

    return (
      <Panel
        title={sideName(side)}
        expandable
        toolbar={
          <>
            <Segmented<View>
              label={`${t("view.label")} · ${sideName(side)}`}
              iconOnly
              value={pane.view}
              onChange={(view) => patch(side, { view })}
              options={[
                {
                  value: "text",
                  label: t("view.text"),
                  icon: <FileText aria-hidden className={ICON} />,
                },
                {
                  value: "minify",
                  label: t("view.minify"),
                  icon: <Shrink aria-hidden className={ICON} />,
                },
                {
                  value: "tree",
                  label: t("view.tree"),
                  icon: <ListTree aria-hidden className={ICON} />,
                },
                {
                  value: "table",
                  label: t("view.table"),
                  icon: <Table2 aria-hidden className={ICON} />,
                },
              ]}
            />
            <Segmented<"2" | "4">
              label={`${t("json.indent")} · ${sideName(side)}`}
              iconOnly
              value={String(pane.indent) as "2" | "4"}
              onChange={(value) => patch(side, { indent: Number(value) as Indent })}
              options={[
                { value: "2", label: t("json.indent2"), icon: <span aria-hidden>{"2"}</span> },
                { value: "4", label: t("json.indent4"), icon: <span aria-hidden>{"4"}</span> },
              ]}
            />
            {adapter.sortable ? (
              <IconButton
                label={
                  pane.sort === "off"
                    ? t("json.sortOff")
                    : pane.sort === "asc"
                      ? t("json.sortAsc")
                      : t("json.sortDesc")
                }
                aria-pressed={pane.sort !== "off"}
                icon={
                  pane.sort === "asc" ? (
                    <ArrowDownAZ aria-hidden className={ICON} />
                  ) : pane.sort === "desc" ? (
                    <ArrowUpZA aria-hidden className={ICON} />
                  ) : (
                    <ArrowUpDown aria-hidden className={ICON} />
                  )
                }
                onClick={() => patch(side, { sort: NEXT_SORT[pane.sort] })}
              />
            ) : null}
            <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
            <IconButton
              label={t("action.sample")}
              icon={<FileText aria-hidden className={ICON} />}
              onClick={() => {
                patch(side, { view: "text" });
                setText(side, labels.sample);
              }}
            />
            <IconButton
              label={t("action.clear")}
              icon={<Eraser aria-hidden className={ICON} />}
              onClick={() => setText(side, "")}
              disabled={pane.text === ""}
            />
            <IconButton
              label={t("pane.undo")}
              icon={<Undo2 aria-hidden className={ICON} />}
              onClick={() => editors[side].current?.undo()}
              disabled={!texting}
            />
            <IconButton
              label={t("pane.redo")}
              icon={<Redo2 aria-hidden className={ICON} />}
              onClick={() => editors[side].current?.redo()}
              disabled={!texting}
            />
          </>
        }
        actions={
          <>
            {analysis ? (
              <StatusBadge tone={analysis.ok ? "success" : "danger"}>
                {analysis.ok ? t("status.valid") : t("status.invalid")}
              </StatusBadge>
            ) : null}
            {adapter.download ? (
              <IconButton
                label={t("xml.download")}
                icon={<Download aria-hidden className={ICON} />}
                disabled={blank}
                onClick={() =>
                  downloadText(adapter.download!.filename, pane.text, adapter.download!.mime)
                }
              />
            ) : null}
            <CopyButton iconOnly text={pane.text} disabled={blank} />
          </>
        }
      >
        {/* Kept mounted while another view shows, so its undo history survives. */}
        <div className={texting ? "h-full" : "hidden"}>
          <CodeEditor
            ref={editors[side]}
            language={adapter.language}
            value={pane.text}
            onChange={(text) => setText(side, text)}
            ariaLabel={editorLabel}
            placeholder={labels.placeholder}
            highlights={marks}
          />
        </div>
        {texting ? null : <div className="h-full">{body}</div>}
      </Panel>
    );
  };

  const group = (title: string, children: ReactNode) => (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-medium text-text-muted">{title}</span>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
  const arrow = (side: Side, kind: "copy" | "format") => {
    const label = t(kind === "copy" ? "pane.copyTo" : "pane.formatTo", {
      side: t(side === "left" ? "pane.sideLeft" : "pane.sideRight"),
    });
    const from: Side = side === "right" ? "left" : "right";
    return (
      <Button
        key={side}
        aria-label={label}
        title={label}
        className="min-w-10 px-2"
        variant={kind === "format" ? "primary" : "secondary"}
        disabled={kind === "format" && BLANK(panes[from].text)}
        onClick={() => (kind === "copy" ? copyInto(side) : formatInto(side))}
        icon={
          side === "left" ? (
            <ChevronLeft aria-hidden className={`${ICON} max-lg:rotate-90`} />
          ) : (
            <ChevronRight aria-hidden className={`${ICON} max-lg:rotate-90`} />
          )
        }
      />
    );
  };

  const position = problem?.error.position;
  const extra = extraNotice?.({ left: panes.left.text, right: panes.right.text });

  return (
    <ToolShell
      tool={tool}
      guide={getGuide("vi", tool.id)}
      notice={
        problem || compareInvalid || extra ? (
          <div className="space-y-2">
            {problem ? (
              <ErrorBanner
                title={`${sideName(problem.side)}: ${problem.error.message}`}
                detail={problem.error.detail}
                locationLabel={
                  position ? labels.location(position.line, position.column) : undefined
                }
                onJump={
                  position
                    ? () => editors[problem.side].current?.goTo(position.line, position.column)
                    : undefined
                }
              />
            ) : null}
            {compareInvalid && !problem ? (
              <p role="note" className="text-sm text-text-muted">
                {t("json.diffInvalid")}
              </p>
            ) : null}
            {extra}
          </div>
        ) : null
      }
      status={
        <>
          {diff ? (
            <StatusBadge tone={diff.count === 0 ? "success" : "warning"}>
              {diff.count === 0 ? t("json.diffNone") : t("json.diffCount", { count: diff.count })}
            </StatusBadge>
          ) : null}
          <span className="tabular-nums">
            {t("common.chars", {
              count: `${formatNumber(panes.left.text.length)} / ${formatNumber(panes.right.text.length)}`,
            })}
          </span>
        </>
      }
    >
      <SplitWorkspace
        actions={
          <>
            {group(t("action.copy"), [arrow("left", "copy"), arrow("right", "copy")])}
            {group(t("json.format"), [arrow("left", "format"), arrow("right", "format")])}
            {adapter.compare ? (
              <div className="flex flex-col items-center gap-1.5">
                <Checkbox
                  label={t("compare.label")}
                  checked={compare}
                  onChange={(event) => setCompare(event.target.checked)}
                />
                {compare && diff && diff.count > 0 ? (
                  <IconButton
                    label={t("json.nextDiff")}
                    icon={<ChevronDown aria-hidden className={ICON} />}
                    onClick={nextDiff}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        }
        left={renderPane("left")}
        right={renderPane("right")}
      />
    </ToolShell>
  );
}
