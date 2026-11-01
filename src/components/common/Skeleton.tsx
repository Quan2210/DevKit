import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";

/** Placeholder with the final size of the content so layout does not jump when it loads. */
export function Skeleton({ className }: { className?: string }) {
  const t = useT();
  return (
    <div role="status" className={cn("animate-pulse rounded-md bg-surface-muted", className)}>
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}
