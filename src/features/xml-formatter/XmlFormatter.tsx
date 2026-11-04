import { useMemo, useRef, useState } from "react";
import { CodeEditor, type CodeEditorHandle } from "../../components/editors/CodeEditor";
import { AlignLeft, Download, Eraser, FileText, Shrink } from "lucide-react";
import { IconButton } from "../../components/common/IconButton";
import { CopyButton } from "../../components/common/CopyButton";
import { ErrorBanner } from "../../components/common/ErrorBanner";
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
import { downloadText } from "../../lib/io/download";
import {
  browserParser,
  declaredEncoding,
  formatXml,
  isUtf8,
  minifyXml,
  type XmlIndent,
} from "./core/xml";

/** Above this size the result only updates when the user presses a button (docs/04 §7.1). */
const AUTO_LIMIT = 200_000;

type Mode = "format" | "minify";

export function XmlFormatter() {
  const t = useT();
  const tool = getTool("xml");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("format");
  const [indent, setIndent] = useState<XmlIndent>(2);
  const [manual, setManual] = useState<string | null>(null);
  const [cleared, setCleared] = useState<string | null>(null);
  const [lastGood, setLastGood] = useState("");
  const editor = useRef<CodeEditorHandle>(null);
  const debounced = useDebounced(input, 250);

  // A button press applies the current text at once; otherwise small inputs follow typing after a pause.
  const source = manual === input ? input : input.length <= AUTO_LIMIT ? debounced : (manual ?? "");
  const blank = source.trim() === "";
  // Large inputs only update on a button press, so after an edit the shown result is out of date.
  const pending = input.length > AUTO_LIMIT && manual !== input;

  const result = useMemo(() => {
    if (blank || typeof DOMParser === "undefined") return null;
    const parser = browserParser();
    return mode === "format" ? formatXml(source, indent, parser) : minifyXml(source, parser);
  }, [blank, source, mode, indent]);

  // Keep the last valid output while the input is broken; drop it when the input is emptied.
  if (result?.ok && result.value !== lastGood) setLastGood(result.value);
  if (blank && lastGood !== "") setLastGood("");

  const run = (next: Mode) => {
    setMode(next);
    setManual(input);
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

  useHotkeys([{ key: "Enter", mod: true, allowInInput: true, handler: () => run(mode) }]);

  const current = pending ? null : result;
  const error = current && !current.ok ? current.error : null;
  const previous = (error !== null || pending) && lastGood !== "";
  const encoding = blank ? undefined : declaredEncoding(source);
  const otherEncoding = encoding !== undefined && !isUtf8(encoding) ? encoding : undefined;
  const position = error?.position;

  return (
    <ToolShell
      tool={tool}
      guide={getGuide("vi", tool.id)}
      notice={
        error || cleared !== null || pending || otherEncoding ? (
          <div className="space-y-2">
            {error ? (
              <ErrorBanner
                title={error.message}
                detail={error.detail}
                locationLabel={
                  position
                    ? t("xml.location", { line: position.line, column: position.column })
                    : undefined
                }
                onJump={
                  position ? () => editor.current?.goTo(position.line, position.column) : undefined
                }
              />
            ) : null}
            {pending ? <Notice tone="info">{t("xml.largeNotice")}</Notice> : null}
            {otherEncoding ? (
              <Notice tone="warning">{t("xml.encodingNotice", { encoding: otherEncoding })}</Notice>
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
            <StatusBadge
              tone={
                current.ok ? "success" : current.error.kind === "unexpected" ? "warning" : "danger"
              }
            >
              {current.ok
                ? t("status.valid")
                : current.error.kind === "unexpected"
                  ? t("xml.notFormatted")
                  : t("status.invalid")}
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
              label={t("xml.format")}
              aria-pressed={mode === "format"}
              icon={<AlignLeft aria-hidden className="size-4" />}
              onClick={() => run("format")}
              disabled={input.trim() === ""}
            />
            <IconButton
              label={t("xml.minify")}
              aria-pressed={mode === "minify"}
              icon={<Shrink aria-hidden className="size-4" />}
              onClick={() => run("minify")}
              disabled={input.trim() === ""}
            />
            <Segmented<"2" | "4">
              label={t("xml.indent")}
              iconOnly
              value={String(indent) as "2" | "4"}
              onChange={(value) => {
                setIndent(Number(value) as XmlIndent);
                setManual(input);
              }}
              options={[
                { value: "2", label: t("xml.indent2"), icon: <span aria-hidden>{"2"}</span> },
                { value: "4", label: t("xml.indent4"), icon: <span aria-hidden>{"4"}</span> },
              ]}
            />
            <IconButton
              label={t("action.sample")}
              icon={<FileText aria-hidden className="size-4" />}
              onClick={() => setInput(t("xml.sample"))}
            />
            <IconButton
              label={t("action.clear")}
              icon={<Eraser aria-hidden className="size-4" />}
              onClick={clear}
              disabled={input === ""}
            />
          </>
        }
        left={
          <Panel title={t("xml.input")} expandable>
            <CodeEditor
              ref={editor}
              language="xml"
              value={input}
              onChange={setInput}
              ariaLabel={t("xml.inputLabel")}
              placeholder={t("xml.placeholder")}
            />
          </Panel>
        }
        right={
          <Panel
            title={previous ? t("xml.outputPrevious") : t("xml.output")}
            expandable
            actions={
              <>
                <IconButton
                  label={t("xml.download")}
                  icon={<Download aria-hidden className="size-4" />}
                  disabled={lastGood === "" || previous}
                  onClick={() =>
                    downloadText("document.xml", lastGood, "application/xml;charset=utf-8")
                  }
                />
                <CopyButton iconOnly text={lastGood} disabled={lastGood === ""} />
              </>
            }
          >
            <CodeEditor
              language="xml"
              readOnly
              value={lastGood}
              ariaLabel={t("xml.outputLabel")}
              placeholder={t("xml.outputPlaceholder")}
            />
          </Panel>
        }
      />
    </ToolShell>
  );
}
