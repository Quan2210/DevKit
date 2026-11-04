import {
  ArrowDownAZ,
  ArrowUpDown,
  ArrowUpZA,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardPaste,
  Copy,
  Download,
  Eraser,
  Filter,
  FileText,
  FileUp,
  ListTree,
  Redo2,
  Save,
  Search,
  Shrink,
  Table2,
  Undo2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type Ref,
  type RefObject,
  useImperativeHandle,
} from "react";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { Button } from "../../components/common/Button";
import { CopyButton } from "../../components/common/CopyButton";
import { ErrorBanner } from "../../components/common/ErrorBanner";
import { IconButton } from "../../components/common/IconButton";
import { MenuButton } from "../../components/common/MenuButton";
import { Panel } from "../../components/common/Panel";
import { Segmented } from "../../components/common/Segmented";
import { StatusBadge } from "../../components/common/StatusBadge";
import { CodeEditor, type CodeEditorHandle } from "../../components/editors/CodeEditor";
import { useDebounced } from "../../hooks/useDebounced";
import { useT } from "../../i18n/useT";
import { copyText } from "../../lib/io/clipboard";
import { downloadText } from "../../lib/io/download";
import { readTextFile } from "../../lib/io/readText";
import type { Result, ToolError } from "../../lib/result";
import {
  allContainerIds,
  ancestorIds,
  defaultExpanded,
  findById,
  findByPath,
  findTableSources,
  tableOf,
  type TableSource,
  idOfPath,
  type TreeNode,
} from "./model";
import { QueryPanel } from "./QueryPanel";
import { SearchBar } from "./SearchBar";
import { searchTree } from "./search";
import { TableView } from "./TableView";
import { TreeView, type EditField } from "./TreeView";
import {
  emptyQuery,
  isBlank,
  isQueryActive,
  type DataAdapter,
  type DataLabels,
  type DiffMarks,
  type EditOp,
  type Indent,
  type NodeAction,
  type NodePath,
  type PaneState,
  type Sort,
  type View,
} from "./types";

const ICON = "size-4";
const NEXT_SORT: Record<Sort, Sort> = { off: "asc", asc: "desc", desc: "off" };

export interface DataPaneProps {
  title: string;
  adapter: DataAdapter;
  labels: DataLabels;
  editorLabel: string;
  pane: PaneState;
  patch: (change: Partial<PaneState>) => void;
  setText: (text: string) => void;
  /** Debounced validation of this pane's text; null when it is blank. */
  analysis: Result<TreeNode, ToolError> | null;
  /** Compare mode: what differs in this pane's tree. */
  diff?: DiffMarks;
  editorRef: RefObject<CodeEditorHandle | null>;
  handleRef?: Ref<DataPaneHandle>;
}

/** What the tool around the pane can ask of it. */
export interface DataPaneHandle {
  /** Select and scroll to the node at a path in the Tree view; false when there is none. */
  reveal: (path: NodePath) => boolean;
  /** Open these containers (and the default ones) in the Tree view. */
  expand: (ids: Iterable<string>) => void;
}

