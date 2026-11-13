import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  /** Left padding steps for nested entries such as a table of contents. */
  indent?: number;
}

export interface MenuButtonProps {
  label: string;
  items: ReadonlyArray<MenuItem>;
  icon?: ReactNode;
  disabled?: boolean;
  /** Shown instead of the list when there are no items. */
  emptyLabel?: string;
  /** Icon with a tooltip instead of a labelled button (compact headers). */
  iconOnly?: boolean;
  /** Align the menu to the right edge of the button (buttons near the right of a panel). */
  alignEnd?: boolean;
}

/** Button that opens a menu. Esc and outside click close it; arrows move between entries. */
export function MenuButton({
  label,
  items,
  icon,
  disabled,
  emptyLabel,
  iconOnly = false,
  alignEnd = false,
}: MenuButtonProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const entries = [
      ...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []),
    ];
    const index = entries.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    entries[(next + entries.length) % entries.length]?.focus();
  };

  return (
    <div ref={root} role="presentation" className="relative" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50",
          iconOnly
            ? "h-11 min-w-11 justify-center gap-0.5 rounded-md px-2 sm:h-9 sm:min-w-9"
            : "min-h-11 gap-1.5 rounded-md border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium sm:min-h-9",
        )}
      >
        {icon}
        {iconOnly ? null : label}
        <ChevronDown aria-hidden className={iconOnly ? "size-3" : "size-4"} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            "absolute top-full z-20 mt-1 max-h-80 min-w-48 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg",
            alignEnd ? "right-0" : "left-0",
          )}
        >
          {items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-text-muted">{emptyLabel}</p>
          ) : (
            items.map((item, index) => (
              <button
                key={`${index}-${item.label}`}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onSelect();
                }}
                style={item.indent ? { paddingLeft: `${0.75 + item.indent * 0.75}rem` } : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm hover:bg-surface-muted focus-visible:bg-surface-muted disabled:opacity-50 sm:min-h-9",
                )}
              >
                {item.label}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
