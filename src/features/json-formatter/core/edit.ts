import { DEFAULT_LOCALE, translate, type MessageKey, type MessageParams } from "../../../i18n";
import { fail, ok, type Result, type ToolError } from "../../../lib/result";
import { findLossyNumbers, parseJson, type JsonIndent } from "./json";
import type { EditOp, ValueKind } from "../../data-tools/types";
import { getAt, type Path } from "./path";

const t = (key: MessageKey, params?: MessageParams): string =>
  translate(DEFAULT_LOCALE, key, params);

export type { EditOp, ValueKind };

export interface EditResult {
  /** The new document, formatted with the pane's indent. */
  text: string;
  /** Where the node the user acted on now lives (the new node for insert and duplicate). */
  path: Path;
}

class EditError extends Error {
  constructor(
    readonly key: MessageKey,
    readonly params?: MessageParams,
  ) {
    super(key);
  }
}

type Json = unknown;
type JsonObject = Record<string, unknown>;

const isObject = (value: Json): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const hasOwn = (target: object, key: string) => Object.prototype.hasOwnProperty.call(target, key);

/** defineProperty keeps a "__proto__" key as data instead of changing the prototype. */
function fromEntries(entries: ReadonlyArray<readonly [string, Json]>): JsonObject {
  const out: JsonObject = {};
  for (const [key, value] of entries) {
    Object.defineProperty(out, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return out;
}

const invalidPath = () => new EditError("edit.invalidPath");

/** A copy of `root` with the value at `path` replaced by `change(old)`. Containers on the way are copied. */
function replaceAt(root: Json, path: Path, change: (old: Json) => Json): Json {
  if (path.length === 0) return change(root);
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    if (typeof head !== "number" || head < 0 || head >= root.length) throw invalidPath();
    const copy = [...root];
    copy[head] = replaceAt(root[head], rest, change);
    return copy;
  }
  if (isObject(root)) {
    if (typeof head !== "string" || !hasOwn(root, head)) throw invalidPath();
    return fromEntries(
      Object.entries(root).map(([key, value]) => [
        key,
        key === head ? replaceAt(value, rest, change) : value,
      ]),
    );
  }
  throw invalidPath();
}

function convert(old: Json, to: ValueKind): Json {
  switch (to) {
    case "string":
      return old === null || typeof old === "object" ? "" : String(old);
    case "number": {
      const parsed =
        typeof old === "string" ? Number(old) : typeof old === "boolean" ? Number(old) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    }
    case "boolean":
      return typeof old === "string"
        ? old.toLowerCase() === "true"
        : typeof old === "number"
          ? old !== 0
          : false;
    case "null":
      return null;
    case "object":
      if (isObject(old)) return old;
      return Array.isArray(old) ? fromEntries(old.map((item, i) => [String(i), item])) : {};
    case "array":
      if (Array.isArray(old)) return old;
      return isObject(old) ? Object.values(old) : [];
  }
}

const uniqueKey = (container: JsonObject, wanted: string) => {
  if (!hasOwn(container, wanted)) return wanted;
  for (let n = 2; ; n += 1) if (!hasOwn(container, `${wanted}${n}`)) return `${wanted}${n}`;
};

function apply(root: Json, op: EditOp): { root: Json; path: Path } {
  switch (op.type) {
    case "setValue":
      return { root: replaceAt(root, op.path, () => op.value), path: op.path };
    case "extract": {
      const value = getAt(root, op.path);
      if (value === undefined) throw invalidPath();
      return { root: value, path: [] };
    }
    case "changeType":
      return { root: replaceAt(root, op.path, (old) => convert(old, op.to)), path: op.path };
    case "renameKey": {
      const last = op.path.at(-1);
      if (typeof last !== "string") throw new EditError("edit.rootOnly");
      const parentPath = op.path.slice(0, -1);
      const next = replaceAt(root, parentPath, (parent) => {
        if (!isObject(parent)) throw invalidPath();
        if (op.key !== last && hasOwn(parent, op.key)) {
          throw new EditError("edit.keyExists", { key: op.key });
        }
        return fromEntries(Object.entries(parent).map(([k, v]) => [k === last ? op.key : k, v]));
      });
      return { root: next, path: [...parentPath, op.key] };
    }
    case "remove": {
      const last = op.path.at(-1);
      if (last === undefined) throw new EditError("edit.rootOnly");
      const parentPath = op.path.slice(0, -1);
      const next = replaceAt(root, parentPath, (parent) => {
        if (Array.isArray(parent) && typeof last === "number") {
          if (last < 0 || last >= parent.length) throw invalidPath();
          return parent.filter((_, i) => i !== last);
        }
        if (isObject(parent) && typeof last === "string" && hasOwn(parent, last)) {
          return fromEntries(Object.entries(parent).filter(([k]) => k !== last));
        }
        throw invalidPath();
      });
      return { root: next, path: parentPath };
    }
    case "duplicate": {
      const last = op.path.at(-1);
      if (last === undefined) throw new EditError("edit.rootOnly");
      const parentPath = op.path.slice(0, -1);
      let newLast: string | number = last;
      const next = replaceAt(root, parentPath, (parent) => {
        if (Array.isArray(parent) && typeof last === "number") {
          if (last < 0 || last >= parent.length) throw invalidPath();
          newLast = last + 1;
          return [
            ...parent.slice(0, last + 1),
            structuredClone(parent[last]),
            ...parent.slice(last + 1),
          ];
        }
        if (isObject(parent) && typeof last === "string" && hasOwn(parent, last)) {
          newLast = uniqueKey(parent, `${last}_copy`);
          const entries = Object.entries(parent);
          const at = entries.findIndex(([k]) => k === last);
          entries.splice(at + 1, 0, [newLast, structuredClone(parent[last])]);
          return fromEntries(entries);
        }
        throw invalidPath();
      });
      return { root: next, path: [...parentPath, newLast] };
    }
    case "insert": {
      let added: string | number = 0;
      const next = replaceAt(root, op.parent, (container) => {
        if (Array.isArray(container)) {
          const at = Math.min(Math.max(op.index ?? container.length, 0), container.length);
          added = at;
          return [...container.slice(0, at), op.value, ...container.slice(at)];
        }
        if (isObject(container)) {
          const key = uniqueKey(container, op.key ?? "newKey");
          added = key;
          const entries = Object.entries(container);
          entries.splice(Math.min(Math.max(op.index ?? entries.length, 0), entries.length), 0, [
            key,
            op.value,
          ]);
          return fromEntries(entries);
        }
        throw new EditError("edit.notContainer");
      });
      return { root: next, path: [...op.parent, added] };
    }
  }
}

/**
 * Apply one edit to JSON text and return the new text, formatted with `indent`. The whole document
 * is parsed and written again (the same trade-off as Format), so callers must not edit documents
 * with `findLossyNumbers` hits, which would be silently rounded.
 */
export function applyEdit(
  text: string,
  op: EditOp,
  indent: JsonIndent,
): Result<EditResult, ToolError> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  try {
    const { root, path } = apply(parsed.value, op);
    return ok({ text: JSON.stringify(root, null, indent), path });
  } catch (error) {
    if (error instanceof EditError) {
      return fail({ kind: "validation", message: t(error.key, error.params) });
    }
    return fail({ kind: "processing", message: t("json.tooDeep") });
  }
}

const NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/** Turn what the user typed into a value of the node's kind. */
export function parseEditedValue(
  kind: "string" | "number" | "boolean",
  input: string,
): Result<unknown, ToolError> {
  const bad = (key: MessageKey) => fail<ToolError>({ kind: "validation", message: t(key) });
  if (kind === "string") return ok(input);
  if (kind === "boolean") {
    const text = input.trim();
    return text === "true" || text === "false" ? ok(text === "true") : bad("edit.notBoolean");
  }
  const text = input.trim();
  if (!NUMBER.test(text) || !Number.isFinite(Number(text))) return bad("edit.notNumber");
  return findLossyNumbers(text).length > 0 ? bad("edit.numberTooPrecise") : ok(Number(text));
}

/** True when editing would change a number in the document (see `findLossyNumbers`). */
export const isLossy = (text: string): boolean => findLossyNumbers(text).length > 0;
