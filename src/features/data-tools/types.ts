import type { CodeEditorLanguage } from "../../components/editors/CodeEditor";
import type { Result, ToolError } from "../../lib/result";
import type { TreeNode } from "./model";

export type Side = "left" | "right";
export type View = "text" | "minify" | "tree" | "table";
export type Indent = 2 | 4;
export type Sort = "off" | "asc" | "desc";

/** A location in a document: keys and array indexes from the root. */
export type NodePath = ReadonlyArray<string | number>;

export type ValueKind = "string" | "number" | "boolean" | "null" | "object" | "array";

/** A change to one node of a document, addressed by path. */
export type EditOp =
  | { type: "setValue"; path: NodePath; value: unknown }
  | { type: "renameKey"; path: NodePath; key: string }
  | { type: "remove"; path: NodePath }
  | { type: "duplicate"; path: NodePath }
  | { type: "changeType"; path: NodePath; to: ValueKind }
  /** Replace the whole document by the value at `path` (for example an array shown in the table). */
  | { type: "extract"; path: NodePath }
  /** Add into the object or array at `parent`; `index` defaults to the end, `key` is for objects. */
  | { type: "insert"; parent: NodePath; index?: number; key?: string; value: unknown };

/** What the node menu and shortcuts can ask for; the pane turns them into `EditOp`s. */
export type NodeAction =
  | "insertBefore"
  | "insertAfter"
  | "addChild"
  | "duplicate"
  | "remove"
  | { type: "changeType"; to: ValueKind };

/** The three boxes of a MongoDB Compass query bar, as typed. */
export interface QuerySpec {
  filter: string;
  sort: string;
  project: string;
}

export const emptyQuery: QuerySpec = { filter: "", sort: "", project: "" };

export const isQueryActive = (query: QuerySpec): boolean =>
  [query.filter, query.sort, query.project].some((text) => text.trim() !== "");

export interface QuerySupport {
  /** Runs the query on the document in `text`; the result is formatted with `indent`. */
  run: (
    text: string,
    query: QuerySpec,
    indent: Indent,
  ) => Result<{ text: string; count: number; total: number; base: NodePath }, ToolError>;
  /** Spelled out for the box under the query fields. */
  formatPath: (path: NodePath) => string;
}

export interface EditSupport {
  apply: (
    text: string,
    op: EditOp,
    indent: Indent,
  ) => Result<{ text: string; path: NodePath }, ToolError>;
  /** Turns what the user typed into a value of the node's kind. */
  parseValue: (kind: "string" | "number" | "boolean", input: string) => Result<unknown, ToolError>;
  /** True when rewriting the document would change a number (so Tree editing is off). */
  isLossy: (text: string) => boolean;
}

export type DiffKind = "added" | "removed" | "changed";

/** What to mark in one pane's tree: the changed nodes, and the containers that hold changes. */
export interface DiffMarks {
  /** Node id (the id `jsonToTree` gives) to what happened to it. */
  marks: ReadonlyMap<string, DiffKind>;
  containers: ReadonlySet<string>;
}

export interface CompareResult {
  count: number;
  /** Every difference in document order, for jumping from one to the next. */
  items: ReadonlyArray<{ path: NodePath; kind: DiffKind }>;
  left: DiffMarks;
  right: DiffMarks;
}

/** Editor features beyond viewing; present for JSON only. */
export interface EditorSupport {
  /** Path of the node under a caret offset in the text, or null when the text is not valid. */
  pathAtOffset: (text: string, offset: number) => NodePath | null;
  /** Where the value at a path starts in the text, or null. */
  offsetOfPath: (text: string, path: NodePath) => number | null;
  formatPath: (path: NodePath) => string;
  parsePath: (text: string) => { ok: true; value: NodePath } | { ok: false; reason: string };
  /** Value of the `accept` attribute for the open-file picker. */
  accept: string;
  maxBytes: number;
  /** Present when the Tree view can edit the document. */
  edit?: EditSupport;
  /** Present when Filter, Sort and Project can run on the document. */
  query?: QuerySupport;
  /** Filename for "Save" and its minified sibling. */
  saveAs: { filename: string; minFilename: string; mime: string };
}

/** What differs between JSON and XML; the panes, views and actions are shared. */
export interface DataAdapter {
  language: CodeEditorLanguage;
  /** Validates and returns the tree for the Tree and Table views. */
  analyze: (text: string) => Result<TreeNode, ToolError>;
  format: (text: string, indent: Indent, sort: Sort) => Result<string, ToolError>;
  minify: (text: string) => Result<string, ToolError>;
  /** Present when sorting keys makes sense (JSON). */
  sortable?: boolean;
  /** Present when two texts can be compared (JSON). Null when either side is not valid. */
  compare?: (left: string, right: string) => CompareResult | null;
  download?: { filename: string; mime: string };
  /** Present for JSON: breadcrumb, search, open and save. */
  editor?: EditorSupport;
}

export interface DataLabels {
  /** Names of the two editors (textbox accessible names). */
  leftEditor: string;
  rightEditor: string;
  placeholder: string;
  sample: string;
  location: (line: number, column: number) => string;
}

export interface PaneState {
  text: string;
  view: View;
  indent: Indent;
  sort: Sort;
  /** The query bar is open and what is typed in it. */
  queryOpen: boolean;
  query: QuerySpec;
}

export const initialPane: PaneState = {
  text: "",
  view: "text",
  indent: 2,
  sort: "off",
  queryOpen: false,
  query: emptyQuery,
};
export const isBlank = (text: string): boolean => text.trim() === "";
