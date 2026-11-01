import type { ComponentProps } from "react";
import { useId } from "react";
import { cn } from "../../lib/cn";

export interface CheckboxProps extends Omit<ComponentProps<"input">, "type" | "id"> {
  label: string;
}

/** Native checkbox with a visible label; the label is the accessible name. */
export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex min-h-10 items-center gap-2 text-sm sm:min-h-9">
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
