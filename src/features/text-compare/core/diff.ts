/**
 * Pure helpers for Text Compare: how the two texts are compared (case, whitespace, precision) and how
 * the changed chunks are counted. The comparison itself is done by `@codemirror/merge`; this module only
 * gives it a diff function and reads its result, so it has no DOM and is easy to test.
 */
import { Change, diff, type DiffConfig } from "@codemirror/merge";

export type Precision = "smart" | "word" | "char";

export interface DiffOptions {
  ignoreCase: boolean;
  /** Spaces, tabs and other horizontal whitespace do not count; line breaks still do. */
  ignoreWhitespace: boolean;
  precision: Precision;
}

export const DEFAULT_OPTIONS: DiffOptions = {
  ignoreCase: false,
  ignoreWhitespace: false,
  precision: "smart",
};

/** A full diff is abandoned for a rough one beyond this many changed characters (the library default is 500). */
const SCAN_LIMIT = 5000;
/** A diff that takes longer than this (ms) falls back to a rougher one instead of freezing the page. */
const TIMEOUT_MS = 1500;
/** How far a change is widened to the word around it; keeps one-word expansion from running away. */
const MAX_WORD = 64;

/** Normalise line endings, so a CRLF file does not differ from the same text with LF. */
export function normalizeEol(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

const HORIZONTAL_SPACE = /[^\S\n]/;
const WORD_CHAR = /[\p{L}\p{N}_]/u;

/** Lower-case that never changes the length (a few characters grow when lower-cased; those stay as is). */
function foldCase(text: string): string {
  let out = "";
  for (const char of text) {
    const lower = char.toLowerCase();
    out += lower.length === char.length ? lower : char;
  }
  return out;
}

interface Folded {
  text: string;
  /** For each kept character, its offset in the original; one extra entry for the end. `null` when nothing was dropped. */
  map: number[] | null;
}

function fold(text: string, options: DiffOptions): Folded {
  const base = options.ignoreCase ? foldCase(text) : text;
  if (!options.ignoreWhitespace) return { text: base, map: null };
  let out = "";
  const map: number[] = [];
  for (let i = 0; i < base.length; i += 1) {
    const char = base[i]!;
    if (HORIZONTAL_SPACE.test(char)) continue;
    out += char;
    map.push(i);
  }
  map.push(base.length);
  return { text: out, map };
}

/** Where a position in the folded text sits in the original. */
const back = (map: number[] | null, pos: number): number => (map ? (map[pos] ?? 0) : pos);

/** The end of a changed range: just after the last kept character, so trailing ignored space stays out. */
function backEnd(map: number[] | null, from: number, to: number): number {
  if (!map || to <= from) return back(map, to);
  return (map[to - 1] ?? 0) + 1;
}

/** Widen each change to whole words, then join changes that now touch or overlap. */
function toWords(changes: readonly Change[], a: string, b: string): Change[] {
  const widened = changes.map((change) => {
    let { fromA, toA, fromB, toB } = change;
    for (
      let n = 0;
      n < MAX_WORD &&
      fromA > 0 &&
      fromB > 0 &&
      WORD_CHAR.test(a[fromA - 1]!) &&
      a[fromA - 1] === b[fromB - 1];
      n += 1
    ) {
      fromA -= 1;
      fromB -= 1;
    }
    for (
      let n = 0;
      n < MAX_WORD &&
      toA < a.length &&
      toB < b.length &&
      WORD_CHAR.test(a[toA]!) &&
      a[toA] === b[toB];
      n += 1
    ) {
      toA += 1;
      toB += 1;
    }
    return new Change(fromA, toA, fromB, toB);
  });
  const merged: Change[] = [];
  for (const change of widened) {
    const last = merged[merged.length - 1];
    if (last && (change.fromA <= last.toA || change.fromB <= last.toB)) {
      merged[merged.length - 1] = new Change(
        last.fromA,
        Math.max(last.toA, change.toA),
        last.fromB,
        Math.max(last.toB, change.toB),
      );
    } else {
      merged.push(change);
    }
  }
  return merged;
}

/** Lines keep their own line break, so a hunk's text starts and ends on the same boundary in both texts. */
function splitLines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

/** A changed run of lines: `[aFrom, aTo)` in the first text against `[bFrom, bTo)` in the second. */
type Hunk = readonly [aFrom: number, aTo: number, bFrom: number, bTo: number];

/** More than this many differing lines and the line diff gives up (the whole middle is one hunk). */
const MAX_LINE_EDITS = 2000;

/** Myers' O(ND) diff of two arrays of ids, as hunks; `null` when it needs more than `MAX_LINE_EDITS` edits. */
function myers(a: number[], b: number[]): Hunk[] | null {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) return n + m === 0 ? [] : [[0, n, 0, m]];
  const limit = Math.min(n + m, MAX_LINE_EDITS);
  const offset = limit + 1;
  const v = new Int32Array(2 * limit + 3);
  const trace: Array<{ base: number; values: Int32Array }> = [];
  let found = false;
  for (let d = 0; d <= limit && !found; d += 1) {
    trace.push({ base: offset - d - 1, values: v.slice(offset - d - 1, offset + d + 2) });
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!)
          ? v[offset + k + 1]!
          : v[offset + k - 1]! + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x += 1;
        y += 1;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = true;
        break;
      }
    }
  }
  if (!found) return null;

  const deleted = new Uint8Array(n);
  const inserted = new Uint8Array(m);
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d > 0; d -= 1) {
    const { base, values } = trace[d]!;
    const at = (k: number) => values[offset + k - base]!;
    const k = x - y;
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      x -= 1;
      y -= 1;
    }
    if (x === prevX) inserted[prevY] = 1;
    else deleted[prevX] = 1;
    x = prevX;
    y = prevY;
  }

  const hunks: Hunk[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && !deleted[i] && !inserted[j]) {
      i += 1;
      j += 1;
      continue;
    }
    const aFrom = i;
    const bFrom = j;
    while (i < n && deleted[i]) i += 1;
    while (j < m && inserted[j]) j += 1;
    hunks.push([aFrom, i, bFrom, j]);
  }
  return hunks;
}

