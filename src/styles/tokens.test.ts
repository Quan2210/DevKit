import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8");

/** Token values of one theme block, e.g. the @theme block or the dark block. */
function tokens(block: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/gi)) {
    result[name!] = value!.toLowerCase();
  }
  return result;
}

const light = tokens(css.slice(css.indexOf("@theme"), css.indexOf(":root {")));
const dark = tokens(css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf("@media")));

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// Pairs from docs/02_DevKit_Design_System_v1.1.md §4.4; text needs 4.5:1, control borders 3:1.
const textPairs: Array<[string, string]> = [
  ["text", "bg"],
  ["text", "surface"],
  ["text-muted", "bg"],
  ["text-muted", "surface"],
  ["on-primary", "primary"],
  ["on-primary", "primary-hover"],
  ["primary", "surface"],
  ["success-fg", "surface"],
  ["warning-fg", "surface"],
  ["info-fg", "surface"],
  ["danger", "surface"],
];
const borderPairs: Array<[string, string]> = [
  ["border-strong", "bg"],
  ["border-strong", "surface"],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("%s theme tokens", (_name, theme) => {
  it("defines every token used by the design system", () => {
    for (const key of [
      "bg",
      "surface",
      "text",
      "primary",
      "on-primary",
      "border-strong",
      "danger",
    ]) {
      expect(theme[key], key).toBeDefined();
    }
  });

  it.each(textPairs)("%s on %s reaches 4.5:1", (fg, bg) => {
    expect(ratio(theme[fg]!, theme[bg]!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(borderPairs)("%s on %s reaches 3:1", (fg, bg) => {
    expect(ratio(theme[fg]!, theme[bg]!)).toBeGreaterThanOrEqual(3);
  });
});