/** One side of a data tool: header actions, toolbar, breadcrumb, search and the current view. */
export function DataPane({
  title,
  adapter,
  labels,
  editorLabel,
  pane,
  patch,
  setText,
  analysis,
  diff,
  editorRef,
  handleRef,
}: DataPaneProps) {
  const t = useT();
  const support = adapter.editor;
  const blank = isBlank(pane.text);
  const texting = pane.view === "text";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string> | null>(null);
  const [search, setSearch] = useState({ open: false, term: "", index: 0 });
  const [textCount, setTextCount] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const [editing, setEditing] = useState<{ id: string; field: EditField } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [noteDismissed, setNoteDismissed] = useState(false);
  // Which array the Table view shows when the document itself is not an array.
  const [tableSourceId, setTableSourceId] = useState<string | null>(null);
  // What the Compact view last wrote itself: kept as typed instead of being compacted again under the caret.
  const [ownCompact, setOwnCompact] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  // The Tree and Table views parse the editor's current text, not the debounced one, so switching
  // view shows what is in the editor now.
  const current = useMemo(() => {
    if (blank || (pane.view !== "tree" && pane.view !== "table")) return null;
    return adapter.analyze(pane.text);
  }, [adapter, blank, pane.text, pane.view]);
  const tree = current?.ok ? current.value : null;
  const selectedNode = tree && selectedId ? findById(tree, selectedId) : null;

  const debouncedText = useDebounced(pane.text, 250);
  const debouncedCursor = useDebounced(cursor, 150);
  const textPath = useMemo(() => {
    if (!support || !texting || !analysis?.ok) return null;
    return support.pathAtOffset(debouncedText, debouncedCursor);
  }, [support, texting, analysis, debouncedText, debouncedCursor]);

  const crumbPath: NodePath | null = !support
    ? null
    : pane.view === "tree"
      ? tree
        ? (selectedNode?.path ?? [])
        : null
      : texting
        ? textPath
        : null;

  const treeSearch = useMemo(
    () => (search.open && pane.view === "tree" && tree ? searchTree(tree, search.term) : null),
    [search.open, search.term, pane.view, tree],
  );
  const matchIds = useMemo(() => new Set(treeSearch?.matches ?? []), [treeSearch]);
  const currentMatchId = treeSearch?.matches[search.index] ?? null;

  const reveal = (node: TreeNode, ancestors: Iterable<string>) => {
    if (!tree) return;
    setSelectedId(node.id);
    setExpanded(new Set([...(expanded ?? defaultExpanded(tree)), ...ancestors]));
  };

  const selectPath = (path: NodePath): boolean => {
    if (!support) return false;
    if (pane.view === "tree" && tree) {
      const found = findByPath(tree, path);
      if (!found) return false;
      reveal(
        found.node,
        found.ancestors.map((node) => node.id),
      );
      return true;
    }
    const offset = support.offsetOfPath(pane.text, path);
    if (offset === null) return false;
    editorRef.current?.select(offset);
    setCursor(offset);
    return true;
  };

  const closeSearch = () => {
    setSearch((state) => ({ ...state, open: false }));
    editorRef.current?.clearSearch();
    setTextCount(0);
  };
  const runSearch = (term: string) => {
    setSearch((state) => ({ ...state, term, index: 0 }));
    if (texting) {
      setTextCount(term === "" ? 0 : (editorRef.current?.search(term) ?? 0));
    } else if (tree) {
      const result = searchTree(tree, term);
      const first = result.nodes[0];
      if (first) reveal(first, result.ancestors);
    }
  };
  const step = (delta: 1 | -1) => {
    if (texting) {
      if (textCount === 0) return;
      if (delta === 1) editorRef.current?.findNext();
      else editorRef.current?.findPrev();
      setSearch((state) => ({ ...state, index: (state.index + delta + textCount) % textCount }));
    } else if (treeSearch && treeSearch.nodes.length > 0) {
      const total = treeSearch.nodes.length;
      const index = (search.index + delta + total) % total;
      setSearch((state) => ({ ...state, index }));
      reveal(treeSearch.nodes[index]!, treeSearch.ancestors);
    }
  };
  const canSearch = !!support && !blank && (texting || pane.view === "tree");

  const changeView = (view: View) => {
    if (search.open) closeSearch();
    if (view === "tree" && textPath && !blank) {
      // Carry the caret's node over to the Tree view.
      const parsed = adapter.analyze(pane.text);
      const found = parsed.ok ? findByPath(parsed.value, textPath) : null;
      if (parsed.ok && found) {
        setSelectedId(found.node.id);
        setExpanded(
          new Set([...defaultExpanded(parsed.value), ...found.ancestors.map((node) => node.id)]),
        );
      }
    }
    patch({ view });
  };

  const onKeyDownCapture = (event: KeyboardEvent) => {
    if (!support || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "f") return;
    if (!canSearch) return;
    event.preventDefault();
    event.stopPropagation();
    setSearch((state) => ({ ...state, open: true }));
  };

  const openFile = async (file: File | undefined) => {
    if (!file || !support) return;
    const result = await readTextFile(file, support.maxBytes);
    if (!result.ok) {
      setFileError(result.error.message);
      return;
    }
    setFileError(null);
    patch({ view: "text" });
    setText(result.value);
  };
  const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

  const minified = () => {
    const result = adapter.minify(pane.text);
    return result.ok ? result.value : null;
  };
  const copy = async (text: string | null) => {
    if (text === null) return;
    setCopied((await copyText(text)) ? "ok" : "failed");
  };

  // Tree editing rewrites the whole document, which would round some numbers: then it stays off.
  const editSupport = support?.edit;
  const editableView = pane.view === "tree" || pane.view === "table";
  const lossy = !!editSupport && editableView && !!tree && editSupport.isLossy(pane.text);
  const editable = !!editSupport && editableView && !!tree && !lossy;

  // The query bar: the result shows in place of the pane until Apply writes it into the text.
  const querySupport = support?.query;
  const debouncedQuery = useDebounced(pane.query, 250);
  const queryRun = useMemo(() => {
    if (!querySupport || !pane.queryOpen || !isQueryActive(debouncedQuery) || !analysis?.ok) {
      return null;
    }
    return querySupport.run(debouncedText, debouncedQuery, pane.indent);
  }, [querySupport, pane.queryOpen, debouncedQuery, analysis, debouncedText, pane.indent]);
  const queryOk = queryRun?.ok ? queryRun.value : null;
  const closeQuery = () => patch({ queryOpen: false, query: emptyQuery });
  const applyQuery = () => {
    if (!querySupport) return;
    const run = querySupport.run(pane.text, pane.query, pane.indent);
    if (!run.ok) return;
    setText(run.value.text);
    patch({ queryOpen: false, query: emptyQuery, view: "text" });
  };

  /** Applies an edit to the text. Returns an error message, or null when it worked. */
  const commitOp = (op: EditOp, startEdit?: EditField, report = true): string | null => {
    if (!editSupport || !tree) return null;
    const result = editSupport.apply(pane.text, op, pane.indent);
    if (!result.ok) {
      if (report) setEditError(result.error.message);
      return result.error.message;
    }
    setEditError(null);
    setText(result.value.text);
    const id = idOfPath(result.value.path);
    setSelectedId(id);
    setExpanded(
      new Set([...(expanded ?? defaultExpanded(tree)), ...ancestorIds(result.value.path)]),
    );
    setEditing(startEdit ? { id, field: startEdit } : null);
    return null;
  };

  const onCommitEdit = (node: TreeNode, field: EditField, text: string): string | null => {
    if (!editSupport || !node.path) return null;
    if (field === "key")
      return commitOp({ type: "renameKey", path: node.path, key: text }, undefined, false);
    const kind = node.kind;
    if (kind !== "string" && kind !== "number" && kind !== "boolean") return null;
    const parsed = editSupport.parseValue(kind, text);
    if (!parsed.ok) return parsed.error.message;
    return commitOp({ type: "setValue", path: node.path, value: parsed.value }, undefined, false);
  };

  const onNodeAction = (node: TreeNode, action: NodeAction) => {
    if (!node.path || !tree) return;
    const parentPath = node.path.slice(0, -1);
    const parent = findByPath(tree, parentPath)?.node;
    const siblingIndex = parent?.children?.findIndex((child) => child.id === node.id) ?? 0;
    const editFieldFor = (container: TreeNode | undefined): EditField =>
      container?.kind === "object" ? "key" : "value";
    if (action === "insertBefore" || action === "insertAfter") {
      commitOp(
        {
          type: "insert",
          parent: parentPath,
          index: action === "insertBefore" ? siblingIndex : siblingIndex + 1,
          value: "",
        },
        editFieldFor(parent),
      );
    } else if (action === "addChild") {
      commitOp({ type: "insert", parent: node.path, value: "" }, editFieldFor(node));
    } else if (action === "duplicate") {
      commitOp({ type: "duplicate", path: node.path });
    } else if (action === "remove") {
      commitOp({ type: "remove", path: node.path });
    } else {
      commitOp({ type: "changeType", path: node.path, to: action.to });
    }
  };

  useImperativeHandle(handleRef, () => ({
    reveal: (path) => selectPath(path),
    expand: (ids) => {
      const parsed = adapter.analyze(pane.text);
      if (parsed.ok) setExpanded(new Set([...defaultExpanded(parsed.value), ...ids]));
    },
  }));

  const sortLabel =
    pane.sort === "off"
      ? t("json.sortOff")
      : pane.sort === "asc"
        ? t("json.sortAsc")
        : t("json.sortDesc");

  /** Dropping new data into a view that is not the text editor shows it in that view right away. */
  const takeText = (text: string) => {
    if (isBlank(text)) return;
    setFileError(null);
    setEditError(null);
    setEditing(null);
    setOwnCompact(null);
    setText(text);
  };
  const pasteFromClipboard = async () => {
    try {
      takeText(await navigator.clipboard.readText());
    } catch {
      // Reading needs the user's permission; the hint still says Ctrl+V works.
    }
  };
  const onPaste = (event: ClipboardEvent<HTMLElement>) => {
    if (pane.view === "text") return; // the editor takes its own paste
    // Fields (inline edit, search, query) keep their own paste.
    if ((event.target as HTMLElement).closest("input, textarea, select")) return;
    const text = event.clipboardData.getData("text/plain");
    if (isBlank(text)) return;
    event.preventDefault();
    takeText(text);
  };

  const body = (() => {
    if (pane.view === "minify") {
      const result = blank ? null : adapter.minify(pane.text);
      // Valid text shows compacted; text that is not valid yet (or was typed here) shows as it is.
      const value = ownCompact === pane.text || !result?.ok ? pane.text : result.value;
      return (
        <CodeEditor
          language={adapter.language}
          value={value}
          onChange={(text) => {
            setFileError(null);
            setOwnCompact(text);
            setText(text);
          }}
          ariaLabel={`${editorLabel} · ${t("view.minify")}`}
          placeholder={labels.placeholder}
        />
      );
    }
    if (pane.view === "tree" || pane.view === "table") {
      if (!current) {
        return (
          <div className="flex flex-col items-start gap-3 p-3 text-sm text-text-muted">
            <p>{t("view.pasteHint")}</p>
            <Button
              variant="secondary"
              icon={<ClipboardPaste aria-hidden className={ICON} />}
              onClick={() => void pasteFromClipboard()}
            >
              {t("view.pasteButton")}
            </Button>
          </div>
        );
      }
      if (!current.ok)
        return <p className="p-3 text-sm text-text-muted">{t("tree.unavailable")}</p>;
      if (pane.view === "tree") {
        return (
          <TreeView
            root={current.value}
            label={t("view.tree")}
            expanded={expanded}
            onExpandedChange={setExpanded}
            selectedId={selectedNode?.id ?? null}
            onSelect={(node) => setSelectedId(node.id)}
            matches={matchIds}
            currentMatchId={currentMatchId}
            diff={diff}
            editable={editable && pane.view === "tree"}
            editing={editing}
            onStartEdit={(node, field) => {
              setEditError(null);
              setEditing({ id: node.id, field });
            }}
            onCancelEdit={() => setEditing(null)}
            onCommitEdit={onCommitEdit}
            onAction={onNodeAction}
          />
        );
      }
      return tableBody(current.value);
    }
    return null;
  })();

  /** The Table view: the document's own array, or the one picked from the arrays inside it. */
  function tableBody(root: TreeNode) {
    const sources = findTableSources(root);
    const first = sources[0];
    if (!first) {
      return (
        <div className="flex flex-col items-start gap-3 p-3 text-sm text-text-muted">
          <p>{t("table.noData")}</p>
          <Button variant="secondary" onClick={() => changeView("tree")}>
            {t("table.toTree")}
          </Button>
        </div>
      );
    }
    const label = (source: TableSource) =>
      `${source.owner.path ? (support?.formatPath(source.owner.path) ?? source.owner.label) : source.owner.label} (${t("table.items", { count: source.rows.length })})`;
    const extract = (source: TableSource) => {
      if (source.owner.path)
        commitOp({ type: "extract", path: source.owner.path }, undefined, true);
    };
    const canExtract = !!editSupport && editable;
    const picked =
      first.owner.id === root.id ? first : sources.find((s) => s.owner.id === tableSourceId);
    if (!picked) {
      // The document is an object: it cannot be a table itself, so offer the arrays inside it.
      return (
        <div className="h-full space-y-3 overflow-auto p-3 text-sm">
          <h3 className="text-base font-semibold text-text">{t("table.chooseTitle")}</h3>
          <p className="text-text-muted">{t("table.chooseBody")}</p>
          <ul className="space-y-2">
            {sources.map((source) => (
              <li
                key={source.owner.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className="min-w-0 font-mono text-[13px] break-all">{label(source)}</span>
                <span className="flex gap-1.5">
                  <Button variant="secondary" onClick={() => setTableSourceId(source.owner.id)}>
                    {t("table.open")}
                  </Button>
                  {canExtract ? (
                    <Button variant="secondary" onClick={() => extract(source)}>
                      {t("table.extract")}
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={() => changeView("tree")}>
            {t("table.toTree")}
          </Button>
        </div>
      );
    }
    const isRoot = picked.owner.id === root.id;
    const table = (
      <TableView
        key={picked.owner.id}
        table={tableOf(picked)}
        label={t("view.table")}
        editable={editable}
        onCommitCell={(node, text) => {
          const kind = node.kind;
          if (!editSupport || !node.path) return null;
          if (kind !== "string" && kind !== "number" && kind !== "boolean") return null;
          const parsed = editSupport.parseValue(kind, text);
          if (!parsed.ok) return parsed.error.message;
          return commitOp(
            { type: "setValue", path: node.path, value: parsed.value },
            undefined,
            false,
          );
        }}
      />
    );
    if (isRoot) return table;
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5 text-sm">
          <label className="flex min-w-0 items-center gap-2">
            {t("table.source")}
            <select
              value={picked.owner.id}
              onChange={(event) => setTableSourceId(event.target.value)}
              className="min-h-8 min-w-0 rounded-md border border-border-strong bg-surface px-2 font-mono text-[13px]"
            >
              {sources.map((source) => (
                <option key={source.owner.id} value={source.owner.id}>
                  {label(source)}
                </option>
              ))}
            </select>
          </label>
          {canExtract ? (
            <Button variant="secondary" onClick={() => extract(picked)}>
              {t("table.extract")}
            </Button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1">{table}</div>
      </div>
    );
  }

  const subbar = (
    <>
      {support && crumbPath ? (
        <Breadcrumb
          items={crumbPath.map(String)}
          onSelect={(depth) => selectPath(crumbPath.slice(0, depth))}
          editValue={support.formatPath(crumbPath)}
          onSubmitEdit={(value) => {
            const parsed = support.parsePath(value);
            if (!parsed.ok) return t("breadcrumb.invalid");
            return selectPath(parsed.value) ? null : t("breadcrumb.notFound");
          }}
        />
      ) : null}
      {search.open && canSearch ? (
        <SearchBar
          label={t("search.label", { side: title })}
          term={search.term}
          onTermChange={runSearch}
          count={texting ? textCount : (treeSearch?.matches.length ?? 0)}
          current={search.index + 1}
          onNext={() => step(1)}
          onPrev={() => step(-1)}
          onClose={closeSearch}
        />
      ) : null}
      {pane.queryOpen && querySupport ? (
        <QueryPanel
          title={title}
          spec={pane.query}
          onChange={(query) => patch({ query })}
          summary={
            queryOk
              ? {
                  matched: queryOk.count,
                  total: queryOk.total,
                  base: querySupport.formatPath(queryOk.base),
                }
              : null
          }
          error={queryRun && !queryRun.ok ? queryRun.error.message : null}
          onApply={applyQuery}
          onCancel={closeQuery}
        />
      ) : null}
      {editError ? (
        <p role="alert" className="border-b border-border px-3 py-1.5 text-sm text-danger">
          {editError}
        </p>
      ) : null}
      {lossy ? (
        <p role="note" className="border-b border-border px-3 py-1.5 text-sm text-warning-fg">
          {t("edit.lossyDisabled")}
        </p>
      ) : null}
      {editable && !noteDismissed ? (
        <p
          role="note"
          className="flex items-center justify-between gap-2 border-b border-border px-3 py-1 text-xs text-text-muted"
        >
          {t("edit.reformatNote")}
          <button
            type="button"
            aria-label={t("action.close")}
            onClick={() => setNoteDismissed(true)}
            className="rounded-sm px-1 hover:text-text"
          >
            {"×"}
          </button>
        </p>
      ) : null}
      {fileError ? (
        <div className="border-b border-border p-2">
          <ErrorBanner title={fileError} />
        </div>
      ) : null}
    </>
  );

  return (
    <Panel
      title={title}
      onPaste={onPaste}
      expandable
      subbar={subbar}
      toolbar={
        <>
          <Segmented<View>
            label={`${t("view.label")} · ${title}`}
            iconOnly
            value={pane.view}
            onChange={changeView}
            options={[
              {
                value: "text",
                label: t("view.text"),
                icon: <FileText aria-hidden className={ICON} />,
              },
              {
                value: "minify",
                label: t("view.minify"),
                icon: <Shrink aria-hidden className={ICON} />,
              },
              {
                value: "tree",
                label: t("view.tree"),
                icon: <ListTree aria-hidden className={ICON} />,
              },
              {
                value: "table",
                label: t("view.table"),
                icon: <Table2 aria-hidden className={ICON} />,
              },
            ]}
          />
          <Segmented<"2" | "4">
            label={`${t("json.indent")} · ${title}`}
            iconOnly
            value={String(pane.indent) as "2" | "4"}
            onChange={(value) => patch({ indent: Number(value) as Indent })}
            options={[
              { value: "2", label: t("json.indent2"), icon: <span aria-hidden>{"2"}</span> },
              { value: "4", label: t("json.indent4"), icon: <span aria-hidden>{"4"}</span> },
            ]}
          />
          {support ? (
            <>
              <IconButton
                label={t("tree.expandAll")}
                icon={<ChevronsUpDown aria-hidden className={ICON} />}
                disabled={!tree}
                onClick={() => tree && setExpanded(allContainerIds(tree))}
              />
              <IconButton
                label={t("tree.collapseAll")}
                icon={<ChevronsDownUp aria-hidden className={ICON} />}
                disabled={!tree}
                onClick={() => tree && setExpanded(new Set([tree.id]))}
              />
            </>
          ) : null}
          {adapter.sortable ? (
            <IconButton
              label={sortLabel}
              aria-pressed={pane.sort !== "off"}
              icon={
                pane.sort === "asc" ? (
                  <ArrowDownAZ aria-hidden className={ICON} />
                ) : pane.sort === "desc" ? (
                  <ArrowUpZA aria-hidden className={ICON} />
                ) : (
                  <ArrowUpDown aria-hidden className={ICON} />
                )
              }
              onClick={() => patch({ sort: NEXT_SORT[pane.sort] })}
            />
          ) : null}
          {querySupport ? (
            <IconButton
              label={t("query.open")}
              aria-pressed={pane.queryOpen}
              icon={<Filter aria-hidden className={ICON} />}
              disabled={blank || !analysis?.ok}
              onClick={() => (pane.queryOpen ? closeQuery() : patch({ queryOpen: true }))}
            />
          ) : null}
          {support ? (
            <IconButton
              label={t("search.open")}
              aria-pressed={search.open}
              icon={<Search aria-hidden className={ICON} />}
              disabled={!canSearch}
              onClick={() =>
                search.open ? closeSearch() : setSearch((state) => ({ ...state, open: true }))
              }
            />
          ) : null}
          <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
          <IconButton
            label={t("action.sample")}
            icon={<FileText aria-hidden className={ICON} />}
            onClick={() => {
              patch({ view: "text" });
              setText(labels.sample);
            }}
          />
          <IconButton
            label={t("action.clear")}
            icon={<Eraser aria-hidden className={ICON} />}
            onClick={() => setText("")}
            disabled={pane.text === ""}
          />
          <IconButton
            label={t("pane.undo")}
            icon={<Undo2 aria-hidden className={ICON} />}
            onClick={() => editorRef.current?.undo()}
            disabled={!texting && !support}
          />
          <IconButton
            label={t("pane.redo")}
            icon={<Redo2 aria-hidden className={ICON} />}
            onClick={() => editorRef.current?.redo()}
            disabled={!texting && !support}
          />
        </>
      }
      actions={
        <>
          {analysis ? (
            <StatusBadge tone={analysis.ok ? "success" : "danger"}>
              {analysis.ok ? t("status.valid") : t("status.invalid")}
            </StatusBadge>
          ) : null}
          {support ? (
            <>
              <input
                ref={fileInput}
                type="file"
                accept={support.accept}
                hidden
                aria-label={t("file.open")}
                onChange={(event) => {
                  void openFile(event.target.files?.[0]);
                  event.target.value = ""; // allow opening the same file again
                }}
              />
              <IconButton
                label={t("file.open")}
                icon={<FileUp aria-hidden className={ICON} />}
                onClick={() => fileInput.current?.click()}
              />
              <MenuButton
                iconOnly
                alignEnd
                label={t("file.save")}
                icon={<Save aria-hidden className={ICON} />}
                disabled={blank}
                items={[
                  {
                    label: t("file.saveJson"),
                    onSelect: () =>
                      downloadText(support.saveAs.filename, pane.text, support.saveAs.mime),
                  },
                  {
                    label: t("file.saveMin"),
                    disabled: minified() === null,
                    onSelect: () => {
                      const text = minified();
                      if (text !== null)
                        downloadText(support.saveAs.minFilename, text, support.saveAs.mime);
                    },
                  },
                ]}
              />
              <MenuButton
                iconOnly
                alignEnd
                label={t("copy.menu")}
                icon={<Copy aria-hidden className={ICON} />}
                disabled={blank}
                items={[
                  { label: t("copy.formatted"), onSelect: () => void copy(pane.text) },
                  {
                    label: t("copy.minified"),
                    disabled: minified() === null,
                    onSelect: () => void copy(minified()),
                  },
                  {
                    label: t("copy.path"),
                    disabled: !crumbPath,
                    onSelect: () => crumbPath && void copy(support.formatPath(crumbPath)),
                  },
                ]}
              />
              <span role="status" className="sr-only">
                {copied === "ok"
                  ? t("action.copied")
                  : copied === "failed"
                    ? t("action.copyFailed")
                    : ""}
              </span>
              {copied === "ok" ? (
                <span aria-hidden className="text-sm text-success-fg">
                  {t("action.copied")}
                </span>
              ) : copied === "failed" ? (
                <span className="text-sm text-danger">{t("action.copyFailed")}</span>
              ) : null}
            </>
          ) : (
            <>
              {adapter.download ? (
                <IconButton
                  label={t("xml.download")}
                  icon={<Download aria-hidden className={ICON} />}
                  disabled={blank}
                  onClick={() =>
                    downloadText(adapter.download!.filename, pane.text, adapter.download!.mime)
                  }
                />
              ) : null}
              <CopyButton iconOnly text={pane.text} disabled={blank} />
            </>
          )}
        </>
      }
    >
      {/* Capture: Ctrl+F has to reach us before CodeMirror's own search panel. */}
      <div
        role="presentation"
        className="relative h-full"
        onKeyDownCapture={onKeyDownCapture}
        onDragOver={(event) => {
          if (!support || !hasFiles(event)) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          if (!support || !hasFiles(event)) return;
          event.preventDefault();
          setDragging(false);
          void openFile(event.dataTransfer.files[0]);
        }}
      >
        {/* Kept mounted while another view shows, so its undo history survives. */}
        <div className={texting && !queryOk ? "h-full" : "hidden"}>
          <CodeEditor
            ref={editorRef}
            language={adapter.language}
            value={pane.text}
            onChange={(text) => {
              setFileError(null);
              setText(text);
            }}
            onCursor={support ? setCursor : undefined}
            ariaLabel={editorLabel}
            placeholder={labels.placeholder}
          />
        </div>
        {queryOk ? (
          <div className="h-full">
            <CodeEditor
              language={adapter.language}
              readOnly
              value={queryOk.text}
              ariaLabel={`${editorLabel} · ${t("query.preview")}`}
            />
          </div>
        ) : texting ? null : (
          <div className="h-full">{body}</div>
        )}
        {dragging ? (
          <div
            aria-hidden
            className="absolute inset-0 z-10 grid place-items-center border-2 border-dashed border-primary bg-surface/80 text-sm font-medium"
          >
            {t("file.drop")}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
