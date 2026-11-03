import { FileUp } from "lucide-react";
import { Children, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "../../components/common/Button";
import { Checkbox } from "../../components/common/Checkbox";
import { Dialog } from "../../components/common/Dialog";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { MenuButton } from "../../components/common/MenuButton";
import { Notice } from "../../components/common/Notice";
import { Panel } from "../../components/common/Panel";
import { Segmented } from "../../components/common/Segmented";
import { UndoBar } from "../../components/common/UndoBar";
import { CodeEditor } from "../../components/editors/CodeEditor";
import { ToolShell } from "../../components/layout/ToolShell";
import { useDebounced } from "../../hooks/useDebounced";
import { useIsClient } from "../../hooks/useIsClient";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { parseBoolean, parseString, useStoredValue } from "../../hooks/useStoredValue";
import { getGuide } from "../../i18n";
import { formatNumber } from "../../i18n/format";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";
import { copyText } from "../../lib/io/clipboard";
import { downloadText } from "../../lib/io/download";
import { STORAGE_KEYS } from "../../lib/storage";
import { textStats } from "../../lib/text/stats";
import { getTool } from "../../registry/tools.meta";
import { buildHtmlDocument } from "./core/exportHtml";
import { checkFileSize, decodeMarkdownFile } from "./core/readFile";
import { PreviewPane } from "./PreviewPane";
import { useMarkdownRender } from "./useMarkdownRender";

type View = "edit" | "split" | "preview";

const parseView = (raw: unknown): View | undefined =>
  raw === "edit" || raw === "split" || raw === "preview" ? raw : undefined;

/** A draft above this size is not stored (PRD 3.10 opt-in draft, plan O5). */
const MAX_DRAFT = 1_000_000;
/** Word statistics on very large text would block typing, so only characters are shown above this. */
const STATS_LIMIT = 500_000;
const FILE_ACCEPT = ".md,.markdown,.txt,text/markdown,text/plain";

export function MarkdownPreview() {
  const t = useT();
  const tool = getTool("markdown");
  const client = useIsClient();
  const narrow = useMediaQuery("(max-width: 639px)");

  const [view, setView] = useStoredValue(STORAGE_KEYS.mdView, parseView, "split");
  const [docWidth, setDocWidth] = useStoredValue(STORAGE_KEYS.mdDocWidth, parseBoolean, false);
  const [bannerDismissed, dismissBanner] = useStoredValue(
    STORAGE_KEYS.mdBannerDismissed,
    parseBoolean,
    false,
  );
  const [draftEnabled, setDraftEnabled, removeDraftEnabled] = useStoredValue(
    STORAGE_KEYS.mdDraftEnabled,
    parseBoolean,
    false,
  );
  const [draft, setDraft, removeDraft] = useStoredValue(STORAGE_KEYS.mdDraft, parseString, "");

  // `null` until the user types: then the stored draft (when enabled) is the content.
  const [typed, setTyped] = useState<string | null>(null);
  const input = typed ?? (draftEnabled ? draft : "");
  const [allowExternal, setAllowExternal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleared, setCleared] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const effectiveView: View = narrow && view === "split" ? "edit" : view;
  const showEditor = effectiveView !== "preview";
  const showPreview = effectiveView !== "edit";
  const rendered = useMarkdownRender(input, allowExternal, showPreview);

  const statsSource = useDebounced(input, 300);
  const stats = useMemo(
    () => (statsSource.length <= STATS_LIMIT ? textStats(statsSource) : null),
    [statsSource],
  );
  const draftTooLarge = draftEnabled && input.length > MAX_DRAFT;

  // Opt-in draft: written after a pause, never above the size limit, never when switched off.
  const draftSaver = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveDraft = (text: string) => {
    clearTimeout(draftSaver.current);
    if (!draftEnabled) return;
    if (text.length > MAX_DRAFT) {
      removeDraft(); // an older, shorter draft would otherwise come back on reload and look current
      return;
    }
    draftSaver.current = setTimeout(() => setDraft(text), 500);
  };
  const edit = (text: string) => {
    setTyped(text);
    saveDraft(text);
  };

  const flashMessage = (message: string) => {
    setFlash(message);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1500);
  };
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const toggleDraft = (enabled: boolean) => {
    clearTimeout(draftSaver.current);
    if (enabled) {
      setDraftEnabled(true);
      if (input.length <= MAX_DRAFT) setDraft(input);
    } else {
      setTyped(input); // keep what is on screen, then forget the stored copy
      removeDraft();
      removeDraftEnabled();
    }
  };

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    const size = checkFileSize(file.size);
    if (!size.ok) return setFileError(size.error.message);
    try {
      const decoded = decodeMarkdownFile(await file.arrayBuffer());
      if (!decoded.ok) return setFileError(decoded.error.message);
      setFileError(null);
      edit(decoded.value);
    } catch {
      setFileError(t("markdown.fileReadFailed"));
    }
  };

  const clear = () => {
    if (input === "") return;
    setCleared(input);
    edit("");
  };

  /** Reuses the preview when it is current; otherwise renders off the main thread. Null on failure. */
  const exportHtml = async () => {
    try {
      const result =
        showPreview && !rendered.pending && !rendered.failed
          ? rendered
          : await rendered.renderNow(input, allowExternal);
      return { body: result.html, title: result.headings[0]?.text ?? t("markdown.htmlTitle") };
    } catch {
      flashMessage(t("markdown.exportFailed"));
      return null;
    }
  };

  const viewOptions = [
    { value: "edit" as const, label: t("markdown.modeEdit") },
    ...(narrow ? [] : [{ value: "split" as const, label: t("markdown.modeSplit") }]),
    { value: "preview" as const, label: t("markdown.modePreview") },
  ];

  const toolbar = client ? (
    <>
      <Segmented<View>
        label={t("markdown.modeLabel")}
        value={effectiveView}
        onChange={setView}
        options={viewOptions}
      />
      <Button
        icon={<FileUp aria-hidden className="size-4" />}
        onClick={() => fileInput.current?.click()}
      >
        {t("markdown.open")}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept={FILE_ACCEPT}
        tabIndex={-1}
        className="sr-only"
        aria-label={t("markdown.open")}
        onChange={(event) => {
          void openFile(event.target.files?.[0]);
          event.target.value = ""; // allow opening the same file again
        }}
      />
      <MenuButton
        label={t("markdown.copyMenu")}
        disabled={input === ""}
        items={[
          {
            label: t("markdown.copyMarkdown"),
            onSelect: async () =>
              flashMessage((await copyText(input)) ? t("action.copied") : t("action.copyFailed")),
          },
          {
            label: t("markdown.copyHtml"),
            onSelect: async () => {
              const exported = await exportHtml();
              if (!exported) return;
              flashMessage(
                (await copyText(exported.body)) ? t("action.copied") : t("action.copyFailed"),
              );
            },
          },
        ]}
      />
      <MenuButton
        label={t("markdown.downloadMenu")}
        disabled={input === ""}
        items={[
          {
            label: t("markdown.downloadMd"),
            onSelect: () => downloadText("document.md", input, "text/markdown;charset=utf-8"),
          },
          {
            label: t("markdown.downloadHtml"),
            onSelect: async () => {
              const exported = await exportHtml();
              if (!exported) return;
              downloadText(
                "document.html",
                buildHtmlDocument(exported.body, exported.title),
                "text/html;charset=utf-8",
              );
            },
          },
        ]}
      />
      <Checkbox
        label={t("markdown.externalImages")}
        checked={allowExternal}
        onChange={(event) =>
          event.target.checked ? setConfirmOpen(true) : setAllowExternal(false)
        }
      />
      <Checkbox
        label={t("markdown.docWidth")}
        checked={docWidth}
        onChange={(event) => setDocWidth(event.target.checked)}
      />
      <Checkbox
        label={t("markdown.draft")}
        title={t("markdown.draftHint")}
        checked={draftEnabled}
        onChange={(event) => toggleDraft(event.target.checked)}
      />
      {draftEnabled ? (
        <Button
          variant="ghost"
          onClick={() => {
            clearTimeout(draftSaver.current);
            setTyped(input); // keep what is on screen, forget only the stored copy
            removeDraft();
          }}
        >
          {t("markdown.draftClear")}
        </Button>
      ) : null}
      <Button variant="ghost" onClick={() => edit(t("markdown.sample"))}>
        {t("action.sample")}
      </Button>
      <Button variant="ghost" onClick={clear} disabled={input === ""}>
        {t("action.clear")}
      </Button>
    </>
  ) : null;

  const notice = client ? (
    <div className="space-y-2">
      {!bannerDismissed ? (
        <Notice tone="info">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{t("markdown.banner")}</span>
            <Button variant="ghost" onClick={() => dismissBanner(true)}>
              {t("markdown.bannerClose")}
            </Button>
          </div>
        </Notice>
      ) : null}
      {fileError ? <ErrorBanner title={fileError} /> : null}
      {rendered.failed ? <ErrorBanner title={t("markdown.renderFailed")} /> : null}
      {rendered.droppedHtml && showPreview ? (
        <Notice tone="info">{t("markdown.rawHtmlDropped")}</Notice>
      ) : null}
      {draftEnabled ? <Notice tone="info">{t("markdown.draftHint")}</Notice> : null}
      {draftTooLarge ? <Notice tone="warning">{t("markdown.draftTooLarge")}</Notice> : null}
      {cleared !== null ? (
        <UndoBar
          message={t("undo.cleared")}
          onUndo={() => {
            edit(cleared);
            setCleared(null);
          }}
          onExpire={() => setCleared(null)}
        />
      ) : null}
    </div>
  ) : null;

  const status = client ? (
    <>
      <span className="tabular-nums">
        {t("common.chars", { count: formatNumber(input.length) })}
      </span>
      {stats ? (
        <>
          <span className="tabular-nums">
            {t("markdown.words", { count: formatNumber(stats.words) })}
          </span>
          {stats.readingMinutes > 0 ? (
            <span className="tabular-nums">
              {t("markdown.minutes", { count: stats.readingMinutes })}
            </span>
          ) : null}
        </>
      ) : null}
      {rendered.pending && input !== "" ? (
        <span className="text-text-muted">{t("markdown.updating")}</span>
      ) : null}
      <span role="status" className="sr-only">
        {flash}
      </span>
      {flash ? <span aria-hidden>{flash}</span> : null}
    </>
  ) : null;

  return (
    <ToolShell
      tool={tool}
      guide={getGuide("vi", tool.id)}
      toolbar={toolbar}
      notice={notice}
      status={status}
      externalRequestsEnabled={allowExternal}
    >
      <MarkdownWorkspace
        enabled={client}
        dragging={dragging}
        onDragging={setDragging}
        onDropFile={(file) => void openFile(file)}
        layout={effectiveView}
      >
        {showEditor ? (
          <Panel title={t("markdown.input")}>
            <CodeEditor
              language="markdown"
              value={input}
              onChange={edit}
              ariaLabel={t("markdown.inputLabel")}
              placeholder={t("markdown.placeholder")}
            />
          </Panel>
        ) : null}
        {showPreview ? (
          <Panel
            title={t("markdown.preview")}
            actions={
              <MenuButton
                label={t("markdown.toc")}
                emptyLabel={t("markdown.tocEmpty")}
                items={rendered.headings.map((heading) => ({
                  label: heading.text,
                  indent: heading.depth - 1,
                  onSelect: () =>
                    document.getElementById(heading.id)?.scrollIntoView({ block: "start" }),
                }))}
              />
            }
          >
            <PreviewPane
              html={rendered.html}
              docWidth={docWidth}
              busy={rendered.pending}
              empty={
                <div className="space-y-3 text-text-muted">
                  <p>{t("markdown.previewEmpty")}</p>
                  <Button onClick={() => edit(t("markdown.sample"))}>
                    {t("markdown.insertSample")}
                  </Button>
                </div>
              }
            />
          </Panel>
        ) : null}
      </MarkdownWorkspace>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("markdown.externalTitle")}
        footer={
          <>
            <Button onClick={() => setConfirmOpen(false)}>{t("action.cancel")}</Button>
            <Button
              variant="primary"
              onClick={() => {
                setAllowExternal(true);
                setConfirmOpen(false);
              }}
            >
              {t("markdown.externalConfirm")}
            </Button>
          </>
        }
      >
        <p>{t("markdown.externalBody")}</p>
      </Dialog>
    </ToolShell>
  );
}

