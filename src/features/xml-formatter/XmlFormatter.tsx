import { useMemo, useRef, useState } from "react";
import { CodeEditor, type CodeEditorHandle } from "../../components/editors/CodeEditor";
import { Button } from "../../components/common/Button";
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
      toolbar={
        <>
          <Button
            variant="primary"
            aria-pressed={mode === "format"}
            onClick={() => run("format")}
            disabled={input.trim() === ""}
          >
            {t("xml.format")}
          </Button>
          <Button
            aria-pressed={mode === "minify"}
            onClick={() => run("minify")}
            disabled={input.trim() === ""}
          >
            {t("xml.minify")}
          </Button>
          <Segmented<"2" | "4">
            label={t("xml.indent")}
            value={String(indent) as "2" | "4"}
            onChange={(value) => {
              setIndent(Number(value) as XmlIndent);
              setManual(input);
            }}
            options={[
              { value: "2", label: t("xml.indent2") },
              { value: "4", label: t("xml.indent4") },
            ]}
          />
          <Button variant="ghost" onClick={() => setInput(t("xml.sample"))}>
            {t("action.sample")}
          </Button>
          <Button variant="ghost" onClick={clear} disabled={input === ""}>
            {t("action.clear")}
          </Button>
        </>
      }
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
        left={
          <Panel title={t("xml.input")}>
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
            actions={
              <>
                <Button
                  variant="ghost"
                  disabled={lastGood === "" || previous}
                  onClick={() =>
                    downloadText("document.xml", lastGood, "application/xml;charset=utf-8")
                  }
                >
                  {t("xml.download")}
                </Button>
                <CopyButton text={lastGood} disabled={lastGood === ""} />
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
