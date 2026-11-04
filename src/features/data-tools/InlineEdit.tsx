import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";

export type InlineEditKind = "key" | "string" | "number" | "boolean";

export interface InlineEditProps {
  kind: InlineEditKind;
  initial: string;
  /** Accessible name of the field. */
  label: string;
  /** Returns an error message to keep editing, or null when the change was accepted. */
  onCommit: (text: string) => string | null;
  onCancel: () => void;
}

const field =
  "min-h-6 rounded-sm border border-border-strong bg-surface px-1 font-mono text-[13px] text-text";

/**
 * Edits one key or value in place. Enter saves, Esc cancels, and leaving the field saves when the
 * text is valid and drops it otherwise. Unchanged text never writes anything.
 */
export function InlineEdit({ kind, initial, label, onCommit, onCancel }: InlineEditProps) {
  const t = useT();
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    if (kind !== "boolean") ref.current?.select();
  }, [kind]);

  const finish = (value: string, quiet: boolean) => {
    if (done.current) return;
    if (value === initial) {
      done.current = true;
      onCancel();
      return;
    }
    const problem = onCommit(value);
    if (problem === null) {
      done.current = true;
    } else if (quiet) {
      done.current = true;
      onCancel();
    } else {
      setError(problem);
    }
  };
  const cancel = () => {
    done.current = true;
    onCancel();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === "Enter" && !(kind === "string" && event.shiftKey)) {
      event.preventDefault();
      finish(text, false);
    }
  };
  const common = {
    ref,
    "aria-label": label,
    "aria-invalid": error ? true : undefined,
    onKeyDown,
    onBlur: () => finish(text, true),
  };

  return (
    <span className="inline-flex min-w-0 flex-col">
      {kind === "boolean" ? (
        <select
          {...common}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            finish(event.target.value, false);
          }}
          className={field}
        >
          <option value="true">{"true"}</option>
          <option value="false">{"false"}</option>
        </select>
      ) : kind === "string" ? (
        <textarea
          {...common}
          rows={1}
          value={text}
          spellCheck={false}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          className={cn(field, "field-sizing-content max-w-full min-w-24 resize-none")}
        />
      ) : (
        <input
          {...common}
          value={text}
          spellCheck={false}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          className={cn(field, "field-sizing-content min-w-16")}
        />
      )}
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
      <span className="sr-only">{t("edit.hint")}</span>
    </span>
  );
}