interface WorkspaceProps {
  enabled: boolean;
  dragging: boolean;
  onDragging: (dragging: boolean) => void;
  onDropFile: (file: File | undefined) => void;
  layout: View;
  children: ReactNode;
}

/** Workspace grid with file drag-and-drop. Listeners live in an effect so static elements carry no handlers. */
function MarkdownWorkspace({
  enabled,
  dragging,
  onDragging,
  onDropFile,
  layout,
  children,
}: WorkspaceProps) {
  const t = useT();
  const node = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onDragging, onDropFile });

  useEffect(() => {
    callbacks.current = { onDragging, onDropFile };
  });

  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;
    const over = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      callbacks.current.onDragging(true);
    };
    const leave = (event: DragEvent) => {
      if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
      callbacks.current.onDragging(false);
    };
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      callbacks.current.onDragging(false);
      callbacks.current.onDropFile(event.dataTransfer?.files[0]);
    };
    element.addEventListener("dragover", over);
    element.addEventListener("dragleave", leave);
    element.addEventListener("drop", drop);
    return () => {
      element.removeEventListener("dragover", over);
      element.removeEventListener("dragleave", leave);
      element.removeEventListener("drop", drop);
    };
  }, [enabled]);

  if (!enabled) return <div className="h-[60dvh] rounded-lg bg-surface-muted" />;

  return (
    <div
      ref={node}
      className={cn(
        "relative grid gap-4 lg:h-[calc(100dvh-24rem)] lg:min-h-[28rem]",
        layout === "split" && "lg:grid-cols-2",
      )}
    >
      {Children.toArray(children).map((child, index) => (
        <div key={index} className="h-[60dvh] min-h-64 lg:h-auto [&>section]:h-full">
          {child}
        </div>
      ))}
      {dragging ? (
        <div
          data-testid="md-drop-overlay"
          className="absolute inset-0 z-10 grid place-items-center rounded-lg border-2 border-dashed border-primary bg-surface/90 text-lg font-medium"
        >
          {t("markdown.dropHint")}
        </div>
      ) : null}
    </div>
  );
}
