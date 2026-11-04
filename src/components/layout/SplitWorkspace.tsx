import type { ReactNode } from "react";
import { useT } from "../../i18n/useT";

export interface SplitWorkspaceProps {
  left: ReactNode;
  right: ReactNode;
  /** Icon buttons between the two sides: a column from lg, a row below. */
  actions?: ReactNode;
}

/**
 * Input | actions | Output: three columns from lg, stacked below. The workspace fills the
 * viewport below the top nav; each side gets a definite height so editors scroll internally.
 */
export function SplitWorkspace({ left, right, actions }: SplitWorkspaceProps) {
  const t = useT();
  return (
    <div
      className={
        "grid gap-2 lg:h-[calc(100dvh-var(--topnav-h,3rem)-6.5rem)] lg:min-h-[24rem] " +
        (actions ? "lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" : "lg:grid-cols-2")
      }
    >
      <div className="h-[45dvh] min-h-64 lg:h-auto [&>section]:h-full">{left}</div>
      {actions ? (
        <div
          role="toolbar"
          aria-label={t("toolshell.actions")}
          aria-orientation="vertical"
          className="flex flex-row flex-wrap items-center justify-center gap-1.5 lg:flex-col lg:flex-nowrap lg:self-center"
        >
          {actions}
        </div>
      ) : null}
      <div className="h-[45dvh] min-h-64 lg:h-auto [&>section]:h-full">{right}</div>
    </div>
  );
}
