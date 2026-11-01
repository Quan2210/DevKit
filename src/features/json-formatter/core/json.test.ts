import { describe, expect, it } from "vitest";
import {
  invalidJson,
  safeIntegerJson,
  unsafeIntegerJson,
  validJson,
} from "../../../../tests/fixtures";
import {
  extractPosition,
  findErrorOffset,
  findUnsafeIntegers,
  formatJson,
  locate,
  minifyJson,
  parseJson,
} from "./json";

describe("formatJson / minifyJson", () => {
  it("pretty-prints with 2 or 4 spaces", () => {
    const input = '{"a":[1,2],"b":{"c":null}}';
    const two = formatJson(input, 2);
    const four = formatJson(input, 4);
    expect(two.ok && two.value).toBe(
      '{\n  "a": [\n    1,\n    2\n  ],\n  "b": {\n    "c": null\n  }\n}',
    );
    expect(four.ok && four.value).toContain('\n    "a": [');
  });

  it("minifies to one line", () => {
    const result = minifyJson('{\n  "a": 1,\n  "b": [ 2, 3 ]\n}');
    expect(result.ok && result.value).toBe('{"a":1,"b":[2,3]}');
  });

  it.each(validJson)("keeps every value for: $name", ({ input }) => {
    const original = JSON.parse(input);
    for (const result of [formatJson(input, 2), formatJson(input, 4), minifyJson(input)]) {
      expect(result.ok).toBe(true);
      if (result.ok) expect(JSON.parse(result.value)).toEqual(original);
    }
  });

  it("is idempotent: formatting the output again changes nothing", () => {
    const once = formatJson('{"b":1,"a":[true,false]}', 2);
    expect(once.ok).toBe(true);
    if (once.ok) {
      const twice = formatJson(once.value, 2);
      expect(twice.ok && twice.value).toBe(once.value);
    }
  });

  it("normalises number spelling but not the value", () => {
    const result = minifyJson("[1.0, 1e3, -2.50]");
    expect(result.ok && result.value).toBe("[1,1000,-2.5]");
  });

  it("does not crash on very deep nesting", () => {
    const deep = "[".repeat(2000) + "]".repeat(2000);
    expect(() => formatJson(deep, 2)).not.toThrow();
  });
});

describe("errors", () => {
  it.each(invalidJson)("rejects: $name without throwing", ({ input }) => {
    const result = parseJson(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it("never returns output for invalid input", () => {
    expect(formatJson("{a:1}", 2).ok).toBe(false);
    expect(minifyJson("[1,2").ok).toBe(false);
  });

  it("reports an empty input as its own message", () => {
    const result = parseJson("   ");
    expect(!result.ok && result.error.message).toBe("Chưa có JSON để xử lý.");
  });

  it("reports the line and column of the failing token on a later line", () => {
    const result = parseJson('{\n  "a": 1,\n  "b": ,\n}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.position?.line).toBe(3);
  });
});

describe("error position across engines", () => {
  const text = '{\n  "a": 1,\n  oops\n}';

  it("reads V8's position and line/column forms", () => {
    expect(extractPosition("Unexpected token o in JSON at position 14", text)).toEqual({
      line: 3,
      column: 3,
    });
    expect(extractPosition("Bad thing at position 14 (line 3 column 3)", text)).toEqual({
      line: 3,
      column: 3,
    });
  });

  it("reads Firefox's line and column form", () => {
    expect(
      extractPosition(
        "JSON.parse: expected property name at line 3 column 3 of the JSON data",
        text,
      ),
    ).toEqual({ line: 3, column: 3 });
  });

  it("returns undefined when the engine gives no position (Safari)", () => {
    expect(extractPosition("JSON Parse error: Expected '}'", text)).toBeUndefined();
  });

  it("locates offsets on the first and later lines", () => {
    expect(locate("abc", 0)).toEqual({ line: 1, column: 1 });
    expect(locate("a\nbc", 3)).toEqual({ line: 2, column: 2 });
  });
});

describe("findUnsafeIntegers (R6)", () => {
  it.each(unsafeIntegerJson)("flags: $name", ({ input }) => {
    expect(findUnsafeIntegers(input).length).toBeGreaterThan(0);
  });

  it.each(safeIntegerJson)("does not flag: $name", ({ input }) => {
    expect(findUnsafeIntegers(input)).toEqual([]);
  });

  it("returns the literals as written, once each, including negatives", () => {
    expect(
      findUnsafeIntegers("[12345678901234567890, -9007199254740993, 12345678901234567890]"),
    ).toEqual(["12345678901234567890", "-9007199254740993"]);
  });

  it("ignores digits inside strings, even with escaped quotes", () => {
    expect(findUnsafeIntegers('{"k":"a\\"12345678901234567890"}')).toEqual([]);
  });

  it("does not flag decimals or exponents that merely look long", () => {
    expect(findUnsafeIntegers("[12345678901234567890.5, 1e999]")).toEqual([]);
  });
});

describe("findErrorOffset (engine-independent error location)", () => {
  it.each([
    ["trailing comma", '{"a":1,}', { line: 1, column: 8 }],
    ["unquoted key", "{a:1}", { line: 1, column: 2 }],
    ["single quotes", "{'a':1}", { line: 1, column: 2 }],
    ["truncated array", "[1,2", { line: 1, column: 5 }],
    ["two documents", '{"a":1}{"b":2}', { line: 1, column: 8 }],
    ["comment", '{"a":1 /* no */}', { line: 1, column: 8 }],
    ["bare word", "undefined", { line: 1, column: 1 }],
    ["error on a later line", '{\n  "a": 1,\n  "b": ,\n}', { line: 3, column: 8 }],
  ])("%s", (_name, input, expected) => {
    const result = parseJson(input);
    expect(!result.ok && result.error.position).toEqual(expected);
  });

  it("agrees with every valid and invalid fixture", () => {
    for (const { input } of validJson) expect(findErrorOffset(input), input).toBeUndefined();
    for (const { input } of invalidJson.filter((c) => c.input !== "")) {
      expect(findErrorOffset(input), input).toBeTypeOf("number");
    }
  });

  it("matches JSON.parse on hundreds of mutated documents (differential test)", () => {
    let seed = 99;
    const next = (max: number) => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed % max;
    };
    const alphabet = [
      '"',
      "{",
      "}",
      "[",
      "]",
      ",",
      ":",
      "0",
      "-",
      "e",
      ".",
      "\\",
      " ",
      "t",
      "n",
      "\n",
    ];
    let valid = 0;
    let invalid = 0;
    for (let round = 0; round < 600; round += 1) {
      const base = validJson[next(validJson.length)]!.input;
      const at = next(base.length + 1);
      const op = next(3);
      const char = alphabet[next(alphabet.length)]!;
      const text =
        op === 0
          ? base.slice(0, at) + char + base.slice(at)
          : op === 1
            ? base.slice(0, at) + base.slice(at + 1)
            : base.slice(0, at) + char + base.slice(at + 1);
      let engineAccepts = true;
      try {
        JSON.parse(text);
      } catch {
        engineAccepts = false;
      }
      const offset = findErrorOffset(text);
      expect(offset === undefined, JSON.stringify(text)).toBe(engineAccepts);
      if (engineAccepts) valid += 1;
      else {
        invalid += 1;
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(text.length);
      }
    }
    expect(valid).toBeGreaterThan(20); // the mutations must exercise both outcomes
    expect(invalid).toBeGreaterThan(100);
  });
});
