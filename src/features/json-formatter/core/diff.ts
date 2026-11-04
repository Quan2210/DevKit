/**
 * Structural JSON comparison. Objects compare by key (order is ignored), arrays by index.
 * Each difference carries the path, so the UI can mark the matching node in either tree.
 */
import { ancestorIds, idOfPath } from "../../data-tools/model";
import type { DiffKind, DiffMarks } from "../../data-tools/types";

export type { DiffKind };

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

/** Marks for the Tree view of each side. A value missing on one side is marked only on the other. */
export function treeMarks(diffs: ReadonlyArray<JsonDiff>): { left: DiffMarks; right: DiffMarks } {
  const side = (): { marks: Map<string, DiffKind>; containers: Set<string> } => ({
    marks: new Map(),
    containers: new Set(),
  });
  const left = side();
  const right = side();
  const put = (target: ReturnType<typeof side>, path: JsonDiff["path"], kind: DiffKind) => {
    target.marks.set(idOfPath(path), kind);
    for (const id of ancestorIds(path)) target.containers.add(id);
  };
  for (const diff of diffs) {
    if (diff.kind !== "added") put(left, diff.path, diff.kind);
    if (diff.kind !== "removed") put(right, diff.path, diff.kind);
  }
  return { left, right };
}
