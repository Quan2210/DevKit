import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";

export interface PopoverProps {
  /** Accessible name of the opened panel. */
  label: string;
  /** Content of the trigger button. */
  trigger: ReactNode;
  triggerClassName?: string;
  /** Where the panel opens: above the trigger (status bar) or below it (top nav). */
  placement?: "above" | "below";
  /** Tooltip of the trigger (needed when its content is icon-only). */
  title?: string;
  children: ReactNode;
}

/** Click-to-open panel. Esc and outside click close it and focus returns to the trigger. */
export function Popover({
  label,
  trigger,
  triggerClassName,
  placement = "above",
  title,
  children,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        title={title}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn("inline-flex items-center gap-1.5 rounded-md", triggerClassName)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          data-region-reset
          className={cn(
            "absolute right-0 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-4 text-sm shadow-lg",
            placement === "above" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
