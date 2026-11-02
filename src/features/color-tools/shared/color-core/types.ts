/**
 * One color type for every color tool. Channels are floats so no precision is lost between steps
 * (contrast math must not see 8-bit rounding, docs/04 F-4); rounding happens only when formatting.
 */
export interface Color {
  /** 0 to 255 */
  r: number;
  g: number;
  b: number;
  /** 0 (transparent) to 1 (opaque) */
  a: number;
}

export interface Hsl {
  /** 0 up to (excluding) 360 */
  h: number;
  /** 0 to 100 */
  s: number;
  /** 0 to 100 */
  l: number;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const opaque = (r: number, g: number, b: number): Color => ({ r, g, b, a: 1 });
