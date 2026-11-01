export type CodeEditorLanguage = "json" | "xml" | "markdown" | "css" | "text";

export interface CodeEditorProps {
  value: string;
  /** Omit for read-only output. */
  onChange?: (value: string) => void;
  language: CodeEditorLanguage;
  readOnly?: boolean;
  /** Accessible name of the editing surface. */
  ariaLabel: string;
  placeholder?: string;
}

export interface CodeEditorHandle {
  focus: () => void;
  /** Move the caret to a 1-based line and column (used by "jump to error" links). */
  goTo: (line: number, column: number) => void;
}
