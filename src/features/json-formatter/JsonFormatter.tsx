import {
  AlignLeft,
  ArrowDownAZ,
  ArrowUpDown,
  ArrowUpZA,
  ChevronDown,
  Eraser,
  FileText,
  GitCompare,
  Shrink,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CodeEditor, type CodeEditorHandle } from "../../components/editors/CodeEditor";
import { CopyButton } from "../../components/common/CopyButton";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { IconButton } from "../../components/common/IconButton";
import { Notice } from "../../components/common/Notice";
import { Panel } from "../../components/common/Panel";
import { Segmented } from "../../components/common/Segmented";
import { StatusBadge } from "../../components/common/StatusBadge";
import { UndoBar } from "../../components/common/UndoBar";
import { SplitWorkspace } from "../../components/layout/SplitWorkspace";
import { ToolShell } from "../../components/layout/ToolShell";
import { useDebounced } from "../../hooks/useDebounced";
import { useHotkeys } from "../../hooks/useHotkeys";
import { getGuide } from "../../i18n";
import { formatNumber } from "../../i18n/format";
import { useT } from "../../i18n/useT";
import { getTool } from "../../registry/tools.meta";
import { diffJson, markLines } from "./core/diff";
import {
  findLossyNumbers,
  formatJson,
  minifyJson,
  parseJson,
  type JsonIndent,
  type SortOrder,
} from "./core/json";

/** Above this size the result only updates when the user presses a button (docs/04 §7.1). */
const AUTO_LIMIT = 200_000;
const ICON = "size-4";

type Mode = "format" | "minify";
type Sort = SortOrder | "off";
const NEXT_SORT: Record<Sort, Sort> = { off: "asc", asc: "desc", desc: "off" };

