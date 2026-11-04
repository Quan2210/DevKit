/** A location in a JSON document: object keys and array indexes from the root. Root is `[]`. */
export type Path = ReadonlyArray<string | number>;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** `sections[0].type`; keys that are not identifiers use `["a.b"]`. The root is `$`. */
export function formatPath(path: Path): string {
  if (path.length === 0) return "$";
  let out = "";
  path.forEach((segment, index) => {
    if (typeof segment === "number") out += `[${segment}]`;
    else if (IDENTIFIER.test(segment)) out += index === 0 ? segment : `.${segment}`;
    else out += `[${JSON.stringify(segment)}]`;
  });
  return out;
}

export type PathParse = { ok: true; value: Path } | { ok: false; reason: string };

const bad = (reason: string): PathParse => ({ ok: false, reason });

/** Inverse of `formatPath`. Accepts an optional leading `$`, `.key`, `[0]`, `["key"]` and `['key']`. */
export function parsePath(input: string): PathParse {
  const text = input.trim();
  const segments: Array<string | number> = [];
  let i = text.startsWith("$") ? 1 : 0;
  let first = i === 0;
  while (i < text.length) {
    const char = text[i]!;
    if (char === "[") {
      const close = text.indexOf("]", i);
      if (close === -1) return bad("missing ]");
      const inner = text.slice(i + 1, close).trim();
      if (/^\d+$/.test(inner)) {
        segments.push(Number(inner));
        i = close + 1;
      } else if (inner.startsWith('"') || inner.startsWith("'")) {
        // A quoted key may contain "]", so find the matching closing quote first.
        const quote = inner[0]!;
        let j = i + 1;
        while (text[j] === " ") j += 1;
        let key = "";
        j += 1;
        let closed = false;
        for (; j < text.length; j += 1) {
          const c = text[j]!;
          if (c === "\\" && j + 1 < text.length) {
            key += text[j + 1];
            j += 1;
          } else if (c === quote) {
            closed = true;
            break;
          } else key += c;
        }
        if (!closed) return bad("unterminated key");
        j += 1;
        while (text[j] === " ") j += 1;
        if (text[j] !== "]") return bad("missing ]");
        segments.push(key);
        i = j + 1;
      } else return bad("bad index");
    } else if (char === ".") {
      const match = /^[^.[\]]+/.exec(text.slice(i + 1));
      if (!match) return bad("empty key");
      segments.push(match[0]);
      i += 1 + match[0].length;
    } else if (first) {
      const match = /^[^.[\]]+/.exec(text.slice(i));
      if (!match) return bad("empty key");
      segments.push(match[0]);
      i += match[0].length;
    } else return bad(`unexpected ${char}`);
    first = false;
  }
  return { ok: true, value: segments };
}

/** The value at `path`, or `undefined` when the path does not exist. */
export function getAt(value: unknown, path: Path): unknown {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object") return undefined;
    if (typeof segment === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
    } else {
      if (Array.isArray(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
  }
  return current;
}

const WHITESPACE = new Set([" ", "\t", "\r", "\n"]);

interface Visitor {
  /** A key was read (before its value). `start`/`end` are the offsets of the quoted key. */
  key?: (path: Path, start: number, end: number) => void;
  /** A value finished (children before parents). `start`/`end` are its offsets. */
  value?: (path: Path, start: number, end: number) => void;
}

/** Walk valid JSON text, reporting keys and values with their offsets. False when it is not valid. */
function walk(text: string, visitor: Visitor): boolean {
  let i = 0;
  const fail = (): never => {
    throw new SyntaxError("invalid");
  };
  const skip = () => {
    while (i < text.length && WHITESPACE.has(text[i]!)) i += 1;
  };
  const string = (): string => {
    const start = i;
    if (text[i] !== '"') fail();
    i += 1;
    while (i < text.length && text[i] !== '"') {
      if (text[i] === "\\") i += 1;
      i += 1;
    }
    if (i >= text.length) fail();
    i += 1;
    return JSON.parse(text.slice(start, i)) as string;
  };
  const value = (path: Path): void => {
    skip();
    const start = i;
    const char = text[i];
    if (char === "{") {
      i += 1;
      skip();
      if (text[i] === "}") i += 1;
      else {
        for (;;) {
          skip();
          const keyStart = i;
          const key = string();
          visitor.key?.([...path, key], keyStart, i);
          skip();
          if (text[i] !== ":") fail();
          i += 1;
          value([...path, key]);
          skip();
          if (text[i] === ",") i += 1;
          else if (text[i] === "}") {
            i += 1;
            break;
          } else fail();
        }
      }
    } else if (char === "[") {
      i += 1;
      skip();
      if (text[i] === "]") i += 1;
      else {
        for (let index = 0; ; index += 1) {
          value([...path, index]);
          skip();
          if (text[i] === ",") i += 1;
          else if (text[i] === "]") {
            i += 1;
            break;
          } else fail();
        }
      }
    } else if (char === '"') {
      string();
    } else {
      const match = /^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i));
      if (!match) fail();
      i += match![0].length;
    }
    visitor.value?.(path, start, i);
  };
  try {
    value([]);
    skip();
    return i === text.length;
  } catch {
    return false;
  }
}

/**
 * The path of the node under `offset` in valid JSON text: a key or value under the caret, or the
 * container when the caret is between members. Null when the text is not valid JSON.
 */
export function pathAtOffset(text: string, offset: number): Path | null {
  let found: Path | null = null;
  // Children finish first, so the deepest node containing the offset wins.
  const valid = walk(text, {
    key: (path, start, end) => {
      if (found === null && offset >= start && offset <= end) found = path;
    },
    value: (path, start, end) => {
      if (found === null && offset >= start && offset <= end) found = path;
    },
  });
  return valid ? found : null;
}

const samePath = (a: Path, b: Path) => a.length === b.length && a.every((s, i) => s === b[i]);

/** Offset where the value at `path` starts, or null when the text is invalid or has no such path. */
export function offsetOfPath(text: string, path: Path): number | null {
  let found: number | null = null;
  const valid = walk(text, {
    value: (at, start) => {
      if (found === null && samePath(at, path)) found = start;
    },
  });
  return valid ? found : null;
}
