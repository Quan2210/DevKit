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
  /** Caret position (UTF-16 offset), reported on every selection or content change. */
  onCursor?: (offset: number) => void;
}

export interface CodeEditorHandle {
  focus: () => void;
  /** History of this editor (Ctrl+Z / Ctrl+Shift+Z); external value changes are part of it. */
  undo: () => void;
  redo: () => void;
  /** Move the caret to a 1-based line and column (used by "jump to error" links). */
  goTo: (line: number, column: number) => void;
  /** Put the caret at a UTF-16 offset and scroll it into view. */
  select: (offset: number) => void;
  /** Highlight every case-insensitive match of `term`, select the first, return how many there are. */
  search: (term: string) => number;
  /** Select the next / previous match of the current search. */
  findNext: () => void;
  findPrev: () => void;
  /** Remove the search highlight. */
  clearSearch: () => void;
}
