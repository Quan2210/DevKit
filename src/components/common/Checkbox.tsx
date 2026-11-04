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
  return (
    <label
      htmlFor={id}
      title={shortLabel ? label : undefined}
      className="inline-flex min-h-10 items-center gap-2 text-sm sm:min-h-9"
    >
      <input
        id={id}
        type="checkbox"
        className={cn("size-4 rounded-sm border-border-strong accent-primary", className)}
        {...rest}
      />
      {shortLabel ? (
        <>
          <span aria-hidden>{shortLabel}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        label
      )}
    </label>
  );
}
