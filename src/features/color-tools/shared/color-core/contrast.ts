import { converter } from "culori";
import { clamp, opaque, type Color } from "./types";

const toOklch = converter("oklch");
const toRgb = converter("rgb");

/** WCAG 2.x relative luminance of the (opaque) color, from float channels. */
export function relativeLuminance({ r, g, b }: Color): number {
  const linear = (channel: number) => {
    const value = clamp(channel, 0, 255) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Blends `top` over an opaque `bottom` per channel, on floats: c = a*top + (1-a)*bottom. */
export function composite(top: Color, bottom: Color): Color {
  return opaque(
    top.a * top.r + (1 - top.a) * bottom.r,
    top.a * top.g + (1 - top.a) * bottom.g,
    top.a * top.b + (1 - top.a) * bottom.b,
  );
}

export function contrastRatio(first: Color, second: Color): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Truncates (never rounds up) to two decimals so 4.499 can not read as 4.5 and pass. */
export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}

export const THRESHOLDS = {
  aaNormal: 4.5,
  aaLarge: 3,
  aaaNormal: 7,
  aaaLarge: 4.5,
} as const;

export type ThresholdId = keyof typeof THRESHOLDS;

export interface ContrastResult {
  /** Unrounded; every pass/fail comes from this value. */
  ratio: number;
  display: string;
  passes: Record<ThresholdId, boolean>;
  /** The colors actually compared once transparency is blended onto the assumed background. */
  foreground: Color;
  background: Color;
  hasAlpha: boolean;
}

/**
 * Contrast of `foreground` on `background`. A translucent background is first blended onto
 * `assumedBackground` (opaque), then a translucent foreground onto that result (docs/03 §3.5).
 */
export function checkContrast(
  foreground: Color,
  background: Color,
  assumedBackground: Color = opaque(255, 255, 255),
): ContrastResult {
  const effectiveBackground = composite(background, assumedBackground);
  const effectiveForeground = composite(foreground, effectiveBackground);
  const ratio = contrastRatio(effectiveForeground, effectiveBackground);
  const passes = Object.fromEntries(
    (Object.keys(THRESHOLDS) as ThresholdId[]).map((id) => [id, ratio >= THRESHOLDS[id]]),
  ) as Record<ThresholdId, boolean>;
  return {
    ratio,
    display: formatRatio(ratio),
    passes,
    foreground: effectiveForeground,
    background: effectiveBackground,
    hasAlpha: foreground.a < 1 || background.a < 1,
  };
}

const fromOklch = (l: number, c: number, h: number | undefined): Color => {
  const rgb = toRgb({ mode: "oklch", l, c, h });
  return opaque(
    Math.round(clamp((rgb.r ?? 0) * 255, 0, 255)),
    Math.round(clamp((rgb.g ?? 0) * 255, 0, 255)),
    Math.round(clamp((rgb.b ?? 0) * 255, 0, 255)),
  );
};

/**
 * The foreground closest in OKLCH lightness (same hue and chroma) that reaches `target` against an
 * opaque `background`; null when not even black or white does. Binary search on lightness.
 */
export function suggestForeground(
  foreground: Color,
  background: Color,
  target: number,
): Color | null {
  if (contrastRatio(foreground, background) >= target) return foreground;
  const start = toOklch({
    mode: "rgb",
    r: foreground.r / 255,
    g: foreground.g / 255,
    b: foreground.b / 255,
  });
  const search = (goal: number): Color | null => {
    const end = fromOklch(goal, start.c, start.h);
    if (contrastRatio(end, background) < target) return null;
    let near = start.l;
    let far = goal;
    for (let i = 0; i < 24; i += 1) {
      const middle = (near + far) / 2;
      if (contrastRatio(fromOklch(middle, start.c, start.h), background) >= target) far = middle;
      else near = middle;
    }
    return fromOklch(far, start.c, start.h);
  };
  const darker = search(0);
  const lighter = search(1);
  if (darker && lighter) {
    const distance = (candidate: Color) =>
      Math.abs(
        toOklch({ mode: "rgb", r: candidate.r / 255, g: candidate.g / 255, b: candidate.b / 255 })
          .l - start.l,
      );
    return distance(darker) <= distance(lighter) ? darker : lighter;
  }
  return darker ?? lighter;
}
