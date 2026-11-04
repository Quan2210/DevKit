import { describe, expect, it } from "vitest";
import { applyEdit, isLossy, parseEditedValue, type EditOp } from "./edit";

const run = (text: string, op: EditOp, indent: 2 | 4 = 2) => {
  const result = applyEdit(text, op, indent);
  if (!result.ok) throw new Error(result.error.message);
  return { json: JSON.parse(result.value.text), text: result.value.text, path: result.value.path };
};
const message = (text: string, op: EditOp) => {
  const result = applyEdit(text, op, 2);
  return result.ok ? null : result.error.message;
};

describe("applyEdit: setValue and changeType", () => {
  it("replaces a nested value and formats with the indent", () => {
    const out = run(
      '{"a":[{"b":1}],"c":2}',
      { type: "setValue", path: ["a", 0, "b"], value: "x" },
      4,
    );
    expect(out.json).toEqual({ a: [{ b: "x" }], c: 2 });
    expect(out.text).toContain('\n    "a"');
    expect(out.path).toEqual(["a", 0, "b"]);
  });

  it("can replace the root", () => {
    expect(run("[1]", { type: "setValue", path: [], value: 5 }).json).toBe(5);
  });

  it.each([
    ["1", "string", "1"],
    ["true", "number", 1],
    ["0", "boolean", false],
    ['"TRUE"', "boolean", true],
    ['"x"', "number", 0],
    ["5", "null", null],
    ["[1,2]", "object", { "0": 1, "1": 2 }],
    ['{"a":1,"b":2}', "array", [1, 2]],
    ["null", "object", {}],
    ["null", "array", []],
    ["{}", "string", ""],
  ] as const)("changeType %s to %s", (before, to, after) => {
    expect(run(`{"v":${before}}`, { type: "changeType", path: ["v"], to }).json.v).toEqual(after);
  });
});

describe("applyEdit: renameKey", () => {
  it("renames in place and keeps the key order", () => {
    const out = run('{"a":1,"b":2,"c":3}', { type: "renameKey", path: ["b"], key: "z" });
    expect(Object.keys(out.json)).toEqual(["a", "z", "c"]);
    expect(out.path).toEqual(["z"]);
  });
  it("refuses an existing key, the root and array items", () => {
    expect(message('{"a":1,"b":2}', { type: "renameKey", path: ["b"], key: "a" })).toMatch(
      /đã tồn tại/,
    );
    expect(message("{}", { type: "renameKey", path: [], key: "a" })).toMatch(/gốc/);
    expect(message("[1]", { type: "renameKey", path: [0], key: "a" })).toMatch(/gốc/);
  });
  it("renaming to the same key is allowed", () => {
    expect(run('{"a":1}', { type: "renameKey", path: ["a"], key: "a" }).json).toEqual({ a: 1 });
  });
});

describe("applyEdit: remove", () => {
  it("removes an array item and an object member and selects the parent", () => {
    const a = run("[1,2,3]", { type: "remove", path: [1] });
    expect(a.json).toEqual([1, 3]);
    expect(a.path).toEqual([]);
    const b = run('{"x":{"a":1,"b":2}}', { type: "remove", path: ["x", "a"] });
    expect(b.json).toEqual({ x: { b: 2 } });
    expect(b.path).toEqual(["x"]);
  });
  it("removes the only item of an array", () => {
    expect(run('{"a":[1]}', { type: "remove", path: ["a", 0] }).json).toEqual({ a: [] });
  });
  it("refuses the root and missing paths", () => {
    expect(message("{}", { type: "remove", path: [] })).toMatch(/gốc/);
    expect(message("[1]", { type: "remove", path: [3] })).toMatch(/Không tìm thấy/);
  });
});

describe("applyEdit: duplicate", () => {
  it("copies an array item right after itself", () => {
    const out = run('[{"a":1},2]', { type: "duplicate", path: [0] });
    expect(out.json).toEqual([{ a: 1 }, { a: 1 }, 2]);
    expect(out.path).toEqual([1]);
  });
  it("copies an object member under a free name, right after it", () => {
    const out = run('{"a":1,"b":2,"a_copy":9}', { type: "duplicate", path: ["a"] });
    expect(Object.keys(out.json)).toEqual(["a", "a_copy2", "b", "a_copy"]);
    expect(out.path).toEqual(["a_copy2"]);
  });
  it("the copy is independent of the original", () => {
    const out = run('[{"a":[1]}]', { type: "duplicate", path: [0] });
    expect(out.json[0]).not.toBe(out.json[1]);
  });
});