export function JsonFormatter() {
  const t = useT();
  const tool = getTool("json");
  const [input, setInputState] = useState("");
  // Text typed on the right side; null while it simply shows the result for the left side.
  const [rightEdit, setRightEdit] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("format");
  const [indent, setIndent] = useState<JsonIndent>(2);
  const [sort, setSort] = useState<Sort>("off");
  const [compare, setCompare] = useState(false);
  const [jump, setJump] = useState(0);
  const [manual, setManual] = useState<string | null>(null);
  const [cleared, setCleared] = useState<string | null>(null);
  const [lastGood, setLastGood] = useState("");
  const editor = useRef<CodeEditorHandle>(null);
  const rightEditor = useRef<CodeEditorHandle>(null);
  const debounced = useDebounced(input, 250);

  const setInput = (value: string) => {
    setInputState(value);
    setRightEdit(null);
  };

  // A button press applies the current text at once; otherwise small inputs follow typing after a pause.
  const source = manual === input ? input : input.length <= AUTO_LIMIT ? debounced : (manual ?? "");
  const blank = source.trim() === "";
  // Large inputs only update on a button press, so after an edit the shown result is out of date.
  const pending = input.length > AUTO_LIMIT && manual !== input;
  const order = sort === "off" ? undefined : sort;

  const result = useMemo(
    () =>
      blank
        ? null
        : mode === "format"
          ? formatJson(source, indent, order)
          : minifyJson(source, order),
    [blank, source, mode, indent, order],
  );
  const lossy = useMemo(
    () => (blank || pending ? [] : findLossyNumbers(source)),
    [blank, pending, source],
  );

  // Keep the last valid output while the input is broken; drop it when the input is emptied.
  if (result?.ok && result.value !== lastGood) setLastGood(result.value);
  if (blank && lastGood !== "") setLastGood("");

  const rightText = rightEdit ?? lastGood;
  const rightDebounced = useDebounced(rightText, 250);

  const comparison = useMemo(() => {
    if (!compare) return null;
    const a = parseJson(debounced);
    const b = parseJson(rightDebounced);
    if (!a.ok || !b.ok) return { invalid: true as const };
    const diffs = diffJson(a.value, b.value);
    return { invalid: false as const, diffs, marks: markLines(diffs, debounced, rightDebounced) };
  }, [compare, debounced, rightDebounced]);
  const marks = comparison && !comparison.invalid ? comparison.marks : undefined;
  const diffCount = comparison && !comparison.invalid ? comparison.diffs.length : 0;

  const run = (next: Mode) => {
    setMode(next);
    setManual(input);
    setRightEdit(null);
  };
  const clear = () => {
    if (input === "") return;
    setCleared(input);
    setInput("");
    setManual("");
  };
  const undo = () => {
    if (cleared === null) return;
    setInput(cleared);
    setManual(cleared);
    setCleared(null);
  };
  const nextDiff = () => {
    if (!marks) return;
    const targets = [
      ...marks.left.map((mark) => ({ side: "left" as const, line: mark.line })),
      ...marks.right
        .filter((mark) => mark.kind === "added")
        .map((mark) => ({ side: "right" as const, line: mark.line })),
    ];
    const target = targets[jump % Math.max(targets.length, 1)];
    if (!target) return;
    setJump(jump + 1);
    (target.side === "left" ? editor : rightEditor).current?.goTo(target.line, 1);
  };

  useHotkeys([{ key: "Enter", mod: true, allowInInput: true, handler: () => run(mode) }]);

  const current = pending ? null : result;
  const error = current && !current.ok ? current.error : null;
  const previous = (error !== null || pending) && lastGood !== "" && rightEdit === null;
  const position = error?.position;
  const empty = input.trim() === "";
  const compareInvalid = comparison !== null && comparison.invalid;
  const sortLabel =
    sort === "off" ? t("json.sortOff") : sort === "asc" ? t("json.sortAsc") : t("json.sortDesc");

  return (
    <ToolShell
      tool={tool}
      guide={getGuide("vi", tool.id)}
      notice={
        error || cleared !== null || lossy.length > 0 || pending || compareInvalid ? (
          <div className="space-y-2">
            {error ? (
              <ErrorBanner
                title={error.message}
                detail={error.detail}
                locationLabel={
                  position
                    ? t("json.location", { line: position.line, column: position.column })
                    : undefined
                }
                onJump={
                  position ? () => editor.current?.goTo(position.line, position.column) : undefined
                }
              />
            ) : null}
            {pending ? <Notice tone="info">{t("json.largeNotice")}</Notice> : null}
            {compareInvalid ? <Notice tone="warning">{t("json.diffInvalid")}</Notice> : null}
            {lossy.length > 0 ? (
              <Notice tone="warning">
                {t("json.lossyNumber", { numbers: lossy.slice(0, 3).join(", ") })}
              </Notice>
            ) : null}
            {cleared !== null ? (
              <UndoBar
                message={t("undo.cleared")}
                onUndo={undo}
                onExpire={() => setCleared(null)}
              />
            ) : null}
          </div>
        ) : null
      }
      status={
        <>
          {current ? (
            <StatusBadge tone={current.ok ? "success" : "danger"}>
              {current.ok ? t("status.valid") : t("status.invalid")}
            </StatusBadge>
          ) : null}
          {comparison && !comparison.invalid ? (
            <StatusBadge tone={diffCount === 0 ? "success" : "warning"}>
              {diffCount === 0 ? t("json.diffNone") : t("json.diffCount", { count: diffCount })}
            </StatusBadge>
          ) : null}
          <span className="tabular-nums">
            {t("common.chars", { count: formatNumber(input.length) })}
          </span>
        </>
      }
    >
      <SplitWorkspace
        actions={
          <>
            <IconButton
              variant="primary"
              label={t("json.format")}
              aria-pressed={mode === "format"}
              icon={<AlignLeft aria-hidden className={ICON} />}
              onClick={() => run("format")}
              disabled={empty}
            />
            <IconButton
              label={t("json.minify")}
              aria-pressed={mode === "minify"}
              icon={<Shrink aria-hidden className={ICON} />}
              onClick={() => run("minify")}
              disabled={empty}
            />
            <Segmented<"2" | "4">
              label={t("json.indent")}
              iconOnly
              value={String(indent) as "2" | "4"}
              onChange={(value) => {
                setIndent(Number(value) as JsonIndent);
                setManual(input);
                setRightEdit(null);
              }}
              options={[
                { value: "2", label: t("json.indent2"), icon: <span aria-hidden>{"2"}</span> },
                { value: "4", label: t("json.indent4"), icon: <span aria-hidden>{"4"}</span> },
              ]}
            />
            <IconButton
              label={sortLabel}
              aria-pressed={sort !== "off"}
              icon={
                sort === "asc" ? (
                  <ArrowDownAZ aria-hidden className={ICON} />
                ) : sort === "desc" ? (
                  <ArrowUpZA aria-hidden className={ICON} />
                ) : (
                  <ArrowUpDown aria-hidden className={ICON} />
                )
              }
              onClick={() => {
                setSort(NEXT_SORT[sort]);
                setManual(input);
                setRightEdit(null);
              }}
            />
            <IconButton
              label={t("json.compare")}
              aria-pressed={compare}
              icon={<GitCompare aria-hidden className={ICON} />}
              onClick={() => setCompare(!compare)}
            />
            {compare && diffCount > 0 ? (
              <IconButton
                label={t("json.nextDiff")}
                icon={<ChevronDown aria-hidden className={ICON} />}
                onClick={nextDiff}
              />
            ) : null}
            <IconButton
              label={t("action.sample")}
              icon={<FileText aria-hidden className={ICON} />}
              onClick={() => setInput(t("json.sample"))}
            />
            <IconButton
              label={t("action.clear")}
              icon={<Eraser aria-hidden className={ICON} />}
              onClick={clear}
              disabled={input === ""}
            />
          </>
        }
        left={
          <Panel title={t("json.input")} expandable>
            <CodeEditor
              ref={editor}
              language="json"
              value={input}
              onChange={setInput}
              ariaLabel={t("json.inputLabel")}
              placeholder={t("json.placeholder")}
              highlights={marks?.left}
            />
          </Panel>
        }
        right={
          <Panel
            title={previous ? t("json.outputPrevious") : t("json.output")}
            expandable
            actions={<CopyButton iconOnly text={rightText} disabled={rightText === ""} />}
          >
            <CodeEditor
              ref={rightEditor}
              language="json"
              value={rightText}
              onChange={(text) => {
                if (text !== rightText) setRightEdit(text === lastGood ? null : text);
              }}
              ariaLabel={t("json.outputLabel")}
              placeholder={t("json.outputPlaceholder")}
              highlights={marks?.right}
            />
          </Panel>
        }
      />
    </ToolShell>
  );
}
