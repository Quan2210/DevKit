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
  const offset = findErrorOffset(text);
  return offset === undefined ? extractPosition(detail, text) : locate(text, offset);
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

/** Parse and pretty-print. Values are preserved; number spelling is normalised (1.0 becomes 1). */
export function formatJson(text: string, indent: JsonIndent): Result<string, ToolError> {
  const parsed = parseJson(text);
  return parsed.ok ? ok(JSON.stringify(parsed.value, null, indent)) : parsed;
}

export function minifyJson(text: string): Result<string, ToolError> {
  const parsed = parseJson(text);
  return parsed.ok ? ok(JSON.stringify(parsed.value)) : parsed;
}

const NUMBER = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Integer literals outside strings that JSON.parse cannot represent exactly. Formatting such a
 * document would silently change them, so the UI warns instead (PRD 3.1 limit, risk R6).
 */
export function findUnsafeIntegers(text: string): string[] {
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
      if (/^-?\d+$/.test(literal)) {
        const magnitude = BigInt(literal.replace("-", ""));
        if (magnitude > MAX_SAFE && !found.includes(literal)) found.push(literal);
      }
    }
  }
  return found;
}
