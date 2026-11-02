import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, placeholder as placeholderExt } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import { syntaxHighlighting } from "@codemirror/language";
import { basicSetup } from "codemirror";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import type { CodeEditorHandle, CodeEditorLanguage, CodeEditorProps } from "./types";

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
});

export default function CodeEditorImpl({
  value,
  onChange,
  language,
  readOnly = false,
  ariaLabel,
  placeholder,
  handleRef,
}: CodeEditorProps & { handleRef?: Ref<CodeEditorHandle> }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  const latestValue = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
    latestValue.current = value;
  });

  useImperativeHandle(handleRef, () => ({
    focus: () => view.current?.focus(),
    goTo: (line, column) => {
      const current = view.current;
      if (!current) return;
      const doc = current.state.doc;
      const target = doc.line(Math.min(Math.max(line, 1), doc.lines));
      const pos = Math.min(target.from + Math.max(column - 1, 0), target.to);
      current.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
      current.focus();
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
            EditorView.lineWrapping,
            EditorState.readOnly.of(readOnly),
            EditorView.editable.of(!readOnly),
            EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
            ...(placeholder ? [placeholderExt(placeholder)] : []),
            EditorView.updateListener.of((update) => {
              if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
            }),
          ],
        }),
      });
      view.current = created;
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

  return <div ref={host} className="h-full min-h-48" />;
}
