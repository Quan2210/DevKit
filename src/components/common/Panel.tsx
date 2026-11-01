import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "../../lib/cn";

export interface PanelProps {
  title: string;
  /** Secondary actions (Copy, Clear...) shown on the right of the header. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Bordered region for one side of a workspace (Input | Output). Border, not shadow. */
export function Panel({ title, actions, children, className }: PanelProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex min-w-0 flex-col rounded-lg border border-border bg-surface", className)}
    >
      <header className="flex min-h-11 items-center justify-between gap-2 border-b border-border px-3">
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
