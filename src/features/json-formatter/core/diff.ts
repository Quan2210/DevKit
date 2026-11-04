/**
 * Structural JSON comparison. Objects compare by key (order is ignored), arrays by index.
 * Each difference carries the path, so the UI can mark the matching line in either text.
 */
export type DiffKind = "added" | "removed" | "changed";

export interface JsonDiff {
  /** Path segments from the root; numbers are array indexes. */
  path: ReadonlyArray<string | number>;
  /** `removed`: only in the left text, `added`: only in the right text. */
  kind: DiffKind;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const MAX_DIFFS = 500;

export function diffJson(left: unknown, right: unknown): JsonDiff[] {
  const out: JsonDiff[] = [];
  const walk = (a: unknown, b: unknown, path: Array<string | number>): void => {
    if (out.length >= MAX_DIFFS) return;
    if (Array.isArray(a) && Array.isArray(b)) {
      for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
        if (i >= a.length) out.push({ path: [...path, i], kind: "added" });
        else if (i >= b.length) out.push({ path: [...path, i], kind: "removed" });
        else walk(a[i], b[i], [...path, i]);
      }
    } else if (isObject(a) && isObject(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const key of keys) {
        const inA = Object.prototype.hasOwnProperty.call(a, key);
        const inB = Object.prototype.hasOwnProperty.call(b, key);
        if (!inB) out.push({ path: [...path, key], kind: "removed" });
        else if (!inA) out.push({ path: [...path, key], kind: "added" });
        else walk(a[key], b[key], [...path, key]);
      }
    } else if (!Object.is(a, b)) {
      out.push({ path, kind: "changed" });
    }
  };
  walk(left, right, []);
  return out;
}

const keyOf = (path: ReadonlyArray<string | number>): string => JSON.stringify(path);

/**
 * 1-based line where each value (and each object key) starts in `text`. The text must be valid JSON;
 * paths missing from the map simply have no line to mark.
 */
export function indexLines(text: string): Map<string, number> {
  const lines = new Map<string, number>();
  let i = 0;
  let line = 1;
  const skip = () => {
    while (i < text.length && " \t\n\r".includes(text[i]!)) {
      if (text[i] === "\n") line += 1;
      i += 1;
    }
  };
  const string = (): string => {
    const start = i;
    i += 1;
    while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
    i += 1;
    return JSON.parse(text.slice(start, i)) as string;
  };
  const value = (path: Array<string | number>, at: number): void => {
    skip();
    lines.set(keyOf(path), at === 0 ? line : at);
    const char = text[i];
    if (char === "{") {
      i += 1;
      skip();
      if (text[i] === "}") {
        i += 1;
        return;
      }
      for (;;) {
        skip();
        const keyLine = line;
        const key = string();
        skip();
        i += 1; // colon
        value([...path, key], keyLine);
        skip();
        if (text[i] === ",") i += 1;
        else {
          i += 1; // closing brace
          return;
        }
      }
    } else if (char === "[") {
      i += 1;
      skip();
      if (text[i] === "]") {
        i += 1;
        return;
      }
      for (let index = 0; ; index += 1) {
        value([...path, index], 0);
        skip();
        if (text[i] === ",") i += 1;
        else {
          i += 1; // closing bracket
          return;
        }
      }
    } else if (char === '"') {
      string();
    } else {
      while (i < text.length && !",]} \t\n\r".includes(text[i]!)) i += 1;
    }
  };
  try {
    value([], 0);
  } catch {
    return lines;
  }
  return lines;
}

export interface LineMark {
  line: number;
  kind: DiffKind;
}

/** Lines to highlight in each text; a value missing on one side is marked only on the other. */
export function markLines(
  diffs: ReadonlyArray<JsonDiff>,
  leftText: string,
  rightText: string,
): { left: LineMark[]; right: LineMark[] } {
  const leftLines = indexLines(leftText);
  const rightLines = indexLines(rightText);
  const left: LineMark[] = [];
  const right: LineMark[] = [];
  for (const diff of diffs) {
    const key = keyOf(diff.path);
    const l = leftLines.get(key);
    const r = rightLines.get(key);
    if (diff.kind !== "added" && l !== undefined) left.push({ line: l, kind: diff.kind });
    if (diff.kind !== "removed" && r !== undefined) right.push({ line: r, kind: diff.kind });
  }
  return { left, right };
}
