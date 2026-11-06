import { Chunk } from "@codemirror/merge";
import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS, diffConfigFor, normalizeEol, summarize, type DiffOptions } from "./diff";

const doc = (text: string) => Text.of(text.split("\n"));
const compare = (a: string, b: string, options: Partial<DiffOptions> = {}) =>
  summarize(Chunk.build(doc(a), doc(b), diffConfigFor({ ...DEFAULT_OPTIONS, ...options })), a, b);

describe("normalizeEol", () => {
  it("turns CRLF and CR into LF", () => {
    expect(normalizeEol("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });
});

describe("summarize with the default options", () => {
  it("reports identical texts as no change", () => {
    expect(compare("a\nb\nc", "a\nb\nc")).toEqual({ total: 0, added: 0, removed: 0, changed: 0 });
  });

  it("counts an added line, a removed line and a changed line apart", () => {
    expect(compare("a\nb\nc", "a\nb\nc\nd")).toMatchObject({ total: 1, added: 1 });
    expect(compare("a\nb\nc", "a\nc")).toMatchObject({ total: 1, removed: 1 });
    expect(compare("a\nfoo\nc", "a\nfood\nc")).toMatchObject({ total: 1, changed: 1 });
  });

  it("treats everything as added when the original is empty", () => {
    expect(compare("", "x\ny")).toMatchObject({ total: 1, added: 1 });
  });

  it("treats everything as removed when the modified text is empty", () => {
    expect(compare("x\ny", "")).toMatchObject({ total: 1, removed: 1 });
  });

  it("counts separate blocks separately", () => {
    const left = ["a", "1", "b", "c", "d", "e", "2", "f"].join("\n");
    const right = ["a", "x", "b", "c", "d", "e", "y", "f"].join("\n");
    expect(compare(left, right).total).toBe(2);
  });

  it("handles Unicode text", () => {
    expect(compare("xin chào\n🙂", "xin chào\n🙃")).toMatchObject({ total: 1, changed: 1 });
  });
});

describe("ignore case", () => {
  it("sees a case-only difference only when case matters", () => {
    expect(compare("Hello World", "hello world").total).toBe(1);
    expect(compare("Hello World", "hello world", { ignoreCase: true }).total).toBe(0);
  });

  it("still reports a real difference", () => {
    expect(compare("Hello", "hellp", { ignoreCase: true }).total).toBe(1);
  });
});

describe("ignore whitespace", () => {
  it("ignores spaces and tabs inside and around lines", () => {
    expect(compare("a  b", "a b").total).toBe(1);
    expect(compare("a  b", "a b", { ignoreWhitespace: true }).total).toBe(0);
    expect(compare("\tfoo ", "foo", { ignoreWhitespace: true }).total).toBe(0);
  });

  it("does not ignore line breaks", () => {
    expect(compare("a\nb", "ab", { ignoreWhitespace: true }).total).toBe(1);
  });

  it("reports a change next to ignored whitespace at the right place", () => {
    const config = diffConfigFor({ ...DEFAULT_OPTIONS, ignoreWhitespace: true });
    const changes = config.override!("let  x = 1", "let x = 2");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ fromA: 9, toA: 10, fromB: 8, toB: 9 });
  });

  it("combines with ignore case", () => {
    expect(compare("Foo  Bar", "foo bar", { ignoreWhitespace: true, ignoreCase: true }).total).toBe(
      0,
    );
  });
});

describe("precision", () => {
  it("widens a change to the whole word in word mode", () => {
    const config = diffConfigFor({ ...DEFAULT_OPTIONS, precision: "word" });
    const [change] = config.override!("the quick fox", "the quack fox");
    expect(change).toMatchObject({ fromA: 4, toA: 9, fromB: 4, toB: 9 });
  });

  it("keeps the single character in char mode", () => {
    const config = diffConfigFor({ ...DEFAULT_OPTIONS, precision: "char" });
    const [change] = config.override!("the quick fox", "the quack fox");
    expect(change).toMatchObject({ fromA: 6, toA: 7, fromB: 6, toB: 7 });
  });

  it("joins neighbouring changes that widen into the same word", () => {
    const config = diffConfigFor({ ...DEFAULT_OPTIONS, precision: "word" });
    expect(config.override!("abcdef", "aXcdeY")).toHaveLength(1);
  });
});

describe("performance", () => {
  it("compares thousands of lines quickly", () => {
    const left = Array.from({ length: 20000 }, (_, i) => `line ${i}`);
    const right = left.map((line, i) => (i % 500 === 0 ? `${line} changed` : line));
    const started = performance.now();
    const result = compare(left.join("\n"), right.join("\n"), { ignoreCase: true });
    expect(result.total).toBe(40);
    expect(performance.now() - started).toBeLessThan(3000);
  });
});
