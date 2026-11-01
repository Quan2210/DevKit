import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "../../lib/cn";

interface FieldProps {
  label: string;
  /** Error text shown next to the field; also sets aria-invalid. */
  error?: string;
  hint?: ReactNode;
}

const control =
  "w-full rounded-md border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted disabled:opacity-50";

function borderClass(error?: string): string {
  return error ? "border-danger" : "border-border-strong";
}

export function Input({
  label,
  error,
  hint,
  className,
  id,
  ...rest
}: FieldProps & Omit<ComponentProps<"input">, "id"> & { id?: string }) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(control, borderClass(error), "min-h-10 sm:min-h-9", className)}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className,
  id,
  ...rest
}: FieldProps & Omit<ComponentProps<"textarea">, "id"> & { id?: string }) {
  const auto = useId();
  const areaId = id ?? auto;
  const describedBy = error ? `${areaId}-error` : hint ? `${areaId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={areaId} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={areaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(control, borderClass(error), "min-h-24 font-mono", className)}
        {...rest}
      />
      {error ? (
        <p id={`${areaId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${areaId}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
