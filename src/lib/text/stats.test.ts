import { describe, expect, it } from "vitest";
import { countWordsWithRegex, textStats } from "./stats";

describe("textStats", () => {
  it("returns zeros for empty text", () => {
    expect(textStats("")).toEqual({
      words: 0,
      characters: 0,
      charactersWithoutSpaces: 0,
      lines: 0,
      readingMinutes: 0,
    });
  });

  it("counts Vietnamese words and characters", () => {
    const stats = textStats("Xin chào thế giới");
    expect(stats.words).toBe(4);
    expect(stats.characters).toBe(17);
    expect(stats.charactersWithoutSpaces).toBe(14);
    expect(stats.lines).toBe(1);
  });

  it("counts a combining accent and an emoji sequence as one character each", () => {
    expect(textStats("é").characters).toBe(1);
    expect(textStats("👨‍👩‍👧").characters).toBe(1);
  });

  it("does not count punctuation as words and keeps numbers and contractions together", () => {
    expect(textStats("Hello, world! ... ???").words).toBe(2);
    expect(textStats("3.14 and don't").words).toBe(3);
  });

  it("counts lines for every kind of line break", () => {
    expect(textStats("a\nb\r\nc\rd").lines).toBe(4);
    expect(textStats("one line").lines).toBe(1);
  });

  it("rounds the reading time up and shows at least one minute for any text", () => {
    const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");
    expect(textStats(words(1)).readingMinutes).toBe(1);
    expect(textStats(words(200)).readingMinutes).toBe(1);
    expect(textStats(words(201)).readingMinutes).toBe(2);
    expect(textStats(words(400)).readingMinutes).toBe(2);
  });

  it("the regex fallback agrees with the segmenter on ordinary text", () => {
    for (const text of ["Xin chào thế giới", "Hello, world!", "3.14 and don't", "a-b c_d", ""]) {
      expect(countWordsWithRegex(text), text).toBe(textStats(text).words);
    }
  });
});
