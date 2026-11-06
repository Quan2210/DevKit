import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUp,
  Copy,
  Eraser,
  FileText,
  FileUp,
  GitCompareArrows,
  Redo2,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/common/Button";
import { Checkbox } from "../../components/common/Checkbox";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { IconButton } from "../../components/common/IconButton";
import { MenuButton } from "../../components/common/MenuButton";
import { Notice } from "../../components/common/Notice";
import { Panel } from "../../components/common/Panel";
import { Segmented } from "../../components/common/Segmented";
import { StatusBadge } from "../../components/common/StatusBadge";
import { CodeEditor, type CodeEditorHandle } from "../../components/editors/CodeEditor";
import {
  DiffEditor,
  type DiffEditorHandle,
  type DiffReport,
  type DiffView,
} from "../../components/editors/DiffEditor";
import { SplitAction, SplitButton, SplitWorkspace } from "../../components/layout/SplitWorkspace";
import { ToolShell } from "../../components/layout/ToolShell";
import { useHotkeys } from "../../hooks/useHotkeys";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { getGuide } from "../../i18n";
import { formatNumber } from "../../i18n/format";
import { useT } from "../../i18n/useT";
import { copyText } from "../../lib/io/clipboard";
import { readTextFile } from "../../lib/io/readText";
import { getTool } from "../../registry/tools.meta";
import { DEFAULT_OPTIONS, normalizeEol, type DiffOptions, type Precision } from "./core/diff";

const ICON = "size-4";
const MAX_FILE_BYTES = 25 * 1024 * 1024;

type Side = "original" | "modified";

interface InputPaneProps {
  side: Side;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onError: (message: string | null) => void;
}

/** One side of the input step: editor, per-side tools and file drop. */
function InputPane({ side, title, value, onChange, onError }: InputPaneProps) {
  const t = useT();
  const editor = useRef<CodeEditorHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    const result = await readTextFile(file, MAX_FILE_BYTES);
    if (!result.ok) {
      onError(result.error.message);
      return;
    }
    onError(null);
    onChange(normalizeEol(result.value));
  };
  const hasFiles = (event: React.DragEvent) => event.dataTransfer.types.includes("Files");

  return (
    <Panel
      title={title}
      expandable
      toolbar={
        <>
          <input
            ref={fileInput}
            type="file"
            hidden
            aria-label={t("textCompare.open", { side: title })}
            onChange={(event) => {
              void openFile(event.target.files?.[0]);
              event.target.value = ""; // allow opening the same file again
            }}
          />
          <IconButton
            label={t("textCompare.open", { side: title })}
            icon={<FileUp aria-hidden className={ICON} />}
            onClick={() => fileInput.current?.click()}
          />
          <IconButton
            label={t("action.clear")}
            icon={<Eraser aria-hidden className={ICON} />}
            onClick={() => onChange("")}
            disabled={value === ""}
          />
          <IconButton
            label={`${t("pane.undo")} · ${title}`}
            icon={<Undo2 aria-hidden className={ICON} />}
            onClick={() => editor.current?.undo()}
          />
          <IconButton
            label={`${t("pane.redo")} · ${title}`}
            icon={<Redo2 aria-hidden className={ICON} />}
            onClick={() => editor.current?.redo()}
          />
        </>
      }
    >
      <div
        className="relative h-full"
        data-side={side}
        onDragOver={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          setDragging(false);
          void openFile(event.dataTransfer.files[0]);
        }}
      >
        <CodeEditor
          ref={editor}
          language="text"
          value={value}
          onChange={(next) => onChange(next)}
          ariaLabel={title}
          placeholder={t("textCompare.placeholder")}
        />
        {dragging ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))] text-sm font-medium outline-2 -outline-offset-4 outline-primary outline-dashed">
            {t("file.drop")}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

