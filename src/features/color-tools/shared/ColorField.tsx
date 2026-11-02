import { useId, useState } from "react";
import { Input } from "../../../components/common/Input";
import { useT } from "../../../i18n/useT";
import { cn } from "../../../lib/cn";
import { opaque, parseColor, toHex, type Color } from "./color-core";
import { Swatch } from "./Swatch";

export interface ColorFieldProps {
  label: string;
  value: Color;
  onChange: (color: Color) => void;
  /** Text shown for `value` when the field is not being edited. Defaults to HEX. */
  format?: (color: Color) => string;
  className?: string;
}

/**
 * A color as typed text with validation, plus the browser's own color dialog for picking.
 * Valid text applies at once; invalid text shows an error and leaves the color unchanged, and the
 * field returns to the real value when it loses focus.
 */
export function ColorField({ label, value, onChange, format = toHex, className }: ColorFieldProps) {
  const t = useT();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const parsed = draft !== null && draft.trim() !== "" ? parseColor(draft) : null;
  const error = parsed && !parsed.ok ? parsed.error.message : undefined;
  // The native dialog has no alpha; it edits the color and keeps the current alpha.
  const nativeValue = toHex(opaque(value.r, value.g, value.b)).toLowerCase();

  return (
    <div className={cn("flex items-end gap-2", className)}>
      <div className="min-w-0 flex-1">
        <Input
          id={id}
          label={label}
          value={draft ?? format(value)}
          error={error}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.target.value);
            const result = parseColor(event.target.value);
            if (result.ok) onChange(result.value);
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
      <label className="relative mb-0 block shrink-0">
        <span className="sr-only">{t("color.nativePicker", { label })}</span>
        <input
          type="color"
          value={nativeValue}
          onChange={(event) => {
            const result = parseColor(event.target.value);
            if (result.ok) {
              setDraft(null);
              onChange({ ...result.value, a: value.a });
            }
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
        <Swatch color={value} className="size-10 sm:size-9" />
      </label>
    </div>
  );
}
