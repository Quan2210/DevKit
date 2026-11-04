import { Maximize2, Minimize2 } from "lucide-react";
import type { ClipboardEventHandler, ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";
import { IconButton } from "./IconButton";

export interface PanelProps {
  title: string;
  /** Secondary actions (Copy, Clear...) shown on the right of the header. */
  actions?: ReactNode;
  /** Row of tools under the title (view mode, undo...). Icon buttons with tooltips. */
  toolbar?: ReactNode;
  /** Rows under the toolbar (breadcrumb, search, query). Each child draws its own bottom border. */
  subbar?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Paste anywhere in the panel, including its toolbar (a view that cannot take text itself uses it). */
  onPaste?: ClipboardEventHandler<HTMLElement>;
  /** Adds an expand button that fills the content area (below the top nav, beside the sidebar). */
  expandable?: boolean;
}

/** Bordered region for one side of a workspace (Input | Output). Border, not shadow. */
export function Panel({
  title,
  actions,
  toolbar,
  subbar,
  children,
  className,
  onPaste,
  expandable = false,
}: PanelProps) {
  const t = useT();
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <section
      aria-labelledby={headingId}
      onPaste={onPaste}
      className={cn(
        "flex min-w-0 flex-col border border-border bg-surface",
        expanded
          ? "fixed top-[var(--topnav-h,3rem)] right-0 bottom-0 left-[var(--sidebar-w,0px)] z-40 h-auto! rounded-none"
          : "rounded-lg",
        className,
      )}
    >
      <header className="flex min-h-10 flex-wrap items-center justify-between gap-x-2 border-b border-border px-3">
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        <div className="flex items-center gap-1">
          {actions}
          {expandable ? (
            <IconButton
              label={expanded ? t("panel.collapse") : t("panel.expand")}
              aria-pressed={expanded}
              onClick={() => setExpanded((value) => !value)}
              icon={
                expanded ? (
                  <Minimize2 aria-hidden className="size-4" />
                ) : (
                  <Maximize2 aria-hidden className="size-4" />
                )
              }
            />
          ) : null}
        </div>
      </header>
      {toolbar ? (
        <div
          role="toolbar"
          aria-label={title}
          className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1"
        >
          {toolbar}
        </div>
      ) : null}
      {subbar}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
