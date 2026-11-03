import type { KeyboardEvent, ReactNode } from "react";
import { useRef } from "react";
import { cn } from "../../lib/cn";

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedProps<V extends string> {
  /** Accessible name of the group, e.g. "Chế độ". */
  label: string;
  options: ReadonlyArray<SegmentedOption<V>>;
  value: V;
  onChange: (value: V) => void;
  /** Hide the text and keep it for assistive tech (icon-only groups such as the theme switcher). */
  iconOnly?: boolean;
}

/** Radio-group semantics with roving tabindex: arrows, Home and End move and select. */
export function Segmented<V extends string>({
  label,
  options,
  value,
  onChange,
  iconOnly = false,
}: SegmentedProps<V>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (index: number) => {
    const target = options[(index + options.length) % options.length];
    if (!target) return;
    onChange(target.value);
    refs.current[options.indexOf(target)]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(index - 1);
        break;
      case "Home":
        event.preventDefault();
        move(0);
        break;
      case "End":
        event.preventDefault();
        move(options.length - 1);
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-md border border-border-strong bg-surface-muted p-0.5"
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={iconOnly ? option.label : undefined}
            title={iconOnly ? option.label : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors sm:min-h-8",
              selected
                ? "bg-surface text-text shadow-sm ring-1 ring-border-strong"
                : "text-text hover:bg-surface",
            )}
          >
            {option.icon}
            {iconOnly ? null : option.label}
          </button>
        );
      })}
    </div>
  );
}
