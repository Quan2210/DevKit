import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface NoticeProps {
  tone: "warning" | "info";
  children: ReactNode;
}

/** Persistent, non-error message (for example "decoding only, signature not verified"). Icon + text. */
export function Notice({ tone, children }: NoticeProps) {
  const warning = tone === "warning";
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-md border p-3 text-sm",
        warning
          ? "border-warning bg-[color-mix(in_srgb,var(--color-warning)_10%,var(--color-surface))]"
          : "border-info bg-[color-mix(in_srgb,var(--color-info)_8%,var(--color-surface))]",
      )}
    >
      {warning ? (
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-fg" />
      ) : (
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-info-fg" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
