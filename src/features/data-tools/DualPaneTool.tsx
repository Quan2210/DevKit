import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "../../components/common/Button";
import { Checkbox } from "../../components/common/Checkbox";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { Notice } from "../../components/common/Notice";
import { IconButton } from "../../components/common/IconButton";
import { StatusBadge } from "../../components/common/StatusBadge";
import type { CodeEditorHandle } from "../../components/editors/CodeEditor";
import { SplitWorkspace } from "../../components/layout/SplitWorkspace";
import { ToolShell } from "../../components/layout/ToolShell";
import { useDebounced } from "../../hooks/useDebounced";
import { useHotkeys } from "../../hooks/useHotkeys";
import { getGuide } from "../../i18n";
import { formatNumber } from "../../i18n/format";
import { useT } from "../../i18n/useT";
import type { ToolError } from "../../lib/result";
import type { ToolMeta } from "../../registry/tools.meta";
import { DataPane, type DataPaneHandle } from "./DataPane";
import {
  initialPane,
  isBlank,
  isQueryActive,
  type DataAdapter,
  type DataLabels,
  type PaneState,
  type Side,
} from "./types";

export type {
  CompareResult,
  DataAdapter,
  DataLabels,
  EditorSupport,
  Indent,
  Side,
  Sort,
  View,
} from "./types";

const ICON = "size-4";
const BLANK = isBlank;

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
  // Compare was asked for while a pane was not in the Tree view.
  const [compareWarn, setCompareWarn] = useState(false);
  // The difference the jump buttons are on (-1: none yet).
  const [cursor, setCursor] = useState(-1);
  const [actionError, setActionError] = useState<{ side: Side; error: ToolError } | null>(null);
  const editors = { left: useRef<CodeEditorHandle>(null), right: useRef<CodeEditorHandle>(null) };
  const handles = { left: useRef<DataPaneHandle>(null), right: useRef<DataPaneHandle>(null) };

  const patch = (side: Side, change: Partial<PaneState>) => {
    // Compare lives in the Tree view: leaving it on either side ends the comparison.
    if (change.view !== undefined && change.view !== "tree") setCompare(false);
    setPanes((current) => ({ ...current, [side]: { ...current[side], ...change } }));
  };
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
    let text = source.text;
    // Transform: the query typed in the source pane is applied before formatting.
    const query = adapter.editor?.query;
    if (query && source.queryOpen && isQueryActive(source.query)) {
      const run = query.run(text, source.query, source.indent);
      if (!run.ok) {
        setActionError({ side: from, error: run.error });
        return;
      }
      text = run.value.text;
    }
    const result = adapter.format(text, source.indent, source.sort);
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

  const bothTree = panes.left.view === "tree" && panes.right.view === "tree";
  const toggleCompare = (on: boolean) => {
    if (!on) {
      setCompare(false);
      setCompareWarn(false);
      return;
    }
    // Differences are only shown in the Tree view: ask for it instead of switching behind the user's back.
    if (!bothTree) {
      setCompareWarn(true);
      return;
    }
    startCompare();
  };
  const startCompare = () => {
    setCompareWarn(false);
    // Both sides go to the Tree view, where the differences are shown.
    setPanes((current) => ({
      left: { ...current.left, view: "tree" },
      right: { ...current.right, view: "tree" },
    }));
    setCompare(true);
    setCursor(-1);
    // Open what holds a difference, so they are visible without hunting for them.
    const result = adapter.compare?.(panes.left.text, panes.right.text);
    if (result) {
      handles.left.current?.expand(result.left.containers);
      handles.right.current?.expand(result.right.containers);
    }
  };

  const stepDiff = (delta: 1 | -1) => {
    if (!diff || diff.count === 0) return;
    const total = diff.items.length;
    const index = (cursor + delta + total) % total;
    setCursor(index);
    const item = diff.items[index]!;
    if (item.kind !== "added") handles.left.current?.reveal(item.path);
    if (item.kind !== "removed") handles.right.current?.reveal(item.path);
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
  const showWarn = compareWarn && !bothTree;

  const sideName = (side: Side) => t(side === "left" ? "pane.left" : "pane.right");

  const renderPane = (side: Side) => (
    <DataPane
      title={sideName(side)}
      adapter={adapter}
      labels={labels}
      editorLabel={side === "left" ? labels.leftEditor : labels.rightEditor}
      pane={panes[side]}
      patch={(change) => patch(side, change)}
      setText={(text) => setText(side, text)}
      analysis={analyses[side]}
      diff={compare && diff ? diff[side] : undefined}
      editorRef={editors[side]}
      handleRef={handles[side]}
    />
  );

  const group = (title: string, children: ReactNode) => (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-medium text-text-muted">{title}</span>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
  const transformable = !!adapter.editor?.query;
  const arrow = (side: Side, kind: "copy" | "format") => {
    const label = t(
      kind === "copy" ? "pane.copyTo" : transformable ? "pane.transformTo" : "pane.formatTo",
      {
        side: t(side === "left" ? "pane.sideLeft" : "pane.sideRight"),
      },
    );
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
      fill
      notice={
        problem || compareInvalid || showWarn || extra ? (
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
            {showWarn ? (
              <Notice tone="warning">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{t("compare.needsTree")}</span>
                  <Button variant="secondary" onClick={startCompare}>
                    {t("compare.switch")}
                  </Button>
                </div>
              </Notice>
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
            {group(t(transformable ? "json.transform" : "json.format"), [
              arrow("left", "format"),
              arrow("right", "format"),
            ])}
            {adapter.compare ? (
              <div className="flex flex-col items-center gap-1.5">
                <Checkbox
                  label={t("compare.label")}
                  checked={compare}
                  onChange={(event) => toggleCompare(event.target.checked)}
                />
                {compare && diff && diff.count > 0 ? (
                  <div className="flex gap-1.5">
                    <IconButton
                      label={t("json.prevDiff")}
                      icon={<ChevronUp aria-hidden className={ICON} />}
                      onClick={() => stepDiff(-1)}
                    />
                    <IconButton
                      label={t("json.nextDiff")}
                      icon={<ChevronDown aria-hidden className={ICON} />}
                      onClick={() => stepDiff(1)}
                    />
                  </div>
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
