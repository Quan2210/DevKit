import { XCircle } from "lucide-react";
import type { ReactNode } from "react";

export interface ErrorBannerProps {
  /** One sentence naming the cause. Never a vague "Có lỗi xảy ra". */
  title: string;
  detail?: ReactNode;
  /** Text of the position link, e.g. "Dòng 12, cột 5". Shown only together with `onJump`. */
  locationLabel?: string;
  onJump?: () => void;
}

/** Inline error next to the output; icon + text so colour is never the only signal. */
export function ErrorBanner({ title, detail, locationLabel, onJump }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-md border border-danger bg-[color-mix(in_srgb,var(--color-danger)_8%,var(--color-surface))] p-3 text-sm"
    >
      <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-danger">{title}</p>
        {detail ? <p className="text-text">{detail}</p> : null}
        {locationLabel && onJump ? (
          <button type="button" onClick={onJump} className="font-medium text-primary underline">
            {locationLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
