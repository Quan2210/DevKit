import { ArrowLeftRight, Eraser, FileText } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Checkbox } from "../../components/common/Checkbox";
import { CopyButton } from "../../components/common/CopyButton";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { IconButton } from "../../components/common/IconButton";
import { Panel } from "../../components/common/Panel";
import { Segmented } from "../../components/common/Segmented";
import { StatusBadge } from "../../components/common/StatusBadge";
import { UndoBar } from "../../components/common/UndoBar";
import { SplitWorkspace } from "../../components/layout/SplitWorkspace";
import { ToolShell } from "../../components/layout/ToolShell";
import { CodeEditor, type CodeEditorHandle } from "../../components/editors/CodeEditor";
import { useDebounced } from "../../hooks/useDebounced";
import { useHotkeys } from "../../hooks/useHotkeys";
import { getGuide } from "../../i18n";
import { formatNumber } from "../../i18n/format";
import { useT } from "../../i18n/useT";
import { getTool } from "../../registry/tools.meta";
import { convert, type Base64Mode } from "./core/convert";

export function Base64Tool() {
  const t = useT();
  const tool = getTool("base64");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Base64Mode>("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [cleared, setCleared] = useState<string | null>(null);
  const [kept, setKept] = useState({ value: "", mode: "encode" as Base64Mode, urlSafe: false });
  const editor = useRef<CodeEditorHandle>(null);
  const debounced = useDebounced(input, 200);
  const source = input === "" ? "" : debounced;

  const result = useMemo(() => convert(source, mode, urlSafe), [source, mode, urlSafe]);
  if (
    result.ok &&
    (result.value !== kept.value || kept.mode !== mode || kept.urlSafe !== urlSafe)
  ) {
    setKept({ value: result.value, mode, urlSafe });
  }
  // Output from another mode or alphabet is a different kind of text (QA BUG-2), so it is never shown.
  const lastGood = kept.mode === mode && kept.urlSafe === urlSafe ? kept.value : "";

  const encoding = mode === "encode";
  const inputTitle = encoding ? t("base64.text") : t("base64.base64");
  const outputTitle = encoding ? t("base64.base64") : t("base64.text");
  const error = !result.ok && source !== "" ? result.error : null;
  const position = error?.position;

  // Uses the current input, not the debounced one: pasting then pressing Ctrl+Enter must never wipe the paste.
  const swap = () => {
    if (input === "") return;
    const current = convert(input, mode, urlSafe);
    if (!current.ok) return;
    setInput(current.value);
    setMode(encoding ? "decode" : "encode");
  };
  const clear = () => {
    if (input === "") return;
    setCleared(input);
    setInput("");
    setKept({ value: "", mode, urlSafe });
  };

  // Ctrl/Cmd+Enter has nothing to run here (conversion is live); swap is the primary action instead.
  useHotkeys([{ key: "Enter", mod: true, allowInInput: true, handler: swap }]);

  return (
    <ToolShell
      tool={tool}
      guide={getGuide("vi", tool.id)}
      notice={
        error || cleared !== null ? (
          <div className="space-y-2">
            {error ? (
              <ErrorBanner
                title={t("base64.invalid")}
                detail={error.message}
                locationLabel={
                  position
                    ? t("base64.location", { line: position.line, column: position.column })
                    : undefined
                }
                onJump={
                  position ? () => editor.current?.goTo(position.line, position.column) : undefined
                }
              />
            ) : null}
            {cleared !== null ? (
              <UndoBar
                message={t("undo.cleared")}
                onUndo={() => {
                  setInput(cleared);
                  setCleared(null);
                }}
                onExpire={() => setCleared(null)}
              />
            ) : null}
          </div>
        ) : null
      }
      status={
        <>
          {source !== "" && !encoding ? (
            <StatusBadge tone={result.ok ? "success" : "danger"}>
              {result.ok ? t("status.valid") : t("status.invalid")}
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
            <Segmented<Base64Mode>
              label={t("common.mode")}
              iconOnly
              value={mode}
              onChange={setMode}
              options={[
                {
                  value: "encode",
                  label: t("base64.encode"),
                  icon: <span aria-hidden>{"Aa"}</span>,
                },
                {
                  value: "decode",
                  label: t("base64.decode"),
                  icon: <span aria-hidden>{"64"}</span>,
                },
              ]}
            />
            <Checkbox
              label={t("base64.urlSafe")}
              shortLabel="URL"
              checked={urlSafe}
              onChange={(e) => setUrlSafe(e.target.checked)}
            />
            <IconButton
              variant="primary"
              label={t("action.swap")}
              icon={<ArrowLeftRight aria-hidden className="size-4" />}
              onClick={swap}
              disabled={!result.ok || lastGood === ""}
            />
            <IconButton
              label={t("action.sample")}
              icon={<FileText aria-hidden className="size-4" />}
              onClick={() => setInput(t(encoding ? "base64.sampleEncode" : "base64.sampleDecode"))}
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
          <Panel title={inputTitle} expandable>
            <CodeEditor
              ref={editor}
              language="text"
              value={input}
              onChange={setInput}
              ariaLabel={t("base64.inputLabel")}
              placeholder={t(encoding ? "base64.placeholderEncode" : "base64.placeholderDecode")}
            />
          </Panel>
        }
        right={
          <Panel
            title={
              error && lastGood !== "" ? t("common.previous", { title: outputTitle }) : outputTitle
            }
            expandable
            actions={<CopyButton iconOnly text={lastGood} disabled={lastGood === ""} />}
          >
            <CodeEditor
              language="text"
              readOnly
              value={lastGood}
              ariaLabel={t("base64.outputLabel")}
              placeholder={t("base64.outputPlaceholder")}
            />
          </Panel>
        }
      />
    </ToolShell>
  );
}
