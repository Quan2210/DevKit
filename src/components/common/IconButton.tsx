import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export type IconButtonVariant = "ghost" | "primary";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon-only button needs an accessible name. Also used as the tooltip. */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
}

const variants: Record<IconButtonVariant, string> = {
  ghost:
    "text-text hover:bg-surface-muted aria-pressed:bg-surface-muted aria-pressed:ring-1 aria-pressed:ring-border-strong",
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
};

export function IconButton({
  label,
  icon,
  className,
  variant = "ghost",
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:size-9",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
