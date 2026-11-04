import { describe, expect, it } from "vitest";
import { matchDocument, parseQuery, QueryError } from "./filter";
import {
  emptyQuery,
  findArrayPath,
  isQueryActive,
  queryText,
  runQuery,
  type QuerySpec,
} from "./query";

const spec = (partial: Partial<QuerySpec>): QuerySpec => ({ ...emptyQuery, ...partial });

describe("parseQuery", () => {
  it("reads what you type in Compass: bare keys, single quotes, trailing commas", () => {
    expect(parseQuery("{ userName: 'quan.mv', age: 3, }")).toEqual({ userName: "quan.mv", age: 3 });
    expect(parseQuery('{ "a.b": [1, true, null,], c: -1.5e2 }')).toEqual({
      "a.b": [1, true, null],
      c: -150,
    });
  });

  it("treats blank text as an empty filter", () => {
    expect(parseQuery("")).toEqual({});
    expect(parseQuery("   \n")).toEqual({});
  });

  it("reads regular expression literals with flags and escaped slashes", () => {
    const parsed = parseQuery("{ name: /^dev\\/kit$/i }") as { name: RegExp };
    expect(parsed.name).toBeInstanceOf(RegExp);
    expect(parsed.name.test("DEV/KIT")).toBe(true);
    expect(parsed.name.flags).toBe("i");
  });

  it("allows a slash inside a character class and drops g and y flags", () => {
    const parsed = parseQuery("{ p: /[/]x/gy }") as { p: RegExp };
    expect(parsed.p.test("/x")).toBe(true);
    expect(parsed.p.flags).toBe("");
  });

  it("decodes string escapes", () => {
    expect(parseQuery(String.raw`{ a: 'it\'s', b: "tab\there", c: "A" }`)).toEqual({
      a: "it's",
      b: "tab\there",
      c: "A",
    });
  });

  it("keeps a __proto__ key as data", () => {
    const parsed = parseQuery("{ __proto__: 1 }") as object;
    expect(Object.keys(parsed)).toEqual(["__proto__"]);
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
  });

  it.each([
    ["{ a: }", /Cú pháp/],
    ["{ a 1 }", /cần :/],
    ["{ a: 1", /\}/],
    ["{ a: 'x }", /'/],
    ["{ a: /x }", /\//],
    ["{ a: 1 } extra", /hết chuỗi/],
    ["{ a: undefined }", /giá trị/],
    ["{ a: /(/ }", /RegExp không hợp lệ/],
  ])("rejects %s with a readable message", (text, message) => {
    expect(() => parseQuery(text)).toThrow(QueryError);
    expect(() => parseQuery(text)).toThrow(message);
  });

  it("rejects a RegExp that is too long and nesting that is too deep", () => {
    expect(() => parseQuery(`{ a: /${"a".repeat(201)}/ }`)).toThrow(/dài quá/);
    expect(() => parseQuery("[".repeat(80))).toThrow(/quá sâu/);
  });
});

const docs = [
  {
    id: 1,
    userName: "quan.mv",
    age: 30,
    tags: ["dev", "ops"],
    address: { city: "Hanoi" },
    items: [
      { sku: "a", qty: 2 },
      { sku: "b", qty: 9 },
    ],
  },
  { id: 2, userName: "Dev.Kit", age: 25, tags: ["dev"], address: { city: "Saigon" }, items: [] },
  { id: 3, userName: "guest", age: null, tags: [], note: "x" },
  { id: 4, userName: "quan", age: "30", flag: false },
];
const ids = (filter: string) => {
  const parsed = parseQuery(filter) as Record<string, unknown>;
  return docs.filter((doc) => matchDocument(doc, parsed)).map((doc) => doc.id);
};

describe("matchDocument", () => {
  it("matches equality, including the example from the Compass screenshot", () => {
    expect(ids('{ userName: "quan.mv" }')).toEqual([1]);
    expect(ids("{}")).toEqual([1, 2, 3, 4]);
    expect(ids("{ age: 30 }")).toEqual([1]); // the string "30" is a different type
  });

  it("matches a RegExp as a value, with $regex and $options, and does not touch non-strings", () => {
    expect(ids("{ userName: /^quan/ }")).toEqual([1, 4]);
    expect(ids("{ userName: /dev/i }")).toEqual([2]);
    expect(ids('{ userName: { $regex: "DEV", $options: "i" } }')).toEqual([2]);
    expect(ids("{ age: /3/ }")).toEqual([4]);
    expect(ids("{ userName: { $not: /^quan/ } }")).toEqual([2, 3]);
  });

  it("compares only values of the same type", () => {
    expect(ids("{ age: { $gt: 26 } }")).toEqual([1]);
    expect(ids("{ age: { $gte: 25, $lt: 30 } }")).toEqual([2]);
    expect(ids('{ userName: { $gt: "g" } }')).toEqual([1, 3, 4]);
  });

  it("follows dotted paths through objects and arrays", () => {
    expect(ids('{ "address.city": "Hanoi" }')).toEqual([1]);
    expect(ids('{ "items.sku": "b" }')).toEqual([1]);
    expect(ids('{ "items.1.qty": 9 }')).toEqual([1]);
    expect(ids('{ "items.qty": { $gt: 5 } }')).toEqual([1]);
  });

  it("matches arrays the way MongoDB does", () => {
    expect(ids('{ tags: "ops" }')).toEqual([1]);
    expect(ids('{ tags: ["dev"] }')).toEqual([2]);
    expect(ids("{ tags: { $size: 0 } }")).toEqual([3]);
    expect(ids('{ tags: { $all: ["dev", "ops"] } }')).toEqual([1]);
    expect(ids("{ items: { $elemMatch: { sku: /a/, qty: { $lt: 3 } } } }")).toEqual([1]);
  });

  it("handles missing fields and null", () => {
    expect(ids("{ note: { $exists: true } }")).toEqual([3]);
    expect(ids("{ note: { $exists: false } }")).toEqual([1, 2, 4]);
    expect(ids("{ age: null }")).toEqual([3]);
    expect(ids("{ flag: null }")).toEqual([1, 2, 3]);
    expect(ids("{ note: { $ne: 'x' } }")).toEqual([1, 2, 4]);
  });

  it("supports $in, $nin and the logical operators", () => {
    expect(ids("{ id: { $in: [1, 3] } }")).toEqual([1, 3]);
    expect(ids("{ id: { $nin: [1, 3] } }")).toEqual([2, 4]);
    expect(ids("{ userName: { $in: [/^g/, 'quan'] } }")).toEqual([3, 4]);
    expect(ids("{ $or: [{ id: 1 }, { age: 25 }] }")).toEqual([1, 2]);
    expect(ids("{ $and: [{ tags: 'dev' }, { age: { $gt: 26 } }] }")).toEqual([1]);
    expect(ids("{ $nor: [{ id: 1 }, { id: 2 }] }")).toEqual([3, 4]);
  });

  it("reports unknown operators and wrong operands", () => {
    expect(() => ids("{ a: { $foo: 1 } }")).toThrow(/Toán tử không hỗ trợ: \$foo/);
    expect(() => ids("{ $where: 1 }")).toThrow(/\$where/);
    expect(() => ids("{ a: { $in: 1 } }")).toThrow(/\$in cần một mảng/);
    expect(() => ids("{ $or: 1 }")).toThrow(/\$or/);
    expect(() => ids("{ a: { $options: 'i' } }")).toThrow(/\$regex/);
  });

  it("does not match through inherited properties", () => {
    expect(ids("{ toString: { $exists: true } }")).toEqual([]);
    expect(ids("{ constructor: { $exists: true } }")).toEqual([]);
  });
});

describe("runQuery", () => {
  const root = { name: "list", rows: docs };
  const run = (partial: Partial<QuerySpec>, doc: unknown = root) => {
    const result = runQuery(doc, spec(partial));
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  };

  it("finds the array itself and says which one", () => {
    expect(findArrayPath(docs)).toEqual([]);
    expect(findArrayPath(root)).toEqual(["rows"]);
    expect(findArrayPath({ a: { b: [1] } })).toEqual(["a", "b"]);
    expect(findArrayPath({ a: 1 })).toBeNull();
    expect(run({}).base).toEqual(["rows"]);
  });

  it("filters, reports counts, and leaves everything when the query is empty", () => {
    const result = run({ filter: "{ userName: /^quan/ }" });
    expect(result.matched).toBe(2);
    expect(result.total).toBe(4);
    expect(result.value).toHaveLength(2);
    expect(run({}).value).toHaveLength(4);
  });

  it("sorts by several keys, with types in MongoDB order, and keeps ties in place", () => {
    expect(run({ sort: "{ age: 1 }" }).value.map((d) => (d as { id: number }).id)).toEqual([
      3, 2, 1, 4,
    ]);
    expect(run({ sort: "{ age: -1 }" }).value.map((d) => (d as { id: number }).id)).toEqual([
      4, 1, 2, 3,
    ]);
    expect(
      run({ sort: '{ "address.city": -1, id: 1 }' }).value.map((d) => (d as { id: number }).id),
    ).toEqual([2, 1, 3, 4]);
  });

  it("projects fields in or out, through dotted paths and arrays", () => {
    const included = run({
      filter: "{ id: 1 }",
      project: '{ userName: 1, "address.city": 1, "items.sku": 1 }',
    }).value[0];
    expect(included).toEqual({
      userName: "quan.mv",
      address: { city: "Hanoi" },
      items: [{ sku: "a" }, { sku: "b" }],
    });
    const excluded = run({
      filter: "{ id: 2 }",
      project: '{ tags: 0, "address.city": 0, items: 0 }',
    }).value[0];
    expect(excluded).toEqual({ id: 2, userName: "Dev.Kit", age: 25, address: {} });
  });

  it("applies filter, then sort, then project", () => {
    const out = run({ filter: "{ tags: 'dev' }", sort: "{ age: 1 }", project: "{ id: 1 }" }).value;
    expect(out).toEqual([{ id: 2 }, { id: 1 }]);
  });

  it("works on a root array and on a chosen base", () => {
    expect(run({ filter: "{ id: 3 }" }, docs).value).toHaveLength(1);
    const direct = runQuery(root, spec({ filter: "{ id: 3 }" }), ["rows"]);
    expect(direct.ok && direct.value.matched).toBe(1);
  });

  it("explains mistakes instead of throwing", () => {
    const messages = (partial: Partial<QuerySpec>, doc: unknown = root) => {
      const result = runQuery(doc, spec(partial));
      return result.ok ? null : result.error.message;
    };
    expect(messages({}, { a: 1 })).toMatch(/cần một mảng/);
    expect(messages({ filter: "[1]" })).toMatch(/Filter phải là một đối tượng/);
    expect(messages({ filter: "{ a: " })).toMatch(/Cú pháp/);
    expect(messages({ sort: "{ a: 2 }" })).toMatch(/1 \(tăng\)/);
    expect(messages({ sort: "1" })).toMatch(/Sort phải là một đối tượng/);
    expect(messages({ project: "{ a: 1, b: 0 }" })).toMatch(/không trộn/);
    expect(messages({ project: "{ a: 2 }" })).toMatch(/không trộn/);
  });

  it("is active only when a box has text", () => {
    expect(isQueryActive(emptyQuery)).toBe(false);
    expect(isQueryActive(spec({ sort: " " }))).toBe(false);
    expect(isQueryActive(spec({ project: "{a:1}" }))).toBe(true);
  });
});

describe("queryText", () => {
  it("returns the result as formatted JSON with the counts", () => {
    const out = queryText('{"r":[{"a":1},{"a":2}]}', spec({ filter: "{ a: 2 }" }), 4);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.value.text).toBe('[\n    {\n        "a": 2\n    }\n]');
      expect([out.value.count, out.value.total, out.value.base]).toEqual([1, 2, ["r"]]);
    }
  });

  it("passes JSON errors through", () => {
    expect(queryText("{", emptyQuery, 2).ok).toBe(false);
  });
});
