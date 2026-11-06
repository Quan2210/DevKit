import type { DiffOptions, DiffSummary } from "../../features/text-compare/core/diff";

export type DiffView = "split" | "unified";

/** Number of changed blocks; `precise` is false when the diff had to fall back to a rough one (huge texts). */
export type DiffReport = DiffSummary & { precise: boolean };

export interface DiffEditorProps {
  /** Text on the left (split) or the deleted lines (unified). */
  original: string;
  /** Text on the right (split) or the editable text (unified). */
  modified: string;
  /** Called on every edit, with the side that was edited. */
  onChange: (side: "original" | "modified", value: string) => void;
  view: DiffView;
  options: DiffOptions;
  /** Fold long stretches of identical lines. */
  collapseUnchanged: boolean;
  wrap: boolean;
  /** Accessible names of the two editing surfaces. */
  labels: { original: string; modified: string };
  /** Reported when the number of changed blocks changes. */
  onSummary?: (report: DiffReport) => void;
}

export interface DiffEditorHandle {
  /** Move to the next / previous changed block. */
  next: () => void;
  prev: () => void;
  focus: () => void;
}
