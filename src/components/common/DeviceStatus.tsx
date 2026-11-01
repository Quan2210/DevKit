import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";
import { Popover } from "./Popover";

export interface DeviceStatusProps {
  /** True only when the tool is configured to make requests that leave the browser (Markdown external images). */
  externalRequestsEnabled?: boolean;
}

/**
 * The one distinctive element (docs/design/ui-direction.md §2.4): states honestly whether the
 * current tool can send anything out of the browser, and how to verify that yourself.
 */
export function DeviceStatus({ externalRequestsEnabled = false }: DeviceStatusProps) {
  const t = useT();
  const label = externalRequestsEnabled ? t("device.external") : t("device.local");
  return (
    <Popover
      label={t("device.title")}
      triggerClassName={cn(
        "px-2 py-1 text-sm font-medium hover:bg-surface-muted",
        externalRequestsEnabled ? "text-warning-fg" : "text-info-fg",
      )}
      trigger={
        <>
          {externalRequestsEnabled ? (
            <AlertTriangle aria-hidden className="size-4" />
          ) : (
            <ShieldCheck aria-hidden className="size-4" />
          )}
          <span role={externalRequestsEnabled ? "status" : undefined}>{label}</span>
        </>
      }
    >
      <p className="font-semibold">{t("device.title")}</p>
      <p className="mt-2 text-text-muted">
        {externalRequestsEnabled ? t("device.externalBody") : t("device.body")}
      </p>
      <p className="mt-2 text-text-muted">{t("device.verify")}</p>
    </Popover>
  );
}
