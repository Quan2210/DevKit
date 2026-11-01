import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";
import { IconButton } from "./IconButton";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** "left" renders a navigation drawer (mobile menu); "center" a modal. */
  placement?: "center" | "left";
  footer?: ReactNode;
}

/**
 * Native <dialog> in modal mode: the browser traps focus, closes on Esc and restores focus
 * to the opener. A click on the backdrop also closes it.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  placement = "center",
  footer,
}: DialogProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A click that lands on the <dialog> itself (not its content) is a click on the backdrop.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={cn(
        "m-0 border border-border bg-surface p-0 text-text backdrop:bg-black/50",
        placement === "left"
          ? "h-dvh max-h-none w-72 max-w-[85vw] rounded-r-xl"
          : "m-auto w-[28rem] max-w-[calc(100vw-2rem)] rounded-xl",
      )}
    >
      <div className="flex max-h-dvh flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <IconButton
            label={t("action.close")}
            icon={<X aria-hidden className="size-4" />}
            onClick={onClose}
          />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? (
          <footer className="flex justify-end gap-2 border-t border-border p-3">{footer}</footer>
        ) : null}
      </div>
    </dialog>
  );
}
