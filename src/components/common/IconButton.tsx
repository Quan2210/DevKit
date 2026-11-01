import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon-only button needs an accessible name. Also used as the tooltip. */
  label: string;
  icon: ReactNode;
}

export function IconButton({ label, icon, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md text-text transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 sm:size-9",
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
