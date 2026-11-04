import { describe, expect, it } from "vitest";
import { diffJson, treeMarks } from "./diff";
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

describe("treeMarks", () => {
  const left = { a: 1, b: { c: 2, gone: true }, list: [1, 2] };
  const right = { a: 1, b: { c: 3 }, list: [1, 2, 3], extra: "x" };
  const marks = treeMarks(diffJson(left, right));

  it("marks changed values on both sides and the containers that hold them", () => {
    expect(marks.left.marks.get("$.b.c")).toBe("changed");
    expect(marks.right.marks.get("$.b.c")).toBe("changed");
    expect([...marks.left.containers].sort()).toEqual(["$", "$.b"]);
    expect([...marks.right.containers].sort()).toEqual(["$", "$.b", "$.list"]);
  });

  it("marks a value that exists on one side only, on that side only", () => {
    expect(marks.left.marks.get("$.b.gone")).toBe("removed");
    expect(marks.right.marks.has("$.b.gone")).toBe(false);
    expect(marks.right.marks.get("$.extra")).toBe("added");
    expect(marks.left.marks.has("$.extra")).toBe(false);
    expect(marks.right.marks.get("$.list[2]")).toBe("added");
  });

  it("has nothing to mark for equal documents", () => {
    const none = treeMarks(diffJson(left, left));
    expect(none.left.marks.size + none.right.marks.size).toBe(0);
    expect(none.left.containers.size).toBe(0);
  });
});
