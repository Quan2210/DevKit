import { DEFAULT_LOCALE, translate, type MessageKey, type MessageParams } from "../../../i18n";

const t = (key: MessageKey, params?: MessageParams): string =>
  translate(DEFAULT_LOCALE, key, params);

/** A query the user typed that cannot be parsed or run. `message` is ready to show. */
export class QueryError extends Error {}

const MAX_REGEX_LENGTH = 200;
const MAX_DEPTH = 50;

const hasOwn = (target: object, key: string) => Object.prototype.hasOwnProperty.call(target, key);

/** defineProperty keeps a "__proto__" key as data instead of changing the prototype. */
function setOwn(target: Record<string, unknown>, key: string, value: unknown) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/**
 * Parse what you would type in MongoDB Compass: JSON with unquoted keys, single or double quotes,
 * trailing commas and `/regex/flags` literals. Nothing is evaluated. Blank text is `{}`.
 */
export function parseQuery(text: string): unknown {
  if (text.trim() === "") return {};
  let i = 0;
  const syntax = (expected: string): never => {
    throw new QueryError(t("query.errSyntax", { pos: i + 1, expected }));
  };
  const skip = () => {
    while (i < text.length && /\s/.test(text[i]!)) i += 1;
  };

  const quoted = (): string => {
    const quote = text[i]!;
    i += 1;
    let out = "";
    while (i < text.length && text[i] !== quote) {
      if (text[i] === "\\") {
        const next = text[i + 1];
        i += 1;
        if (next === "n") out += "\n";
        else if (next === "t") out += "\t";
        else if (next === "r") out += "\r";
        else if (next === "u" && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) {
          out += String.fromCharCode(parseInt(text.slice(i + 1, i + 5), 16));
          i += 4;
        } else if (next !== undefined) out += next;
      } else out += text[i];
      i += 1;
    }
    if (i >= text.length) syntax(quote);
    i += 1;
    return out;
  };

  const regex = (): RegExp => {
    i += 1;
    const start = i;
    let inClass = false;
    while (i < text.length && (text[i] !== "/" || inClass)) {
      if (text[i] === "\\") i += 1;
      else if (text[i] === "[") inClass = true;
      else if (text[i] === "]") inClass = false;
      i += 1;
    }
    if (i >= text.length) syntax("/");
    const pattern = text.slice(start, i);
    i += 1;
    const flagsStart = i;
    while (i < text.length && /[a-z]/.test(text[i]!)) i += 1;
    // "g" and "y" make a RegExp remember where it stopped, which would change results between documents.
    const flags = text.slice(flagsStart, i).replace(/[gy]/g, "");
    if (pattern.length > MAX_REGEX_LENGTH) {
      throw new QueryError(t("query.errRegexLong", { max: MAX_REGEX_LENGTH }));
    }
    try {
      return new RegExp(pattern, flags);
    } catch (error) {
      throw new QueryError(
        t("query.errRegex", { reason: error instanceof Error ? error.message : String(error) }),
      );
    }
  };

  const value = (depth: number): unknown => {
    if (depth > MAX_DEPTH) throw new QueryError(t("query.errDeep"));
    skip();
    const char = text[i];
    if (char === "{") {
      i += 1;
      const out: Record<string, unknown> = {};
      for (;;) {
        skip();
        if (text[i] === "}") {
          i += 1;
          return out;
        }
        let key: string;
        if (text[i] === '"' || text[i] === "'") key = quoted();
        else {
          const match = /^[A-Za-z0-9_$.]+/.exec(text.slice(i));
          if (!match) return syntax(t("query.expKey"));
          key = match[0];
          i += key.length;
        }
        skip();
        if (text[i] !== ":") syntax(":");
        i += 1;
        setOwn(out, key, value(depth + 1));
        skip();
        if (text[i] === ",") i += 1;
        else if (text[i] !== "}") syntax("} ,");
      }
    }
    if (char === "[") {
      i += 1;
      const out: unknown[] = [];
      for (;;) {
        skip();
        if (text[i] === "]") {
          i += 1;
          return out;
        }
        out.push(value(depth + 1));
        skip();
        if (text[i] === ",") i += 1;
        else if (text[i] !== "]") syntax("] ,");
      }
    }
    if (char === '"' || char === "'") return quoted();
    if (char === "/") return regex();
    const number = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(text.slice(i));
    if (number) {
      i += number[0].length;
      return Number(number[0]);
    }
    for (const [word, result] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ] as const) {
      if (text.startsWith(word, i) && !/[\w$]/.test(text[i + word.length] ?? "")) {
        i += word.length;
        return result;
      }
    }
    return syntax(t("query.expValue"));
  };

  const result = value(0);
  skip();
  if (i < text.length) syntax(t("query.expEnd"));
  return result;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => hasOwn(b, key) && deepEqual(a[key], b[key]))
    );
  }
  return false;
}

/** Values a dotted path can mean on a document, following arrays the way MongoDB does. */
function collect(value: unknown, parts: readonly string[], out: unknown[]): boolean {
  if (parts.length === 0) {
    out.push(value);
    if (Array.isArray(value)) out.push(...value);
    return true;
  }
  const [head, ...rest] = parts as [string, ...string[]];
  let found = false;
  if (Array.isArray(value)) {
    if (/^\d+$/.test(head) && Number(head) < value.length) {
      found = collect(value[Number(head)], rest, out) || found;
    }
    for (const item of value) {
      if (isObject(item)) found = collect(item, parts, out) || found;
    }
  } else if (isObject(value) && hasOwn(value, head)) {
    found = collect(value[head], rest, out);
  }
  return found;
}

