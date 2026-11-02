import { useState, type ComponentProps } from "react";
import { Input } from "../../../components/common/Input";

export interface NumberFieldProps extends Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> {
  value: number;
  /** Called with each complete, finite number as it is typed. */
  onCommit: (value: number) => void;
}

/**
 * A number box that may be empty while the user types. Only complete numbers are passed on; when the
 * box loses focus it shows the real value again (so a clamped or ignored entry is visible).
 */
export function NumberField({ value, onCommit, onBlur, ...rest }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      {...rest}
      type="number"
      inputMode="decimal"
      value={draft ?? String(value)}
      onChange={(event) => {
        setDraft(event.target.value);
        const next = event.target.value.trim() === "" ? NaN : Number(event.target.value);
        if (Number.isFinite(next)) onCommit(next);
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
