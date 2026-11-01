import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { GuideBlock } from "../../i18n";
import { useT } from "../../i18n/useT";
import { GROUPS, type ToolMeta } from "../../registry/tools.meta";
import { DeviceStatus } from "../common/DeviceStatus";
import { GuideContent } from "../common/GuideContent";

export interface ToolShellProps {
  tool: ToolMeta;
  /** Mode, options and the single primary action. */
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

/** Page template every tool uses (docs/design/layouts.md §3): breadcrumb, H1, toolbar, workspace, status, guide. */
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
  const group = GROUPS.find((g) => g.id === tool.group);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
      <nav aria-label={t("breadcrumb.label")} className="text-sm text-text-muted">
        <Link to="/" className="inline-flex min-h-10 items-center underline sm:hidden">
          {t("breadcrumb.back")}
        </Link>
        <ol className="hidden items-center gap-1 sm:flex">
          <li>
            <Link to="/" className="underline">
              {t("breadcrumb.tools")}
            </Link>
          </li>
          {group ? (
            <li className="flex items-center gap-1">
              <ChevronRight aria-hidden className="size-3.5" />
              <span>{t(group.labelKey)}</span>
            </li>
          ) : null}
          <li aria-current="page" className="flex items-center gap-1 text-text">
            <ChevronRight aria-hidden className="size-3.5" />
            <span>{t(tool.titleKey)}</span>
          </li>
        </ol>
      </nav>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-[1.75rem] sm:leading-tight">
          {t(tool.titleKey)}
        </h1>
        <p className="max-w-[70ch] text-text-muted">{t(tool.descriptionKey)}</p>
      </header>

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

      <div className="min-h-[60dvh] sm:min-h-[520px] lg:min-h-[calc(100dvh-20rem)]">{children}</div>

      <div
        aria-label={t("toolshell.status")}
        className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-sm"
      >
        <div className="flex flex-wrap items-center gap-3">{status}</div>
        <DeviceStatus externalRequestsEnabled={externalRequestsEnabled} />
      </div>

      {guide && guide.length > 0 ? (
        <section className="border-t border-border pt-4">
          <GuideContent blocks={guide} />
        </section>
      ) : null}
    </div>
  );
}