/** Order rank of a value's type; values only compare with the same rank. */
const rank = (value: unknown): number =>
  value === null || value === undefined
    ? 0
    : typeof value === "number"
      ? 1
      : typeof value === "string"
        ? 2
        : typeof value === "boolean"
          ? 5
          : Array.isArray(value)
            ? 4
            : 3;

/** -1, 0 or 1 for two values of the same rank; null for different ranks. */
function compare(a: unknown, b: unknown): number | null {
  if (rank(a) !== rank(b)) return null;
  return a === b ? 0 : (a as number | string | boolean) < (b as number | string | boolean) ? -1 : 1;
}

export { compare, rank };

const OPERAND = (op: string, expected: string): never => {
  throw new QueryError(t("query.errOperand", { op, expected }));
};

function isOperatorObject(value: unknown): value is Record<string, unknown> {
  return (
    isObject(value) &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every((k) => k.startsWith("$"))
  );
}

function equals(candidates: readonly unknown[], exists: boolean, wanted: unknown): boolean {
  if (wanted instanceof RegExp) {
    return candidates.some((v) => typeof v === "string" && wanted.test(v));
  }
  if (wanted === null) return !exists || candidates.some((v) => v === null);
  return candidates.some((v) => deepEqual(v, wanted));
}

function matchCondition(candidates: readonly unknown[], exists: boolean, cond: unknown): boolean {
  if (!isOperatorObject(cond)) return equals(candidates, exists, cond);
  for (const [op, operand] of Object.entries(cond)) {
    switch (op) {
      case "$eq":
        if (!equals(candidates, exists, operand)) return false;
        break;
      case "$ne":
        if (equals(candidates, exists, operand)) return false;
        break;
      case "$gt":
      case "$gte":
      case "$lt":
      case "$lte": {
        const pass = candidates.some((v) => {
          const order = compare(v, operand);
          if (order === null || ![1, 2, 5].includes(rank(v))) return false;
          return op === "$gt"
            ? order > 0
            : op === "$gte"
              ? order >= 0
              : op === "$lt"
                ? order < 0
                : order <= 0;
        });
        if (!pass) return false;
        break;
      }
      case "$in":
      case "$nin": {
        if (!Array.isArray(operand)) OPERAND(op, t("query.expArray"));
        const hit = (operand as unknown[]).some((wanted) => equals(candidates, exists, wanted));
        if (hit !== (op === "$in")) return false;
        break;
      }
      case "$exists":
        if (typeof operand !== "boolean" && typeof operand !== "number") OPERAND(op, "true/false");
        if (exists !== Boolean(operand)) return false;
        break;
      case "$regex": {
        const options = typeof cond.$options === "string" ? cond.$options.replace(/[gy]/g, "") : "";
        let re: RegExp;
        if (operand instanceof RegExp) re = options ? new RegExp(operand.source, options) : operand;
        else if (typeof operand === "string") {
          if (operand.length > MAX_REGEX_LENGTH) {
            throw new QueryError(t("query.errRegexLong", { max: MAX_REGEX_LENGTH }));
          }
          try {
            re = new RegExp(operand, options);
          } catch (error) {
            throw new QueryError(
              t("query.errRegex", {
                reason: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        } else return OPERAND(op, t("query.expString"));
        if (!candidates.some((v) => typeof v === "string" && re.test(v))) return false;
        break;
      }
      case "$options":
        if (!hasOwn(cond, "$regex")) OPERAND(op, "$regex");
        break;
      case "$not":
        if (!(operand instanceof RegExp) && !isOperatorObject(operand)) {
          OPERAND(op, t("query.expOperatorOrRegex"));
        }
        if (matchCondition(candidates, exists, operand)) return false;
        break;
      case "$size":
        if (typeof operand !== "number") OPERAND(op, t("query.expNumber"));
        if (!candidates.some((v) => Array.isArray(v) && v.length === operand)) return false;
        break;
      case "$all": {
        if (!Array.isArray(operand)) OPERAND(op, t("query.expArray"));
        if (!(operand as unknown[]).every((wanted) => equals(candidates, exists, wanted))) {
          return false;
        }
        break;
      }
      case "$elemMatch": {
        if (!isObject(operand)) OPERAND(op, t("query.expObject"));
        const test = (item: unknown) =>
          isOperatorObject(operand)
            ? matchCondition([item], true, operand)
            : isObject(item) && matchDocument(item, operand as Record<string, unknown>);
        if (!candidates.some((v) => Array.isArray(v) && v.some(test))) return false;
        break;
      }
      default:
        throw new QueryError(t("query.errOperator", { op }));
    }
  }
  return true;
}

/** True when the document satisfies the filter (a parsed Compass-style object). */
export function matchDocument(doc: unknown, filter: Record<string, unknown>): boolean {
  for (const [key, cond] of Object.entries(filter)) {
    if (key === "$and" || key === "$or" || key === "$nor") {
      if (!Array.isArray(cond) || !cond.every(isObject)) OPERAND(key, t("query.expObjectList"));
      const parts = cond as Array<Record<string, unknown>>;
      const some = parts.some((part) => matchDocument(doc, part));
      if (
        key === "$and"
          ? !parts.every((part) => matchDocument(doc, part))
          : key === "$or"
            ? !some
            : some
      ) {
        return false;
      }
    } else if (key.startsWith("$")) {
      throw new QueryError(t("query.errOperator", { op: key }));
    } else {
      const candidates: unknown[] = [];
      const exists = collect(doc, key.split("."), candidates);
      if (!matchCondition(candidates, exists, cond)) return false;
    }
  }
  return true;
}
