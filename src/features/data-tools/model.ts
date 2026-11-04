/**
 * A neutral tree for the Tree and Table views of JSON and XML. Builders turn a parsed value (JSON)
 * or document (XML) into it; the views only know this shape.
 */
export type NodeKind =
  "object" | "array" | "string" | "number" | "boolean" | "null" | "element" | "attribute" | "text";

export interface TreeNode {
  /** Unique within the tree. */
  id: string;
  /** Key, tag name, or the array index as text. */
  label: string;
  kind: NodeKind;
  /** Scalar shown after the label (strings are shown with quotes by the view). */
  value?: string;
  /** Position inside the parent array or among same-named XML siblings. */
  index?: number;
  /** For containers: number of direct children (items of an array, keys of an object...). */
  count?: number;
  children?: TreeNode[];
  /** JSON location (keys and indexes from the root). Not set for XML. */
  path?: ReadonlyArray<string | number>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function jsonToTree(
  value: unknown,
  label = "root",
  id = "$",
  index?: number,
  path: ReadonlyArray<string | number> = [],
): TreeNode {
  if (Array.isArray(value)) {
    return {
      id,
      label,
      kind: "array",
      index,
      path,
      count: value.length,
      children: value.map((item, i) => jsonToTree(item, String(i), `${id}[${i}]`, i, [...path, i])),
    };
  }
  if (isObject(value)) {
    const keys = Object.keys(value);
    return {
      id,
      label,
      kind: "object",
      index,
      path,
      count: keys.length,
      children: keys.map((key) =>
        jsonToTree(value[key], key, `${id}.${key}`, undefined, [...path, key]),
      ),
    };
  }
  const kind: NodeKind =
    value === null
      ? "null"
      : typeof value === "number"
        ? "number"
        : typeof value === "boolean"
          ? "boolean"
          : "string";
  return { id, label, kind, index, path, value: value === null ? "null" : String(value) };
}

export const isContainer = (node: TreeNode): boolean =>
  node.kind === "object" || node.kind === "array" || node.kind === "element";

/** Containers at this depth or shallower start open. */
export const DEFAULT_OPEN_DEPTH = 1;

/** The default open set: the root and its children. */
export function defaultExpanded(root: TreeNode): Set<string> {
  const open = new Set<string>();
  const visit = (node: TreeNode, depth: number) => {
    if (depth > DEFAULT_OPEN_DEPTH || !isContainer(node)) return;
    open.add(node.id);
    for (const child of node.children ?? []) visit(child, depth + 1);
  };
  visit(root, 0);
  return open;
}

/** Every container id, capped so "Expand all" stays responsive on huge documents. */
export function allContainerIds(root: TreeNode, cap = 20000): Set<string> {
  const open = new Set<string>();
  const stack = [root];
  while (stack.length > 0 && open.size < cap) {
    const node = stack.pop()!;
    if (!isContainer(node) || !node.children?.length) continue;
    open.add(node.id);
    for (const child of node.children) stack.push(child);
  }
  return open;
}

/** The node at a JSON path, with the chain of containers leading to it. */
export function findByPath(
  root: TreeNode,
  path: ReadonlyArray<string | number>,
): { node: TreeNode; ancestors: TreeNode[] } | null {
  let node = root;
  const ancestors: TreeNode[] = [];
  for (const segment of path) {
    const next = node.children?.find((child) => child.label === String(segment));
    if (!next) return null;
    ancestors.push(node);
    node = next;
  }
  return { node, ancestors };
}

/** Elements keep attributes as `@name` children and non-blank text as one `#text` child. */
export function xmlToTree(element: Element, id = "/", index?: number, siblings?: number): TreeNode {
  const children: TreeNode[] = [];
  for (const attribute of Array.from(element.attributes)) {
    children.push({
      id: `${id}@${attribute.name}`,
      label: `@${attribute.name}`,
      kind: "attribute",
      value: attribute.value,
    });
  }
  const seen = new Map<string, number>();
  const totals = new Map<string, number>();
  for (const child of Array.from(element.children)) {
    totals.set(child.tagName, (totals.get(child.tagName) ?? 0) + 1);
  }
  for (const child of Array.from(element.children)) {
    const position = seen.get(child.tagName) ?? 0;
    seen.set(child.tagName, position + 1);
    const total = totals.get(child.tagName) ?? 1;
    children.push(
      xmlToTree(
        child,
        `${id}/${child.tagName}[${position}]`,
        total > 1 ? position : undefined,
        total,
      ),
    );
  }
  if (element.children.length === 0) {
    const text = (element.textContent ?? "").trim();
    if (text !== "") {
      children.push({ id: `${id}#text`, label: "#text", kind: "text", value: text });
    }
  }
  return {
    id,
    label: element.tagName,
    kind: "element",
    index,
    count: siblings && siblings > 1 ? siblings : undefined,
    children,
  };
}

export interface TableData {
  columns: string[];
  rows: Array<{ id: string; cells: string[]; nodes: Array<TreeNode | undefined> }>;
  /** Where in the tree the rows came from, for the caption. */
  source: string;
}

const MAX_COLUMNS = 40;

const cellText = (node: TreeNode): string => {
  if (node.children && node.kind !== "element") {
    return node.kind === "array" ? `[${node.count ?? 0}]` : `{${node.count ?? 0}}`;
  }
  if (node.kind === "element") {
    const text = node.children?.find((child) => child.kind === "text")?.value;
    return text ?? `<${node.children?.length ?? 0}>`;
  }
  return node.value ?? "";
};

function rowsOf(node: TreeNode): TreeNode[] | null {
  if (node.kind === "array" && node.children && node.children.length > 0) return node.children;
  if (node.kind === "element" && node.children) {
    const elements = node.children.filter((child) => child.kind === "element");
    const first = elements[0];
    if (first && elements.length >= 2 && elements.every((child) => child.label === first.label)) {
      return elements;
    }
  }
  return null;
}

/** Somewhere the Table view can read rows from: a JSON array, or an element repeated under one parent. */
export interface TableSource {
  owner: TreeNode;
  rows: TreeNode[];
}

const MAX_SOURCES = 50;

/** Every array of rows in the document, breadth first (the shallowest first), at most 50. */
export function findTableSources(root: TreeNode): TableSource[] {
  const found: TableSource[] = [];
  const queue: TreeNode[] = [root];
  for (let i = 0; i < queue.length && i < 5000 && found.length < MAX_SOURCES; i += 1) {
    const node = queue[i]!;
    const rows = rowsOf(node);
    if (rows) found.push({ owner: node, rows });
    for (const child of node.children ?? []) queue.push(child);
  }
  return found;
}

/** First array of rows found breadth-first. */
export function findTable(root: TreeNode): TableData | null {
  const first = findTableSources(root)[0];
  return first ? tableOf(first) : null;
}

export const tableOf = ({ owner, rows }: TableSource): TableData => buildTable(owner, rows);

function buildTable(owner: TreeNode, rows: TreeNode[]): TableData {
  const columns: string[] = [];
  const has = new Set<string>();
  let scalarRows = false;
  for (const row of rows) {
    if (!row.children) {
      scalarRows = true;
      continue;
    }
    for (const child of row.children) {
      if (!has.has(child.label) && columns.length < MAX_COLUMNS) {
        has.add(child.label);
        columns.push(child.label);
      }
    }
  }
  const valueColumn = scalarRows || columns.length === 0;
  const header = valueColumn ? [...columns, "value"] : columns;
  return {
    columns: header,
    source: owner.label,
    rows: rows.map((row) => {
      const nodes: Array<TreeNode | undefined> = columns.map((column) =>
        row.children?.find((child) => child.label === column),
      );
      const cells = nodes.map((found) => (found ? cellText(found) : ""));
      if (valueColumn) {
        cells.push(row.children ? "" : cellText(row));
        nodes.push(row.children ? undefined : row);
      }
      return { id: row.id, cells, nodes };
    }),
  };
}

/** The node with this id, found depth first, or null. */
export function findById(root: TreeNode, id: string): TreeNode | null {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.id === id) return node;
    for (const child of node.children ?? []) stack.push(child);
  }
  return null;
}

/** The id `jsonToTree` gives the node at a JSON path. */
export function idOfPath(path: ReadonlyArray<string | number>): string {
  return path.reduce<string>(
    (id, segment) => (typeof segment === "number" ? `${id}[${segment}]` : `${id}.${segment}`),
    "$",
  );
}

/** Ids of every container on the way to a path, the root first, the node itself excluded. */
export function ancestorIds(path: ReadonlyArray<string | number>): string[] {
  return path.map((_, depth) => idOfPath(path.slice(0, depth)));
}
