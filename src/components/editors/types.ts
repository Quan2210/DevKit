export type CodeEditorLanguage = "json" | "xml" | "markdown" | "css" | "text";

export interface LineHighlight {
  /** 1-based line. */
  line: number;
  kind: "added" | "removed" | "changed";
}

export interface CodeEditorProps {
  value: string;
  /** Omit for read-only output. */
  onChange?: (value: string) => void;
  language: CodeEditorLanguage;
  readOnly?: boolean;
  /** Accessible name of the editing surface. */
  ariaLabel: string;
  placeholder?: string;
  /** Lines to tint (compare view). */
  highlights?: ReadonlyArray<LineHighlight>;
}

export interface CodeEditorHandle {
  focus: () => void;
  /** History of this editor (Ctrl+Z / Ctrl+Shift+Z); external value changes are part of it. */
  undo: () => void;
  redo: () => void;
  /** Move the caret to a 1-based line and column (used by "jump to error" links). */
  goTo: (line: number, column: number) => void;
}