export function TextCompare() {
  const t = useT();
  const tool = getTool("text-compare");
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [comparing, setComparing] = useState(false);
  const [viewChoice, setViewChoice] = useState<DiffView | null>(null);
  const [options, setOptions] = useState<DiffOptions>(DEFAULT_OPTIONS);
  const [collapse, setCollapse] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [report, setReport] = useState<DiffReport | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const diff = useRef<DiffEditorHandle>(null);
  const region = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const wide = useMediaQuery("(min-width: 1024px)");
  const view: DiffView = viewChoice ?? (wide ? "split" : "unified");

  const startCompare = () => {
    setReport(null);
    setComparing(true);
  };
  const swap = () => {
    setOriginal(modified);
    setModified(original);
  };
  const setOption = <K extends keyof DiffOptions>(key: K, value: DiffOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }));

  // Ctrl/Cmd+Enter compares from the input step (the result step updates by itself).
  useHotkeys([{ key: "Enter", mod: true, allowInInput: true, handler: startCompare }], !comparing);

  // Moving between the two steps puts focus on the new region, not on <body>.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    region.current?.focus();
  }, [comparing]);

  const originalTitle = t("textCompare.original");
  const modifiedTitle = t("textCompare.modified");

  const summary = report ? (
    <div
      role="status"
      aria-label={t("textCompare.summaryLabel")}
      className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-sm"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {original === "" && modified === "" ? (
          <StatusBadge tone="neutral">{t("textCompare.empty")}</StatusBadge>
        ) : report.total === 0 ? (
          <StatusBadge tone="success">{t("textCompare.identical")}</StatusBadge>
        ) : (
          <>
            <StatusBadge tone="info">
              {t("textCompare.differences", { count: formatNumber(report.total) })}
            </StatusBadge>
            <span className="tabular-nums text-text-muted">
              {t("textCompare.breakdown", {
                added: formatNumber(report.added),
                removed: formatNumber(report.removed),
                changed: formatNumber(report.changed),
              })}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <IconButton
          label={t("textCompare.prev")}
          icon={<ArrowUp aria-hidden className={ICON} />}
          onClick={() => diff.current?.prev()}
          disabled={report.total === 0}
        />
        <IconButton
          label={t("textCompare.next")}
          icon={<ArrowDown aria-hidden className={ICON} />}
          onClick={() => diff.current?.next()}
          disabled={report.total === 0}
        />
      </div>
    </div>
  ) : null;

  return (
    <ToolShell
      tool={tool}
      guide={getGuide("vi", tool.id)}
      fill
      notice={
        fileError || (comparing && report && !report.precise) ? (
          <div className="space-y-2">
            {fileError ? <ErrorBanner title={t("file.readFailed")} detail={fileError} /> : null}
            {comparing && report && !report.precise ? (
              <Notice tone="warning">{t("textCompare.rough")}</Notice>
            ) : null}
          </div>
        ) : null
      }
      status={
        <>
          <span className="tabular-nums">
            {`${originalTitle}: ${t("common.chars", { count: formatNumber(original.length) })}`}
          </span>
          <span className="tabular-nums">
            {`${modifiedTitle}: ${t("common.chars", { count: formatNumber(modified.length) })}`}
          </span>
        </>
      }
    >
      <div ref={region} tabIndex={-1} className="h-full outline-none">
        {comparing ? (
          <div className="h-[75dvh] min-h-96 lg:h-full lg:min-h-0 [&>section]:h-full">
            <Panel
              title={t("textCompare.result")}
              expandable
              actions={
                <MenuButton
                  label={t("action.copy")}
                  iconOnly
                  alignEnd
                  icon={<Copy aria-hidden className={ICON} />}
                  items={[
                    {
                      label: t("textCompare.copyOriginal"),
                      onSelect: () => void copyText(original),
                    },
                    {
                      label: t("textCompare.copyModified"),
                      onSelect: () => void copyText(modified),
                    },
                  ]}
                />
              }
              toolbar={
                <>
                  <Button
                    icon={<ArrowLeft aria-hidden className={ICON} />}
                    onClick={() => setComparing(false)}
                  >
                    {t("textCompare.edit")}
                  </Button>
                  <Segmented<DiffView>
                    label={t("textCompare.view")}
                    value={view}
                    onChange={setViewChoice}
                    options={[
                      { value: "split", label: t("textCompare.viewSplit") },
                      { value: "unified", label: t("textCompare.viewUnified") },
                    ]}
                  />
                  <Segmented<Precision>
                    label={t("textCompare.precision")}
                    value={options.precision}
                    onChange={(value) => setOption("precision", value)}
                    options={[
                      { value: "smart", label: t("textCompare.precisionSmart") },
                      { value: "word", label: t("textCompare.precisionWord") },
                      { value: "char", label: t("textCompare.precisionChar") },
                    ]}
                  />
                  <IconButton
                    label={t("textCompare.swap")}
                    icon={<ArrowLeftRight aria-hidden className={ICON} />}
                    onClick={swap}
                  />
                  <Checkbox
                    label={t("textCompare.ignoreWhitespace")}
                    checked={options.ignoreWhitespace}
                    onChange={(event) => setOption("ignoreWhitespace", event.target.checked)}
                  />
                  <Checkbox
                    label={t("textCompare.ignoreCase")}
                    checked={options.ignoreCase}
                    onChange={(event) => setOption("ignoreCase", event.target.checked)}
                  />
                  <Checkbox
                    label={t("textCompare.collapse")}
                    checked={collapse}
                    onChange={(event) => setCollapse(event.target.checked)}
                  />
                  <Checkbox
                    label={t("textCompare.wrap")}
                    checked={wrap}
                    onChange={(event) => setWrap(event.target.checked)}
                  />
                </>
              }
              subbar={summary}
            >
              <DiffEditor
                ref={diff}
                original={original}
                modified={modified}
                onChange={(side, value) =>
                  side === "original" ? setOriginal(value) : setModified(value)
                }
                view={view}
                options={options}
                collapseUnchanged={collapse}
                wrap={wrap}
                labels={{ original: originalTitle, modified: modifiedTitle }}
                onSummary={setReport}
              />
            </Panel>
          </div>
        ) : (
          <SplitWorkspace
            actions={
              <>
                <SplitAction>
                  <SplitButton
                    variant="primary"
                    icon={<GitCompareArrows aria-hidden className={ICON} />}
                    onClick={startCompare}
                  >
                    {t("textCompare.compare")}
                  </SplitButton>
                </SplitAction>
                <SplitAction>
                  <SplitButton
                    icon={<ArrowLeftRight aria-hidden className={ICON} />}
                    onClick={swap}
                    disabled={original === "" && modified === ""}
                  >
                    {t("textCompare.swap")}
                  </SplitButton>
                </SplitAction>
                <SplitAction>
                  <SplitButton
                    icon={<FileText aria-hidden className={ICON} />}
                    onClick={() => {
                      setOriginal(t("textCompare.sampleOriginal"));
                      setModified(t("textCompare.sampleModified"));
                    }}
                  >
                    {t("action.sample")}
                  </SplitButton>
                </SplitAction>
              </>
            }
            left={
              <InputPane
                side="original"
                title={originalTitle}
                value={original}
                onChange={setOriginal}
                onError={setFileError}
              />
            }
            right={
              <InputPane
                side="modified"
                title={modifiedTitle}
                value={modified}
                onChange={setModified}
                onError={setFileError}
              />
            }
          />
        )}
      </div>
    </ToolShell>
  );
}
