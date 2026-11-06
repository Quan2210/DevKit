import { ChangeSet, EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import { syntaxHighlighting } from "@codemirror/language";
import {
  getChunks,
  getOriginalDoc,
  goToNextChunk,
  goToPreviousChunk,
  MergeView,
  originalDocChangeEffect,
  unifiedMergeView,
  type Chunk,
} from "@codemirror/merge";
import { basicSetup } from "codemirror";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { diffConfigFor, summarize } from "../../features/text-compare/core/diff";
import { tokenTheme } from "./CodeEditorImpl";
import type { DiffEditorHandle, DiffEditorProps, DiffReport } from "./diffTypes";

/** Diff colours come from the design tokens, like the rest of the editor theme. */
const diffTheme = EditorView.theme({
  // The merge view grows with its content; the wrapper around it scrolls.
  "&.cm-merge-a .cm-changedLine, &.cm-merge-a .cm-deletedLine": {
    backgroundColor: "color-mix(in srgb, var(--color-danger) 16%, transparent)",
  },
  "&.cm-merge-b .cm-changedLine, &.cm-merge-b .cm-insertedLine": {
    backgroundColor: "color-mix(in srgb, var(--color-success) 16%, transparent)",
  },
  ".cm-deletedChunk": {
    backgroundColor: "color-mix(in srgb, var(--color-danger) 16%, transparent)",
  },
  // Stronger tint on the characters that differ; the text is also marked so colour is not the only cue.
  "&.cm-merge-a .cm-changedText, .cm-deletedChunk .cm-deletedText": {
    background: "color-mix(in srgb, var(--color-danger) 30%, transparent)",
    textDecoration: "line-through",
  },
  "&.cm-merge-b .cm-changedText": {
    background: "color-mix(in srgb, var(--color-success) 30%, transparent)",
    textDecoration: "underline",
  },
  "&.cm-merge-b .cm-deletedText": {
    background: "color-mix(in srgb, var(--color-danger) 30%, transparent)",
    textDecoration: "line-through",
  },
  ".cm-collapsedLines": {
    color: "var(--color-text-muted)",
    background: "var(--color-surface-muted)",
    borderBlock: "1px solid var(--color-border)",
  },
  ".cm-changedLineGutter, .cm-inlineChangedLineGutter": { background: "var(--color-warning)" },
  "&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter": {
    background: "var(--color-danger)",
  },
  "&.cm-merge-b .cm-changedLineGutter": { background: "var(--color-success)" },
});

const sameReport = (a: DiffReport | null, b: DiffReport) =>
  a !== null &&
  a.precise === b.precise &&
  a.total === b.total &&
  a.added === b.added &&
  a.removed === b.removed &&
  a.changed === b.changed;

export default function DiffEditorImpl({
  original,
  modified,
  onChange,
  view: viewKind,
  options,
  collapseUnchanged,
  wrap,
  labels,
  onSummary,
  handleRef,
}: DiffEditorProps & { handleRef?: Ref<DiffEditorHandle> }) {
  const host = useRef<HTMLDivElement>(null);
  const merge = useRef<MergeView | null>(null);
  const single = useRef<EditorView | null>(null);

  const latest = useRef({ original, modified, onChange, onSummary });
  useEffect(() => {
    latest.current = { original, modified, onChange, onSummary };
  });

  useImperativeHandle(handleRef, () => ({
    next: () => step(merge.current, single.current, goToNextChunk),
    prev: () => step(merge.current, single.current, goToPreviousChunk),
    focus: () => (merge.current?.b ?? single.current)?.focus(),
  }));

  // The views are rebuilt when the way of showing or comparing changes; text edits flow through the
  // sync effect below. (Rebuilding resets the undo history, which only happens on a deliberate toggle.)
  const { ignoreCase, ignoreWhitespace, precision } = options;
  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    const diffConfig = diffConfigFor({ ignoreCase, ignoreWhitespace, precision });
    const collapse = collapseUnchanged ? { margin: 2, minSize: 4 } : undefined;
    let last: DiffReport | null = null;
    let disposed = false;

    const emit = () => {
      if (disposed) return;
      const chunks: readonly Chunk[] | null = merge.current
        ? merge.current.chunks
        : single.current
          ? (getChunks(single.current.state)?.chunks ?? null)
          : null;
      if (!chunks) return;
      const { original: a, modified: b } = latest.current;
      const report: DiffReport = {
        ...summarize(chunks, a, b),
        precise: chunks.every((chunk) => chunk.precise),
      };
      if (sameReport(last, report)) return;
      last = report;
      latest.current.onSummary?.(report);
    };

    const common = (label: string, side: "original" | "modified"): Extension[] => [
      basicSetup,
      syntaxHighlighting(classHighlighter),
      tokenTheme,
      diffTheme,
      wrap ? EditorView.lineWrapping : [],
      EditorView.contentAttributes.of({ "aria-label": label }),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        latest.current.onChange(side, update.state.doc.toString());
        queueMicrotask(emit);
      }),
    ];

    if (viewKind === "split") {
      merge.current = new MergeView({
        parent,
        a: { doc: latest.current.original, extensions: common(labels.original, "original") },
        b: { doc: latest.current.modified, extensions: common(labels.modified, "modified") },
        gutter: true,
        highlightChanges: true,
        collapseUnchanged: collapse,
        diffConfig,
      });
    } else {
      single.current = new EditorView({
        parent,
        state: EditorState.create({
          doc: latest.current.modified,
          extensions: [
            ...common(labels.modified, "modified"),
            unifiedMergeView({
              original: latest.current.original,
              gutter: true,
              highlightChanges: true,
              mergeControls: false,
              collapseUnchanged: collapse,
              diffConfig,
            }),
          ],
        }),
      });
    }
    queueMicrotask(emit);

    return () => {
      disposed = true;
      merge.current?.destroy();
      single.current?.destroy();
      merge.current = null;
      single.current = null;
    };
  }, [
    viewKind,
    ignoreCase,
    ignoreWhitespace,
    precision,
    collapseUnchanged,
    wrap,
    labels.original,
    labels.modified,
  ]);

  // Text changed from outside (swap, sample, open a file): put it into the editors.
  useEffect(() => {
    const replace = (view: EditorView, text: string) => {
      if (view.state.doc.toString() === text) return;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    };
    if (merge.current) {
      replace(merge.current.a, original);
      replace(merge.current.b, modified);
    } else if (single.current) {
      const view = single.current;
      replace(view, modified);
      const current = getOriginalDoc(view.state);
      if (current.toString() !== original) {
        const changes = ChangeSet.of(
          { from: 0, to: current.length, insert: original },
          current.length,
        );
        view.dispatch({ effects: originalDocChangeEffect(view.state, changes) });
      }
    }
  }, [original, modified]);

  return (
    <div
      ref={host}
      className={
        viewKind === "split"
          ? "h-full min-h-48 overflow-auto [&_.cm-mergeView]:min-h-full"
          : "h-full min-h-48"
      }
    />
  );
}

function step(
  merge: MergeView | null,
  single: EditorView | null,
  command: typeof goToNextChunk,
): void {
  const view = merge?.b ?? single;
  if (!view) return;
  if (command({ state: view.state, dispatch: (tr) => view.dispatch(tr) })) view.focus();
}
