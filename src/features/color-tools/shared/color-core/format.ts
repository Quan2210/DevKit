import { rgbToHsl } from "./convert";
import { clamp, type Color } from "./types";

const byte = (value: number): number => Math.round(clamp(value, 0, 255));
const hex2 = (value: number): string => byte(value).toString(16).padStart(2, "0").toUpperCase();

/** At most two decimals, no trailing zeros (0.8, 0.5, 1). */
export function formatAlpha(alpha: number): string {
  return String(Number(clamp(alpha, 0, 1).toFixed(2)));
}

/** `#RRGGBB`, or `#RRGGBBAA` when the color is not fully opaque. */
export function toHex(color: Color): string {
  const base = `#${hex2(color.r)}${hex2(color.g)}${hex2(color.b)}`;
  return color.a < 1 ? base + hex2(color.a * 255) : base;
}

/** Always `#RRGGBBAA`. */
export function toHex8(color: Color): string {
  return `#${hex2(color.r)}${hex2(color.g)}${hex2(color.b)}${hex2(color.a * 255)}`;
}

export function toRgbString(color: Color): string {
  const channels = `${byte(color.r)}, ${byte(color.g)}, ${byte(color.b)}`;
  return color.a < 1 ? `rgba(${channels}, ${formatAlpha(color.a)})` : `rgb(${channels})`;
}

export function toHslString(color: Color): string {
  const { h, s, l } = rgbToHsl(color);
  const parts = `${Math.round(h) % 360}, ${Math.round(s)}%, ${Math.round(l)}%`;
  return color.a < 1 ? `hsla(${parts}, ${formatAlpha(color.a)})` : `hsl(${parts})`;
}