/**
 * Line-by-line first, then character-by-character inside the lines that differ. Comparing a whole
 * large text character by character gives up and marks everything changed; this does not.
 */
function lineThenChar(a: string, b: string, base: DiffConfig): Change[] {
  const linesA = splitLines(a);
  const linesB = splitLines(b);
  const ids = new Map<string, number>();
  const idOf = (line: string) => {
    let id = ids.get(line);
    if (id === undefined) {
      id = ids.size;
      ids.set(line, id);
    }
    return id;
  };
  const idsA = linesA.map(idOf);
  const idsB = linesB.map(idOf);

  let head = 0;
  while (head < idsA.length && head < idsB.length && idsA[head] === idsB[head]) head += 1;
  let tailA = idsA.length;
  let tailB = idsB.length;
  while (tailA > head && tailB > head && idsA[tailA - 1] === idsB[tailB - 1]) {
    tailA -= 1;
    tailB -= 1;
  }
  const hunks = myers(idsA.slice(head, tailA), idsB.slice(head, tailB)) ?? [
    [0, tailA - head, 0, tailB - head] as Hunk,
  ];

  const startsA = [0];
  for (const line of linesA) startsA.push(startsA[startsA.length - 1]! + line.length);
  const startsB = [0];
  for (const line of linesB) startsB.push(startsB[startsB.length - 1]! + line.length);

  const changes: Change[] = [];
  for (const [aFrom, aTo, bFrom, bTo] of hunks) {
    const fromA = startsA[head + aFrom]!;
    const toA = startsA[head + aTo]!;
    const fromB = startsB[head + bFrom]!;
    const toB = startsB[head + bTo]!;
    if (fromA === toA || fromB === toB) {
      changes.push(new Change(fromA, toA, fromB, toB));
      continue;
    }
    for (const inner of diff(a.slice(fromA, toA), b.slice(fromB, toB), base)) {
      changes.push(
        new Change(fromA + inner.fromA, fromA + inner.toA, fromB + inner.fromB, fromB + inner.toB),
      );
    }
  }
  return changes;
}

/** The diff function for the given options, in the shape `@codemirror/merge` takes as `diffConfig`. */
export function diffConfigFor(options: DiffOptions): DiffConfig {
  const base: DiffConfig = { scanLimit: SCAN_LIMIT, timeout: TIMEOUT_MS };
  return {
    ...base,
    override: (a, b) => {
      const left = fold(a, options);
      const right = fold(b, options);
      const found = lineThenChar(left.text, right.text, base);
      const mapped =
        left.map || right.map
          ? found.map(
              (change) =>
                new Change(
                  back(left.map, change.fromA),
                  backEnd(left.map, change.fromA, change.toA),
                  back(right.map, change.fromB),
                  backEnd(right.map, change.fromB, change.toB),
                ),
            )
          : found;
      // "Smart" keeps what the library's own clean-up (applied after this) makes of the character diff.
      return options.precision === "word" ? toWords(mapped, a, b) : mapped;
    },
  };
}

export interface ChunkRange {
  fromA: number;
  toA: number;
  fromB: number;
  toB: number;
}

export interface DiffSummary {
  /** Number of changed blocks. */
  total: number;
  /** Blocks that exist only in the modified text. */
  added: number;
  /** Blocks that exist only in the original text. */
  removed: number;
  /** Blocks present on both sides with different content. */
  changed: number;
}

const hasLineBreak = (text: string) => text.includes("\n");

/**
 * Counts the changed blocks. A block is "added" when the original has nothing there (or the change
 * only inserts whole lines), "removed" for the mirror case, and "changed" otherwise. `original` and
 * `modified` are the texts the chunks were built from.
 */
export function summarize(
  chunks: ReadonlyArray<ChunkRange & { changes?: ReadonlyArray<ChunkRange> }>,
  original: string,
  modified: string,
): DiffSummary {
  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const chunk of chunks) {
    const a = original.slice(chunk.fromA, chunk.toA);
    const b = modified.slice(chunk.fromB, chunk.toB);
    const changes = chunk.changes ?? [];
    const onlyInserts =
      changes.length > 0 &&
      changes.every(
        (change) =>
          change.toA === change.fromA &&
          hasLineBreak(modified.slice(chunk.fromB + change.fromB, chunk.fromB + change.toB)),
      );
    const onlyDeletes =
      changes.length > 0 &&
      changes.every(
        (change) =>
          change.toB === change.fromB &&
          hasLineBreak(original.slice(chunk.fromA + change.fromA, chunk.fromA + change.toA)),
      );
    if (a.trim() === "" && b.trim() !== "") added += 1;
    else if (b.trim() === "" && a.trim() !== "") removed += 1;
    else if (onlyInserts) added += 1;
    else if (onlyDeletes) removed += 1;
    else changed += 1;
  }
  return { total: chunks.length, added, removed, changed };
}
