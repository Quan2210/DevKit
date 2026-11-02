import { hslToRgb, rgbToHsl } from "./convert";
import { clamp, type Color } from "./types";

export type HarmonyMode = "monochromatic" | "analogous" | "complementary" | "triadic" | "tetradic";

export const HARMONY_MODES: readonly HarmonyMode[] = [
  "monochromatic",
  "analogous",
  "complementary",
  "triadic",
  "tetradic",
];

/** Allowed number of colors per mode (docs/04 6.3). */
export const HARMONY_RANGE: Record<HarmonyMode, { min: number; max: number }> = {
  monochromatic: { min: 2, max: 10 },
  analogous: { min: 2, max: 10 },
  complementary: { min: 2, max: 10 },
  triadic: { min: 3, max: 10 },
  tetradic: { min: 4, max: 10 },
};

export interface HarmonyColor {
  color: Color;
  /** True for the color the user chose. */
  isBase: boolean;
}

const BASE_HUES: Record<"complementary" | "triadic" | "tetradic", number[]> = {
  complementary: [0, 180],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180, 270],
};

const ANALOGOUS_STEP = 30;
const LIGHTNESS_STEP = 12;
const MONO_RANGE = { from: 20, to: 90 };

const wrap = (hue: number) => ((hue % 360) + 360) % 360;
const colorOf = (h: number, s: number, l: number, a: number): Color =>
  hslToRgb({ h: wrap(h), s, l: clamp(l, 0, 100) }, a);

export function clampCount(mode: HarmonyMode, count: number): number {
  const { min, max } = HARMONY_RANGE[mode];
  return clamp(Math.round(count), min, max);
}

/**
 * Colors that go with `base`, always exactly `count` of them (docs/04 6.3, F-6).
 * Monochromatic is ordered by lightness with the base at its nearest slot; every other mode lists the
 * base first, then the related hues, then lightness variants of those hues when `count` is larger.
 */
export function generateHarmony(base: Color, mode: HarmonyMode, requested: number): HarmonyColor[] {
  const count = clampCount(mode, requested);
  const { h, s, l } = rgbToHsl(base);
  const alpha = base.a;
  const baseEntry: HarmonyColor = { color: base, isBase: true };

  if (mode === "monochromatic") {
    const step = (MONO_RANGE.to - MONO_RANGE.from) / (count - 1);
    const lightness = Array.from({ length: count }, (_, i) => MONO_RANGE.from + i * step);
    let nearest = 0;
    lightness.forEach((value, i) => {
      if (Math.abs(value - l) < Math.abs(lightness[nearest]! - l)) nearest = i;
    });
    return lightness.map((value, i) =>
      i === nearest ? baseEntry : { color: colorOf(h, s, value, alpha), isBase: false },
    );
  }

  let hues: number[];
  if (mode === "analogous") {
    hues = Array.from({ length: count }, (_, i) => {
      if (i === 0) return 0;
      const rank = Math.ceil(i / 2);
      return (i % 2 === 1 ? 1 : -1) * rank * ANALOGOUS_STEP;
    });
    return hues.map((offset, i) =>
      i === 0 ? baseEntry : { color: colorOf(h + offset, s, l, alpha), isBase: false },
    );
  }

  const offsets = BASE_HUES[mode];
  const result: HarmonyColor[] = offsets
    .slice(0, count)
    .map((offset, i) =>
      i === 0 ? baseEntry : { color: colorOf(h + offset, s, l, alpha), isBase: false },
    );
  const lightnessShifts: number[] = [];
  for (let level = 1; lightnessShifts.length < 10; level += 1) {
    lightnessShifts.push(level * LIGHTNESS_STEP, -level * LIGHTNESS_STEP);
  }
  // Only shifts that stay inside the lightness range, so extras never pile up on white or black.
  const usable = lightnessShifts.filter((shift) => l + shift >= 5 && l + shift <= 95);
  const shifts = usable.length > 0 ? usable : [0];
  for (let j = 0; result.length < count; j += 1) {
    const offset = offsets[j % offsets.length]!;
    const shift = shifts[Math.floor(j / offsets.length) % shifts.length]!;
    result.push({ color: colorOf(h + offset, s, l + shift, alpha), isBase: false });
  }
  return result;
}