describe("applyEdit: insert", () => {
  it("adds to an array at an index or at the end", () => {
    expect(run("[1,3]", { type: "insert", parent: [], index: 1, value: 2 }).json).toEqual([
      1, 2, 3,
    ]);
    const end = run("[1]", { type: "insert", parent: [], value: 2 });
    expect(end.json).toEqual([1, 2]);
    expect(end.path).toEqual([1]);
  });
  it("adds to an object with a free key", () => {
    const out = run('{"newKey":1}', { type: "insert", parent: [], value: "" });
    expect(Object.keys(out.json)).toEqual(["newKey", "newKey2"]);
    expect(out.path).toEqual(["newKey2"]);
  });
  it("adds into an empty container and respects the index in objects", () => {
    expect(run('{"a":[]}', { type: "insert", parent: ["a"], value: "" }).json).toEqual({ a: [""] });
    const out = run('{"a":1,"b":2}', { type: "insert", parent: [], index: 1, key: "m", value: 0 });
    expect(Object.keys(out.json)).toEqual(["a", "m", "b"]);
  });
  it("refuses a scalar parent", () => {
    expect(message('{"a":1}', { type: "insert", parent: ["a"], value: 1 })).toMatch(
      /đối tượng hoặc mảng/,
    );
  });
});

describe("applyEdit: extract", () => {
  it("makes the value at a path the whole document", () => {
    const out = run('{"name":"x","rows":[{"a":1},{"a":2}]}', { type: "extract", path: ["rows"] });
    expect(out.json).toEqual([{ a: 1 }, { a: 2 }]);
    expect(out.path).toEqual([]);
  });
  it("refuses a path that does not exist", () => {
    expect(message("{}", { type: "extract", path: ["nope"] })).toMatch(/Không tìm thấy/);
  });
});

describe("applyEdit: safety", () => {
  it("keeps a __proto__ key as data", () => {
    const out = run('{"__proto__":{"x":1},"b":1}', { type: "setValue", path: ["b"], value: 2 });
    expect(Object.keys(out.json)).toEqual(["__proto__", "b"]);
    expect(Object.getPrototypeOf(out.json)).toBe(Object.prototype);
  });
  it("reports invalid JSON instead of throwing", () => {
    expect(message('{"a":', { type: "remove", path: ["a"] })).toBeTruthy();
  });
  it("output is always valid JSON that round-trips", () => {
    const out = run('{"a":[1,{"b":null}]}', { type: "duplicate", path: ["a", 1] });
    expect(JSON.parse(JSON.stringify(out.json))).toEqual(out.json);
  });
});

describe("parseEditedValue / isLossy", () => {
  it("parses strings as typed, including empty and spaces", () => {
    expect(parseEditedValue("string", "  a b ")).toEqual({ ok: true, value: "  a b " });
    expect(parseEditedValue("string", "")).toEqual({ ok: true, value: "" });
  });
  it.each(["1", "-2.5", "1e3", " 7 ", "0"])("accepts number %s", (text) => {
    expect(parseEditedValue("number", text).ok).toBe(true);
  });
  it.each(["", "abc", "01", "1.", ".5", "NaN", "Infinity", "1e999", "12345678901234567890"])(
    "rejects number %s",
    (text) => {
      expect(parseEditedValue("number", text).ok).toBe(false);
    },
  );
  it("accepts only true or false for booleans", () => {
    expect(parseEditedValue("boolean", "true")).toEqual({ ok: true, value: true });
    expect(parseEditedValue("boolean", "yes").ok).toBe(false);
  });
  it("isLossy flags numbers that cannot round-trip", () => {
    expect(isLossy('{"id":12345678901234567890}')).toBe(true);
    expect(isLossy('{"id":1}')).toBe(false);
  });
});
