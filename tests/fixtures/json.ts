/** JSON corpus for the JSON Formatter (PRD 3.1). Valid inputs must parse; invalid ones must not. */
export interface JsonCase {
  name: string;
  input: string;
}

export const validJson: JsonCase[] = [
  { name: "empty object", input: "{}" },
  { name: "empty array", input: "[]" },
  { name: "nested structure", input: '{"a":{"b":[1,2,{"c":null}]},"d":true}' },
  { name: "numbers", input: "[0,-1,1.5,1e3,-2.5E-2]" },
  {
    name: "unicode and escapes",
    input: '{"vi":"Xin chào","emoji":"😀","esc":"line\\nbreak\\t\\"q\\""}',
  },
  { name: "top-level scalar", input: '"just a string"' },
  { name: "already formatted", input: '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}' },
];

export const invalidJson: JsonCase[] = [
  { name: "trailing comma", input: '{"a":1,}' },
  { name: "unquoted key", input: "{a:1}" },
  { name: "single quotes", input: "{'a':1}" },
  { name: "truncated array", input: "[1,2" },
  { name: "empty string", input: "" },
  { name: "two documents", input: '{"a":1}{"b":2}' },
  { name: "comment", input: '{"a":1 /* no */}' },
  { name: "bare word", input: "undefined" },
];

/** Integers beyond Number.MAX_SAFE_INTEGER silently lose precision in JSON.parse (PRD 3.1 limit, risk R6). */
export const unsafeIntegerJson: JsonCase[] = [
  { name: "huge id", input: '{"id": 12345678901234567890}' },
  { name: "in array", input: "[9007199254740993]" },
];

/** Integers that are safe or only look big; must NOT trigger the warning. */
export const safeIntegerJson: JsonCase[] = [
  { name: "max safe", input: "[9007199254740991]" },
  { name: "big number inside a string", input: '{"id":"12345678901234567890"}' },
  { name: "float", input: "[1234567890123456.5]" },
];
