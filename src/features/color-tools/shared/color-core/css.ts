import { toHex } from "./format";
import type { Color } from "./types";

/** A valid custom-property stem: lowercase letters, digits and dashes, starting with a letter. */
export function cssIdentifier(input: string, fallback = "color"): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return /^[a-z]/.test(cleaned) ? cleaned : fallback;
}

/** `:root { --prefix-1: #RRGGBB; ... }` */
export function toCssVariables(colors: ReadonlyArray<Color>, prefix: string): string {
  const stem = cssIdentifier(prefix);
  const lines = colors.map((color, index) => `  --${stem}-${index + 1}: ${toHex(color)};`);
  return `:root {\n${lines.join("\n")}\n}`;
}

export interface GradientStop {
  /** Stable identity so reordering and editing never mix rows up. */
  id: string;
  color: Color;
  /** 0 to 100 */
  position: number;
}

export type Gradient =
  | { type: "linear"; angle: number; stops: GradientStop[] }
  | {
      type: "radial";
      shape: "circle" | "ellipse";
      position: RadialPosition;
      stops: GradientStop[];
    };

export const RADIAL_POSITIONS = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "top left",
  "top right",
  "bottom left",
  "bottom right",
] as const;
export type RadialPosition = (typeof RADIAL_POSITIONS)[number];

const trimNumber = (value: number) => String(Number(value.toFixed(2)));

/** Stops in position order (stable for equal positions). */
export const sortedStops = (stops: ReadonlyArray<GradientStop>): GradientStop[] =>
  stops
    .map((stop, index) => ({ stop, index }))
    .sort((a, b) => a.stop.position - b.stop.position || a.index - b.index)
    .map(({ stop }) => stop);

export function gradientToCss(gradient: Gradient): string {
  const stops = sortedStops(gradient.stops)
    .map((stop) => `${toHex(stop.color)} ${trimNumber(stop.position)}%`)
    .join(", ");
  if (gradient.type === "linear") {
    return `linear-gradient(${trimNumber(((gradient.angle % 360) + 360) % 360)}deg, ${stops})`;
  }
  return `radial-gradient(${gradient.shape} at ${gradient.position}, ${stops})`;
}
