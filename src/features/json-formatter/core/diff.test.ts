import { describe, expect, it } from "vitest";
import { diffJson, indexLines, markLines } from "./diff";
import { formatJson, sortKeys } from "./json";

describe("sortKeys", () => {
  it("orders keys deeply and keeps array order", () => {
    const sorted = sortKeys({ b: 1, a: { d: 1, c: [{ z: 1, y: 2 }] } }, "asc");
    expect(JSON.stringify(sorted)).toBe('{"a":{"c":[{"y":2,"z":1}],"d":1},"b":1}');
    expect(JSON.stringify(sortKeys({ a: 1, b: 2 }, "desc"))).toBe('{"b":2,"a":1}');
  });

  it("sorts through formatJson and leaves values alone", () => {
    const result = formatJson('{"b":2,"a":1}', 2, "asc");
    expect(result.ok && result.value).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });
});

describe("diffJson", () => {
  it("ignores key order and finds added, removed and changed values", () => {
    const diffs = diffJson({ a: 1, b: 2, c: [1, 2] }, { c: [1, 3, 4], b: 2, d: 5 });
    expect(diffs).toEqual(
      expect.arrayContaining([
        { path: ["a"], kind: "removed" },
        { path: ["d"], kind: "added" },
        { path: ["c", 1], kind: "changed" },
        { path: ["c", 2], kind: "added" },
      ]),
    );
    expect(diffs).toHaveLength(4);
  });

  it("treats equal documents as the same", () => {
    expect(diffJson({ a: [1, { b: null }] }, { a: [1, { b: null }] })).toEqual([]);
  });

  it("flags a type change", () => {
    expect(diffJson({ a: 1 }, { a: "1" })).toEqual([{ path: ["a"], kind: "changed" }]);
  });
});

describe("markLines", () => {
  const left = '{\n  "a": 1,\n  "b": {\n    "c": 2\n  }\n}';
  const right = '{\n  "a": 1,\n  "b": {\n    "c": 3\n  },\n  "d": 4\n}';

  it("indexes the line of each key", () => {
    const lines = indexLines(left);
    expect(lines.get(JSON.stringify(["a"]))).toBe(2);
    expect(lines.get(JSON.stringify(["b", "c"]))).toBe(4);
  });

  it("marks changed lines on both sides and added lines only on the right", () => {
    const marks = markLines(diffJson(JSON.parse(left), JSON.parse(right)), left, right);
    expect(marks.left).toEqual([{ line: 4, kind: "changed" }]);
    expect(marks.right).toEqual([
      { line: 4, kind: "changed" },
      { line: 6, kind: "added" },
    ]);
  });
});
