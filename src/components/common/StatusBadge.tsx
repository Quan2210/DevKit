import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export type StatusTone = "success" | "danger" | "warning" | "info" | "neutral";

const tones: Record<StatusTone, { text: string; bg: string; icon: ReactNode }> = {
  success: {
    text: "text-success-fg",
    bg: "bg-[color-mix(in_srgb,var(--color-success)_8%,var(--color-surface))]",
    icon: <CheckCircle2 aria-hidden className="size-4" />,
  },
  danger: {
    text: "text-danger",
    bg: "bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-surface))]",
    icon: <XCircle aria-hidden className="size-4" />,
  },
  warning: {
    text: "text-warning-fg",
    bg: "bg-[color-mix(in_srgb,var(--color-warning)_14%,var(--color-surface))]",
    icon: <AlertTriangle aria-hidden className="size-4" />,
  },
  info: {
    text: "text-info-fg",
    bg: "bg-[color-mix(in_srgb,var(--color-info)_12%,var(--color-surface))]",
    icon: <Info aria-hidden className="size-4" />,
  },
  neutral: { text: "text-text-muted", bg: "bg-surface-muted", icon: null },
};

/** State is always icon + text + colour, never colour alone (WCAG 1.4.1). */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  const style = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium",
        style.text,
        style.bg,
      )}
    >
      {style.icon}
      {children}
    </span>
  );
}
