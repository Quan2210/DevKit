/** Colour corpus for the Color Tools (PRD 3.6 to 3.9, test strategy 9.2). */
export interface ParseCase {
  input: string;
  /** Expected sRGB channels 0-255 and alpha 0-1. */
  rgba: [number, number, number, number];
}

export const validColors: ParseCase[] = [
  { input: "#fff", rgba: [255, 255, 255, 1] },
  { input: "#FFF", rgba: [255, 255, 255, 1] },
  { input: "#f00a", rgba: [255, 0, 0, 170 / 255] },
  { input: "#4f46e5", rgba: [79, 70, 229, 1] },
  { input: "#4F46E5CC", rgba: [79, 70, 229, 204 / 255] },
  { input: "#00000000", rgba: [0, 0, 0, 0] },
  { input: "rgb(0, 0, 0)", rgba: [0, 0, 0, 1] },
  { input: "rgb(255 255 255)", rgba: [255, 255, 255, 1] },
  { input: "rgba(79, 70, 229, 0.5)", rgba: [79, 70, 229, 0.5] },
  { input: "hsl(0, 100%, 50%)", rgba: [255, 0, 0, 1] },
  { input: "hsla(120, 100%, 25%, 0.25)", rgba: [0, 128, 0, 0.25] },
];

export const invalidColors: string[] = [
  "",
  "#",
  "#ff",
  "#fffff",
  "#fffffffff",
  "#ggg",
  "rgb(256, 0, 0)",
  "rgb(-1, 0, 0)",
  "rgba(0, 0, 0, 1.5)",
  "hsl(0, 101%, 50%)",
  "red green",
  "rgb(1,2)",
];

export interface ContrastCase {
  foreground: string;
  background: string;
  /** WCAG 2.x contrast ratio, rounded to 4 decimals (recomputed independently from the formula). */
  ratio: number;
}

export const contrastCases: ContrastCase[] = [
  { foreground: "#000000", background: "#ffffff", ratio: 21 },
  { foreground: "#ffffff", background: "#ffffff", ratio: 1 },
  { foreground: "#767676", background: "#ffffff", ratio: 4.5422 },
  { foreground: "#777777", background: "#ffffff", ratio: 4.4781 },
  { foreground: "#595959", background: "#ffffff", ratio: 7.0047 },
  { foreground: "#0f172a", background: "#f8fafc", ratio: 17.0629 },
  { foreground: "#4f46e5", background: "#ffffff", ratio: 6.2875 },
];

/** Alpha: black at 50% over white is mid grey 127.5 when composited in floats: ratio 3.9767 (SD-15). */
export const alphaContrastCase = {
  foreground: "rgba(0, 0, 0, 0.5)",
  background: "#ffffff",
  ratio: 3.9767,
};

/** WCAG thresholds (docs PRD 3.8). */
export const thresholds = { aaNormal: 4.5, aaLarge: 3, aaaNormal: 7, aaaLarge: 4.5 } as const;
