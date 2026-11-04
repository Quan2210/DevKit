import { CircleQuestionMark } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { GuideBlock } from "../../i18n";
import { useT } from "../../i18n/useT";
import type { ToolMeta } from "../../registry/tools.meta";
import { cn } from "../../lib/cn";
import { DeviceStatus } from "../common/DeviceStatus";
import { Dialog } from "../common/Dialog";
import { GuideContent } from "../common/GuideContent";
import { IconButton } from "../common/IconButton";

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
  /**
   * From lg the page is exactly one screen tall and the workspace takes what the toolbar, notices and
   * status bar leave, so only the editors scroll, never the page.
   */
  fill?: boolean;
  /** The workspace (editors, previews). */
  children: ReactNode;
}

/**
 * Page template every tool uses (docs/design/layouts.md §3). The breadcrumb lives in the top nav;
 * the title is kept for assistive tech and SEO only. The guide opens from the ? in the status bar.
 */
export function ToolShell({
  tool,
  toolbar,
  notice,
  status,
  externalRequestsEnabled = false,
  guide,
  fill = false,
  children,
}: ToolShellProps) {
  const t = useT();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1800px] flex-col gap-3",
        // main has py-3, hence the 1.5rem
        fill && "lg:h-[calc(100dvh-var(--topnav-h,3rem)-1.5rem)]",
      )}
    >
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

      <div className={cn("min-h-[60dvh] sm:min-h-[420px]", fill && "lg:min-h-0 lg:flex-1")}>
        {children}
      </div>

      <div
        aria-label={t("toolshell.status")}
        className="flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-sm"
      >
        <div className="flex flex-wrap items-center gap-3">{status}</div>
        <div className="flex items-center gap-1">
          {guide && guide.length > 0 ? (
            <IconButton
              label={t("toolshell.guide")}
              aria-haspopup="dialog"
              icon={<CircleQuestionMark aria-hidden className="size-4" />}
              onClick={() => setGuideOpen(true)}
            />
          ) : null}
          <DeviceStatus externalRequestsEnabled={externalRequestsEnabled} />
        </div>
      </div>

      {guide && guide.length > 0 ? (
        // Always in the page (closed it is display:none), so the guide text stays in the prerendered HTML.
        <Dialog
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          title={t("toolshell.guide")}
          placement="right"
        >
          <GuideContent blocks={guide} />
        </Dialog>
      ) : null}
    </div>
  );
}
