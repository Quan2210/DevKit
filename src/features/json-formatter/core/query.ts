import { DEFAULT_LOCALE, translate, type MessageKey, type MessageParams } from "../../../i18n";
import { fail, ok, type Result, type ToolError } from "../../../lib/result";
import { compare, matchDocument, parseQuery, QueryError, rank } from "./filter";
import { parseJson, type JsonIndent } from "./json";
import { emptyQuery, isQueryActive, type QuerySpec } from "../../data-tools/types";
import type { Path } from "./path";

const t = (key: MessageKey, params?: MessageParams): string =>
  translate(DEFAULT_LOCALE, key, params);

export { emptyQuery, isQueryActive, type QuerySpec };

export interface QueryResult {
  /** The documents that matched, sorted and projected. */
  value: unknown[];
  /** How many documents the array had, and how many matched the filter. */
  total: number;
  matched: number;
  /** Which array of the document was queried. */
  base: Path;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const hasOwn = (target: object, key: string) => Object.prototype.hasOwnProperty.call(target, key);

function setOwn(target: Record<string, unknown>, key: string, value: unknown) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/** The array a query runs on: the root when it is an array, else the first array found breadth first. */
export function findArrayPath(root: unknown): Path | null {
  const queue: Array<{ value: unknown; path: Path }> = [{ value: root, path: [] }];
  for (let i = 0; i < queue.length && i < 5000; i += 1) {
    const { value, path } = queue[i]!;
    if (Array.isArray(value)) return path;
    if (isObject(value)) {
      for (const [key, child] of Object.entries(value))
        queue.push({ value: child, path: [...path, key] });
    }
  }
  return null;
}

function arrayAt(root: unknown, path: Path): unknown[] | null {
  let current = root;
  for (const segment of path) {
    if (current === null || typeof current !== "object") return null;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return Array.isArray(current) ? current : null;
}

const firstValue = (doc: unknown, path: string): unknown => {
  let current = doc;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

function sortDocuments(docs: unknown[], spec: unknown): unknown[] {
  if (!isObject(spec)) throw new QueryError(t("query.errNotObject", { field: "Sort" }));
  const keys = Object.entries(spec);
  for (const [, direction] of keys) {
    if (direction !== 1 && direction !== -1) throw new QueryError(t("query.errSort"));
  }
  if (keys.length === 0) return docs;
  return docs
    .map((doc, index) => ({ doc, index }))
    .sort((a, b) => {
      for (const [path, direction] of keys) {
        const left = firstValue(a.doc, path);
        const right = firstValue(b.doc, path);
        const same = compare(left, right);
        const order = same ?? Math.sign(rank(left) - rank(right));
        if (order !== 0) return order * (direction as number);
      }
      return a.index - b.index;
    })
    .map((entry) => entry.doc);
}

function include(value: unknown, parts: readonly string[]): unknown {
  if (parts.length === 0) return value;
  const [head, ...rest] = parts as [string, ...string[]];
  if (Array.isArray(value))
    return value.map((item) => include(item, parts)).filter((x) => x !== undefined);
  if (!isObject(value) || !hasOwn(value, head)) return undefined;
  const inner = include(value[head], rest);
  return inner === undefined ? undefined : { [head]: inner };
}

function merge(target: Record<string, unknown>, part: Record<string, unknown>) {
  for (const [key, value] of Object.entries(part)) {
    const existing = target[key];
    if (isObject(existing) && isObject(value)) merge(existing, value);
    else if (Array.isArray(existing) && Array.isArray(value)) {
      value.forEach((item, i) => {
        if (isObject(existing[i]) && isObject(item))
          merge(existing[i] as Record<string, unknown>, item);
        else existing[i] = item;
      });
    } else setOwn(target, key, value);
  }
}

function exclude(value: unknown, parts: readonly string[]): unknown {
  if (Array.isArray(value)) return value.map((item) => exclude(item, parts));
  if (!isObject(value)) return value;
  const [head, ...rest] = parts as [string, ...string[]];
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key !== head) setOwn(out, key, child);
    else if (rest.length > 0) setOwn(out, key, exclude(child, rest));
  }
  return out;
}

function projectDocuments(docs: unknown[], spec: unknown): unknown[] {
  if (!isObject(spec)) throw new QueryError(t("query.errNotObject", { field: "Project" }));
  const entries = Object.entries(spec).map(
    ([path, flag]) => [path, flag === true ? 1 : flag === false ? 0 : flag] as const,
  );
  if (entries.length === 0) return docs;
  if (entries.some(([, flag]) => flag !== 0 && flag !== 1))
    throw new QueryError(t("query.errProject"));
  const included = entries.filter(([, flag]) => flag === 1).map(([path]) => path);
  const excluded = entries.filter(([, flag]) => flag === 0).map(([path]) => path);
  if (included.length > 0 && excluded.length > 0) throw new QueryError(t("query.errProject"));
  if (included.length > 0) {
    return docs.map((doc) => {
      if (!isObject(doc)) return doc;
      const out: Record<string, unknown> = {};
      for (const path of included) {
        const part = include(doc, path.split("."));
        if (isObject(part)) merge(out, part);
      }
      return out;
    });
  }
  return docs.map((doc) => excluded.reduce((acc, path) => exclude(acc, path.split(".")), doc));
}

/** Run a Compass-style Filter, Sort and Project over the array of a parsed JSON document. */
export function runQuery(
  root: unknown,
  spec: QuerySpec,
  base?: Path,
): Result<QueryResult, ToolError> {
  try {
    const path = base ?? findArrayPath(root);
    const docs = path ? arrayAt(root, path) : null;
    if (!path || !docs) throw new QueryError(t("query.errNoArray"));
    const filter = parseQuery(spec.filter);
    if (!isObject(filter)) throw new QueryError(t("query.errNotObject", { field: "Filter" }));
    const matched = docs.filter((doc) => matchDocument(doc, filter));
    const sorted = sortDocuments(matched, parseQuery(spec.sort));
    const value = projectDocuments(sorted, parseQuery(spec.project));
    return ok({ value, total: docs.length, matched: matched.length, base: path });
  } catch (error) {
    if (error instanceof QueryError) return fail({ kind: "validation", message: error.message });
    return fail({ kind: "processing", message: t("query.errUnexpected") });
  }
}

/** The result as formatted JSON text, for the preview, Apply and Transform. */
export function queryText(
  text: string,
  spec: QuerySpec,
  indent: JsonIndent,
): Result<{ text: string; count: number; total: number; base: Path }, ToolError> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const result = runQuery(parsed.value, spec);
  if (!result.ok) return result;
  try {
    return ok({
      text: JSON.stringify(result.value.value, null, indent),
      count: result.value.matched,
      total: result.value.total,
      base: result.value.base,
    });
  } catch {
    return fail({ kind: "processing", message: t("json.tooDeep") });
  }
}
