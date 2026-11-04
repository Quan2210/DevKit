import { describe, expect, it } from "vitest";
import { formatPath, getAt, offsetOfPath, parsePath, pathAtOffset } from "./path";

describe("formatPath / parsePath", () => {
  it.each([
    [[], "$"],
    [["a"], "a"],
    [["sections", 0, "type"], "sections[0].type"],
    [[0, "a"], "[0].a"],
    [["a.b", "c d"], '["a.b"]["c d"]'],
    [[""], '[""]'],
  ] as const)("round-trips %j", (path, text) => {
    expect(formatPath(path)).toBe(text);
    const parsed = parsePath(text);
    expect(parsed.ok && parsed.value).toEqual(path);
  });

  it("accepts a leading $, single quotes and spaces", () => {
    expect(parsePath("$.a[1]['b']")).toEqual({ ok: true, value: ["a", 1, "b"] });
    expect(parsePath('  a[ "x]y" ]  ')).toEqual({ ok: true, value: ["a", "x]y"] });
  });

  it.each(["a[", "a[x]", "a..b", "a[1", '["a]'])("rejects %s", (text) => {
    expect(parsePath(text).ok).toBe(false);
  });
});

describe("getAt", () => {
  const doc = { a: [{ b: 1 }], "x.y": 2 };
  it("follows keys and indexes", () => {
    expect(getAt(doc, ["a", 0, "b"])).toBe(1);
    expect(getAt(doc, ["x.y"])).toBe(2);
    expect(getAt(doc, [])).toBe(doc);
  });
  it("is undefined for missing paths, wrong container kinds and inherited keys", () => {
    expect(getAt(doc, ["a", 1])).toBeUndefined();
    expect(getAt(doc, ["a", "b"])).toBeUndefined();
    expect(getAt(doc, ["toString"])).toBeUndefined();
    expect(getAt(1, ["a"])).toBeUndefined();
  });
});

describe("pathAtOffset", () => {
  const text = '{"name": "x", "list": [10, {"k": true}], "e": {}}';
  const at = (needle: string, shift = 0) => pathAtOffset(text, text.indexOf(needle) + shift);

  it("finds the value under the caret", () => {
    expect(at('"x"', 1)).toEqual(["name"]);
    expect(at("10", 1)).toEqual(["list", 0]);
    expect(at("true", 2)).toEqual(["list", 1, "k"]);
  });

  it("finds a key as its member", () => {
    expect(at('"list"', 2)).toEqual(["list"]);
    expect(at('"k"', 1)).toEqual(["list", 1, "k"]);
  });

  it("returns the container between members and the root outside any value", () => {
    expect(pathAtOffset(text, 0)).toEqual([]);
    expect(at(", ", 1)).toEqual([]);
    expect(at("{}", 1)).toEqual(["e"]);
  });

  it("is null for invalid JSON, empty text and trailing text", () => {
    expect(pathAtOffset('{"a": }', 3)).toBeNull();
    expect(pathAtOffset("", 0)).toBeNull();
    expect(pathAtOffset("1 2", 0)).toBeNull();
  });
});

describe("offsetOfPath", () => {
  const text = '{"a": [1, {"b": "x"}], "c": null}';
  it("returns where the value at a path starts", () => {
    expect(offsetOfPath(text, ["a", 1, "b"])).toBe(text.indexOf('"x"'));
    expect(offsetOfPath(text, ["c"])).toBe(text.indexOf("null"));
    expect(offsetOfPath(text, [])).toBe(0);
  });
  it("is null for a missing path or invalid text", () => {
    expect(offsetOfPath(text, ["z"])).toBeNull();
    expect(offsetOfPath("{", [])).toBeNull();
  });
});
