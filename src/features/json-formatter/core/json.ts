import { DEFAULT_LOCALE, translate, type MessageKey, type MessageParams } from "../../../i18n";
import { fail, ok, type Result, type ToolError } from "../../../lib/result";

export type JsonIndent = 2 | 4;

const t = (key: MessageKey, params?: MessageParams): string =>
  translate(DEFAULT_LOCALE, key, params);

/** 1-based line and column of a UTF-16 offset. */
export function locate(text: string, offset: number): { line: number; column: number } {
  const lines = text.slice(0, offset).split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

/**
 * Engines word parse errors differently: V8 "... at position 8 (line 1 column 9)",
 * Firefox "... at line 1 column 9 of the JSON data", Safari gives no position at all.
 */
export function extractPosition(message: string, text: string): ToolError["position"] {
  const lineColumn = message.match(/line (\d+) column (\d+)/i);
  if (lineColumn) return { line: Number(lineColumn[1]), column: Number(lineColumn[2]) };
  const offset = message.match(/position (\d+)/i);
  if (offset) return locate(text, Number(offset[1]));
  return undefined;
}

const NUMBER_STRICT = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

/**
 * Offset of the first character that makes `text` invalid JSON, or undefined when it is valid.
 * Engines disagree (modern V8 often gives no position at all), so errors are located by this
 * small strict scanner and the engine's own position is only a fallback.
 */
export function findErrorOffset(text: string): number | undefined {
  let i = 0;
  let bad = -1;
  const fail = (at = i): false => {
    if (bad < 0) bad = at;
    return false;
  };
  const skipWhitespace = () => {
    while (i < text.length && " \t\n\r".includes(text[i]!)) i += 1;
  };

  const string = (): boolean => {
    i += 1; // opening quote
    while (i < text.length) {
      const char = text[i]!;
      if (char === '"') {
        i += 1;
        return true;
      }
      if (char < " ") return fail(); // raw control characters are not allowed in strings
      if (char === "\\") {
        const next = text[i + 1];
        if (next !== undefined && '"\\/bfnrt'.includes(next)) i += 2;
        else if (next === "u" && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) i += 6;
        else return fail(i);
      } else i += 1;
    }
    return fail(text.length); // unterminated string
  };

  const number = (): boolean => {
    NUMBER_STRICT.lastIndex = i;
    const match = NUMBER_STRICT.exec(text);
    if (!match) return fail();
    i += match[0].length;
    return true;
  };

  const value = (): boolean => {
    skipWhitespace();
    const char = text[i];
    if (char === "{") return object();
    if (char === "[") return array();
    if (char === '"') return string();
    if (char === "-" || (char !== undefined && char >= "0" && char <= "9")) return number();
    for (const literal of ["true", "false", "null"]) {
      if (text.startsWith(literal, i)) {
        i += literal.length;
        return true;
      }
    }
    return fail();
  };

  const object = (): boolean => {
    i += 1;
    skipWhitespace();
    if (text[i] === "}") {
      i += 1;
      return true;
    }
    for (;;) {
      skipWhitespace();
      if (text[i] !== '"') return fail();
      if (!string()) return false;
      skipWhitespace();
      if (text[i] !== ":") return fail();
      i += 1;
      if (!value()) return false;
      skipWhitespace();
      if (text[i] === ",") {
        i += 1;
        continue;
      }
      if (text[i] === "}") {
        i += 1;
        return true;
      }
      return fail();
    }
  };

  const array = (): boolean => {
    i += 1;
    skipWhitespace();
    if (text[i] === "]") {
      i += 1;
      return true;
    }
    for (;;) {
      if (!value()) return false;
      skipWhitespace();
      if (text[i] === ",") {
        i += 1;
        continue;
      }
      if (text[i] === "]") {
        i += 1;
        return true;
      }
      return fail();
    }
  };

  if (!value()) return bad;
  skipWhitespace();
  return i < text.length ? i : undefined;
}

/** Scanner first (same answer in every browser), then whatever position the engine reported. */
function positionOf(text: string, detail: string): ToolError["position"] {
  try {
    const offset = findErrorOffset(text);
    if (offset !== undefined) return locate(text, offset);
  } catch {
    // The scanner recurses; absurdly deep nesting overflows the stack. Fall back to the engine.
  }
  return extractPosition(detail, text);
}

export function parseJson(text: string): Result<unknown, ToolError> {
  if (text.trim() === "") return fail({ kind: "validation", message: t("json.empty") });
  try {
    return ok(JSON.parse(text));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return fail({
      kind: "validation",
      message: t("json.invalid"),
      detail,
      position: positionOf(text, detail),
    });
  }
}

/** `JSON.stringify` recurses, so a valid but absurdly deep document throws RangeError. */
function stringify(value: unknown, indent?: JsonIndent): Result<string, ToolError> {
  try {
    return ok(JSON.stringify(value, null, indent));
  } catch {
    return fail({ kind: "processing", message: t("json.tooDeep") });
  }
}

export type SortOrder = "asc" | "desc";

/** Recursively order object keys; arrays keep their order. Keys compare by code point, not locale. */
export function sortKeys(value: unknown, order: SortOrder): unknown {
  if (Array.isArray(value)) return value.map((item) => sortKeys(item, order));
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      order === "asc" ? (a < b ? -1 : a > b ? 1 : 0) : a < b ? 1 : a > b ? -1 : 0,
    );
    const sorted: Record<string, unknown> = {};
    for (const [key, item] of entries) {
      // defineProperty keeps a "__proto__" key as data instead of changing the prototype
      Object.defineProperty(sorted, key, {
        value: sortKeys(item, order),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return sorted;
  }
  return value;
}

function prepare(text: string, sort?: SortOrder): Result<unknown, ToolError> {
  const parsed = parseJson(text);
  return parsed.ok && sort ? ok(sortKeys(parsed.value, sort)) : parsed;
}

/** Parse and pretty-print. Values are preserved; number spelling is normalised (1.0 becomes 1). */
export function formatJson(
  text: string,
  indent: JsonIndent,
  sort?: SortOrder,
): Result<string, ToolError> {
  const parsed = prepare(text, sort);
  return parsed.ok ? stringify(parsed.value, indent) : parsed;
}

export function minifyJson(text: string, sort?: SortOrder): Result<string, ToolError> {
  const parsed = prepare(text, sort);
  return parsed.ok ? stringify(parsed.value) : parsed;
}

const NUMBER = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

/** Canonical "<sign><digits>e<exponent>" so two spellings of one decimal compare equal. */
function canonical(literal: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(literal);
  if (!match) return literal;
  const [, sign, whole, fraction = "", exponent = "0"] = match;
  const digits = (whole + fraction).replace(/^0+/, "");
  if (digits === "") return "0";
  const trimmed = digits.replace(/0+$/, "");
  return `${sign}${trimmed}e${Number(exponent) - fraction.length + (digits.length - trimmed.length)}`;
}

/**
 * Number literals outside strings that JSON.parse cannot represent exactly (too many significant
 * digits, or beyond the 64-bit float range such as 1e999). Formatting such a document would
 * silently change them, so the UI warns instead (PRD 3.1 limit, risk R6). Spelling-only changes
 * (1.0, 1e3) are not warnings because the value is the same.
 */
export function findLossyNumbers(text: string): string[] {
  const found: string[] = [];
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (inString) {
      if (char === "\\") i += 1;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "-" || (char >= "0" && char <= "9")) {
      NUMBER.lastIndex = i;
      const literal = NUMBER.exec(text)?.[0];
      if (!literal) continue;
      i += literal.length - 1;
      if (canonical(literal) !== canonical(String(Number(literal))) && !found.includes(literal)) {
        found.push(literal);
      }
    }
  }
  return found;
}
