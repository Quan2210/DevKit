import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "../../lib/cn";

export interface CheckboxProps extends Omit<ComponentProps<"input">, "type" | "id"> {
  label: string;
  /** Compact form: only this text shows; the full label stays as accessible name and tooltip. */
  shortLabel?: ReactNode;
}

/** Native checkbox with a visible label; the label is the accessible name. */
export function Checkbox({ label, shortLabel, className, ...rest }: CheckboxProps) {
  const id = useId();
  // Compact form is a toggle chip: the native checkbox stays (hidden) for the accessible name and keyboard,
  // the chip shows the icon and its pressed state, so the target is 44px and the meaning is clear.
  if (shortLabel) {
    return (
      <label
        htmlFor={id}
        title={label}
        className="relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent px-2.5 text-sm text-text transition-colors hover:bg-surface-muted has-[:checked]:border-border-strong has-[:checked]:bg-surface-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary sm:min-h-9 sm:min-w-9"
      >
        <input
          id={id}
          type="checkbox"
          className={cn("absolute inset-0 size-full cursor-pointer opacity-0", className)}
          {...rest}
        />
        <span aria-hidden className="inline-flex">
          {shortLabel}
        </span>
        <span className="sr-only">{label}</span>
      </label>
    );
  }
  return (
    <label htmlFor={id} className="inline-flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
      <input
        id={id}
        type="checkbox"
        className={cn("size-4 rounded-sm border-border-strong accent-primary", className)}
        {...rest}
      />
      {label}
    </label>
  );
}
