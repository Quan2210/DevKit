export interface TextStats {
  words: number;
  /** Visible characters (grapheme clusters), so an emoji or an accented letter counts once. */
  characters: number;
  charactersWithoutSpaces: number;
  lines: number;
  /** Estimated reading time, rounded up; 0 for empty text. */
  readingMinutes: number;
}

/** Average silent reading speed used for the estimate. */
export const WORDS_PER_MINUTE = 200;

const hasSegmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function";

/** Letters and digits with their marks, joined by an inner apostrophe, hyphen or decimal separator. */
const WORD = /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’\-.][\p{L}\p{N}\p{M}]+)*/gu;

/** Regex word counter; the fallback where Intl.Segmenter is missing, exported for tests. */
export function countWordsWithRegex(text: string): number {
  return text.match(WORD)?.length ?? 0;
}

function countWords(text: string): number {
  if (!hasSegmenter) return countWordsWithRegex(text);
  let count = 0;
  for (const part of new Intl.Segmenter(undefined, { granularity: "word" }).segment(text)) {
    if (part.isWordLike) count += 1;
  }
  return count;
}

function countGraphemes(text: string): number {
  if (!hasSegmenter) return Array.from(text).length;
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;
}

export function textStats(text: string): TextStats {
  const words = countWords(text);
  return {
    words,
    characters: countGraphemes(text),
    charactersWithoutSpaces: countGraphemes(text.replace(/\s/g, "")),
    lines: text === "" ? 0 : text.split(/\r\n|\r|\n/).length,
    readingMinutes: words === 0 ? 0 : Math.ceil(words / WORDS_PER_MINUTE),
  };
}
