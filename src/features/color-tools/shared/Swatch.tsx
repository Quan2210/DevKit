import { cn } from "../../../lib/cn";
import { toRgbString } from "./color-core";
import type { Color } from "./color-core";

/** Checkerboard behind the color so transparency can be seen. */
const CHECKER =
  "conic-gradient(var(--color-surface-muted) 25%, var(--color-surface) 0 50%, var(--color-surface-muted) 0 75%, var(--color-surface) 0)";

export interface SwatchProps {
  color: Color;
  className?: string;
  /** Accessible name; omit when the swatch is decorative and its value is written next to it. */
  label?: string;
}

export function Swatch({ color, className, label }: SwatchProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block overflow-hidden rounded-md border border-border-strong", className)}
      style={{ backgroundImage: CHECKER, backgroundSize: "16px 16px" }}
    >
      <span className="block size-full" style={{ backgroundColor: toRgbString(color) }} />
    </span>
  );
}
