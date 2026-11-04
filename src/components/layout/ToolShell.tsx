import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import type { GuideBlock } from "../../i18n";
import { useT } from "../../i18n/useT";
import type { ToolMeta } from "../../registry/tools.meta";
import { DeviceStatus } from "../common/DeviceStatus";
import { GuideContent } from "../common/GuideContent";

export interface ToolShellProps {
  tool: ToolMeta;
  /** Mode, options and actions for tools without a split workspace (split tools put them between the panes). */
  toolbar?: ReactNode;
  /** Inline errors or notices between the toolbar and the workspace. */
  notice?: ReactNode;
  /** Left side of the status bar: validity, counts. */
  status?: ReactNode;
  /** True only when the tool can send requests out of the browser (Markdown external images). */
  externalRequestsEnabled?: boolean;
  /** Help, limits and FAQ as structured content; also the page's SEO text. */
  guide?: ReadonlyArray<GuideBlock>;
  /** The workspace (editors, previews). */
  children: ReactNode;
}

/**
 * Page template every tool uses (docs/design/layouts.md §3). The breadcrumb lives in the top nav;
 * the title is kept for assistive tech and SEO only. Guide is a collapsed section at the bottom.
 */
export function ToolShell({
  tool,
  toolbar,
  notice,
  status,
  externalRequestsEnabled = false,
  guide,
  children,
}: ToolShellProps) {
  const t = useT();

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3">
      <h1 className="sr-only">{t(tool.titleKey)}</h1>
      <p className="sr-only">{t(tool.descriptionKey)}</p>

      {toolbar ? (
        <div
          role="toolbar"
          aria-label={t("toolshell.toolbar")}
          className="flex flex-wrap items-center gap-2"
        >
          {toolbar}
        </div>
      ) : null}

      {notice}

      <div className="min-h-[60dvh] sm:min-h-[420px]">{children}</div>

      <div
        aria-label={t("toolshell.status")}
        className="flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-sm"
      >
        <div className="flex flex-wrap items-center gap-3">{status}</div>
        <DeviceStatus externalRequestsEnabled={externalRequestsEnabled} />
      </div>

      {guide && guide.length > 0 ? (
        <details className="group rounded-lg border border-border bg-surface">
          <summary className="flex min-h-10 cursor-pointer items-center gap-2 px-3 text-sm font-medium">
            <BookOpen aria-hidden className="size-4" />
            {t("toolshell.guide")}
          </summary>
          <div className="border-t border-border px-4 pb-4">
            <GuideContent blocks={guide} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
