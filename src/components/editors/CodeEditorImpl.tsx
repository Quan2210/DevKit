import {
  EditorSelection,
  EditorState,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import { Decoration, EditorView, placeholder as placeholderExt } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import { syntaxHighlighting } from "@codemirror/language";
import { redo, undo } from "@codemirror/commands";
import { basicSetup } from "codemirror";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import type { CodeEditorHandle, CodeEditorLanguage, CodeEditorProps, LineHighlight } from "./types";

const MAX_SEARCH_MATCHES = 5000;

const setHighlights = StateEffect.define<ReadonlyArray<LineHighlight>>();

/** Whole-line tints; they follow edits until the owner recomputes them. */
const highlightField = StateField.define({
  create: () => Decoration.none,
  update(decorations, tr) {
    let next = decorations.map(tr.changes);
    for (const effect of tr.effects) {
      if (!effect.is(setHighlights)) continue;
      const doc = tr.state.doc;
      const marks = effect.value
        .filter((mark) => mark.line >= 1 && mark.line <= doc.lines)
        .sort((a, b) => a.line - b.line)
        .map((mark) =>
          Decoration.line({ class: `cm-diff-${mark.kind}` }).range(doc.line(mark.line).from),
        );
      next = Decoration.set(marks, true);
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

interface FindState {
  term: string;
  /** Case-insensitive matches as [from, to] offsets, in document order. */
  matches: ReadonlyArray<readonly [number, number]>;
  /** The match the search is on. */
  index: number;
}

const setFind = StateEffect.define<{ term: string; index: number }>();

function findMatches(text: string, term: string): Array<[number, number]> {
  const matches: Array<[number, number]> = [];
  if (term === "") return matches;
  const haystack = text.toLowerCase();
  const needle = term.toLowerCase();
  for (
    let at = haystack.indexOf(needle);
    at !== -1 && matches.length < MAX_SEARCH_MATCHES;
    at = haystack.indexOf(needle, at + needle.length)
  ) {
    matches.push([at, at + needle.length]);
  }
  return matches;
}

/**
 * The editor's own find: tints every match and the current one. CodeMirror's search package opens its
 * built-in panel whenever it moves to a match, which the pane's search bar replaces.
 */
const findField = StateField.define<FindState>({
  create: () => ({ term: "", matches: [], index: 0 }),
  update(value, tr) {
    for (const effect of tr.effects) {
      if (!effect.is(setFind)) continue;
      const matches = findMatches(tr.state.doc.toString(), effect.value.term);
      return { term: effect.value.term, matches, index: effect.value.index };
    }
    if (tr.docChanged && value.term !== "") {
      const matches = findMatches(tr.state.doc.toString(), value.term);
      return { ...value, matches, index: Math.min(value.index, Math.max(matches.length - 1, 0)) };
    }
    return value;
  },
  provide: (field) =>
    EditorView.decorations.from(field, (state) =>
      Decoration.set(
        state.matches.map(([from, to], index) =>
          Decoration.mark({
            class: index === state.index ? "cm-find-current" : "cm-find-match",
          }).range(from, to),
        ),
      ),
    ),
});

function selectMatch(view: EditorView, index: number) {
  const match = view.state.field(findField).matches[index];
  if (!match) return;
  view.dispatch({
    effects: setFind.of({ term: view.state.field(findField).term, index }),
    selection: EditorSelection.range(match[0], match[1]),
    scrollIntoView: true,
  });
}

function stepMatch(view: EditorView | null, delta: 1 | -1) {
  if (!view) return;
  const { matches, index } = view.state.field(findField);
  if (matches.length > 0) selectMatch(view, (index + delta + matches.length) % matches.length);
}

async function loadLanguage(language: CodeEditorLanguage): Promise<Extension> {
  switch (language) {
    case "json":
      return (await import("@codemirror/lang-json")).json();
    case "xml":
      return (await import("@codemirror/lang-xml")).xml();
    case "markdown":
      return (await import("@codemirror/lang-markdown")).markdown();
    case "css":
      return (await import("@codemirror/lang-css")).css();
    case "text":
      return [];
  }
}

// Colours come from the design tokens, so the editor follows light/dark with no extra wiring.
const tokenTheme = EditorView.theme({
  "&": { color: "var(--color-text)", backgroundColor: "var(--color-surface)", height: "100%" },
  "&.cm-focused": { outline: "2px solid var(--color-primary)", outlineOffset: "-2px" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", fontSize: "13.5px", lineHeight: "1.6" },
  ".cm-gutters": {
    backgroundColor: "var(--color-surface-muted)",
    color: "var(--color-text-muted)",
    border: "none",
  },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-cursor": { borderLeftColor: "var(--color-text)" },
  // CodeMirror's default placeholder grey fails AA on the surface colour.
  ".cm-placeholder": { color: "var(--color-text-muted)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "color-mix(in srgb, var(--color-primary) 25%, transparent)",
  },
  ".tok-keyword, .tok-operator": { color: "var(--color-primary)" },
  ".tok-string, .tok-string2": { color: "var(--color-success-fg)" },
  ".tok-number, .tok-bool, .tok-atom": { color: "var(--color-warning-fg)" },
  ".tok-propertyName, .tok-attributeName": { color: "var(--color-info-fg)" },
  ".tok-comment": { color: "var(--color-text-muted)", fontStyle: "italic" },
  ".tok-heading": { fontWeight: "600" },
  ".cm-find-match": {
    backgroundColor: "color-mix(in srgb, var(--color-warning) 30%, transparent)",
    borderRadius: "2px",
  },
  ".cm-find-current": {
    backgroundColor: "color-mix(in srgb, var(--color-warning) 60%, transparent)",
    outline: "1px solid var(--color-warning)",
    borderRadius: "2px",
  },
  ".cm-diff-added": {
    backgroundColor: "color-mix(in srgb, var(--color-success) 22%, transparent)",
  },
  ".cm-diff-removed": {
    backgroundColor: "color-mix(in srgb, var(--color-danger) 22%, transparent)",
  },
  ".cm-diff-changed": {
    backgroundColor: "color-mix(in srgb, var(--color-warning) 26%, transparent)",
  },
});

export default function CodeEditorImpl({
  value,
  onChange,
  language,
  readOnly = false,
  ariaLabel,
  placeholder,
  highlights,
  onCursor,
  handleRef,
}: CodeEditorProps & { handleRef?: Ref<CodeEditorHandle> }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onCursorRef = useRef(onCursor);

  const latestValue = useRef(value);
  const latestHighlights = useRef(highlights);

  useEffect(() => {
    onChangeRef.current = onChange;
    onCursorRef.current = onCursor;
    latestValue.current = value;
    latestHighlights.current = highlights;
  });

  useImperativeHandle(handleRef, () => ({
    focus: () => view.current?.focus(),
    undo: () => {
      if (view.current) undo(view.current);
    },
    redo: () => {
      if (view.current) redo(view.current);
    },
    goTo: (line, column) => {
      const current = view.current;
      if (!current) return;
      const doc = current.state.doc;
      const target = doc.line(Math.min(Math.max(line, 1), doc.lines));
      const pos = Math.min(target.from + Math.max(column - 1, 0), target.to);
      current.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
      current.focus();
    },
    select: (offset) => {
      const current = view.current;
      if (!current) return;
      const pos = Math.min(Math.max(offset, 0), current.state.doc.length);
      current.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
      current.focus();
    },
    search: (term) => {
      const current = view.current;
      if (!current) return 0;
      current.dispatch({ effects: setFind.of({ term, index: 0 }) });
      const { matches } = current.state.field(findField);
      if (matches.length > 0) selectMatch(current, 0);
      return matches.length;
    },
    findNext: () => stepMatch(view.current, 1),
    findPrev: () => stepMatch(view.current, -1),
    clearSearch: () => {
      view.current?.dispatch({ effects: setFind.of({ term: "", index: 0 }) });
    },
  }));

  // Create the editor once per language/readOnly/placeholder; content is synced by the next effect.
  useEffect(() => {
    let cancelled = false;
    let created: EditorView | null = null;
    void loadLanguage(language).then((languageExt) => {
      if (cancelled || !host.current) return;
      created = new EditorView({
        parent: host.current,
        state: EditorState.create({
          doc: latestValue.current, // not `value`: it may have changed while the language chunk loaded
          extensions: [
            basicSetup,
            languageExt,
            syntaxHighlighting(classHighlighter),
            tokenTheme,
            highlightField,
            findField,
            EditorView.lineWrapping,
            EditorState.readOnly.of(readOnly),
            EditorView.editable.of(!readOnly),
            EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
            ...(placeholder ? [placeholderExt(placeholder)] : []),
            EditorView.updateListener.of((update) => {
              if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
              if (update.docChanged || update.selectionSet) {
                onCursorRef.current?.(update.state.selection.main.head);
              }
            }),
          ],
        }),
      });
      view.current = created;
      if (latestHighlights.current?.length) {
        created.dispatch({ effects: setHighlights.of(latestHighlights.current) });
      }
    });
    return () => {
      cancelled = true;
      created?.destroy();
      view.current = null;
    };
    // `value` is intentionally omitted: later changes go through the sync effect below.
  }, [language, readOnly, ariaLabel, placeholder]);

  useEffect(() => {
    const current = view.current;
    if (current && current.state.doc.toString() !== value) {
      current.dispatch({ changes: { from: 0, to: current.state.doc.length, insert: value } });
    }
  }, [value]);

  // Declared after the value sync effect so a same-render change lands on the new document.
  useEffect(() => {
    view.current?.dispatch({ effects: setHighlights.of(highlights ?? []) });
  }, [highlights]);

  return <div ref={host} className="h-full min-h-48" />;
}
