import { ChevronRight, PanelLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { parseBoolean, useStoredValue } from "../../hooks/useStoredValue";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";
import { STORAGE_KEYS } from "../../lib/storage";
import { GROUPS, listedTools, toolPath, type ToolMeta } from "../../registry/tools.meta";
import { Dialog } from "../common/Dialog";
import { IconButton } from "../common/IconButton";
import { AppearanceMenu } from "./AppearanceMenu";
import { QuickSearch } from "./QuickSearch";
import { SidebarNav } from "./SidebarNav";
import { ThemeSwitcher } from "./ThemeSwitcher";

export interface AppShellProps {
  children: ReactNode;
  /** Tools shown in the navigation; defaults to the registry. Injectable for tests. */
  tools?: ReadonlyArray<ToolMeta>;
}

/**
 * Sticky top nav (toggle, breadcrumb, quick search, theme) over a sidebar that is either full or an
 * icon rail from sm, and a drawer on mobile. The CSS variables tell expanded panels where to sit.
 */
export function AppShell({ children, tools = listedTools() }: AppShellProps) {
  const t = useT();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useStoredValue(STORAGE_KEYS.sidebarExpanded, parseBoolean, true);

  const normalized = pathname.replace(/\/+$/, "");
  const current = tools.find((tool) => normalized.endsWith(toolPath(tool).replace(/\/+$/, "")));
  const group = current ? GROUPS.find((g) => g.id === current.group) : undefined;

  return (
    <div
      className={cn(
        "min-h-dvh [--sidebar-w:0px] [--topnav-h:3rem] sm:grid sm:grid-cols-[var(--sidebar-w)_minmax(0,1fr)]",
        expanded ? "sm:[--sidebar-w:15rem]" : "sm:[--sidebar-w:4.5rem]",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-on-primary"
      >
        {t("nav.skip")}
      </a>

      <aside className="relative hidden sm:block">
        <div
          data-region="nav"
          className="sticky top-0 h-dvh overflow-x-hidden overflow-y-auto border-r border-border bg-region-nav"
        >
          <SidebarNav tools={tools} collapsed={!expanded} showSearch={false} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header
          data-region="topnav"
          className="sticky top-0 z-30 flex h-[var(--topnav-h)] items-center gap-2 border-b border-border bg-region-topnav px-3"
        >
          <IconButton
            label={t("nav.toggleSidebar")}
            icon={<PanelLeft aria-hidden className="size-5" />}
            className="sm:hidden"
            onClick={() => setDrawerOpen(true)}
          />
          <IconButton
            label={t("nav.toggleSidebar")}
            icon={<PanelLeft aria-hidden className="size-5" />}
            aria-pressed={expanded}
            className="max-sm:hidden"
            onClick={() => setExpanded(!expanded)}
          />
          <nav aria-label={t("breadcrumb.label")} className="min-w-0 text-sm text-text-muted">
            {current ? (
              <ol className="flex items-center gap-1">
                {group ? (
                  <li className="hidden items-center gap-1 md:flex">
                    <span>{t(group.labelKey)}</span>
                    <ChevronRight aria-hidden className="size-3.5" />
                  </li>
                ) : null}
                <li aria-current="page" className="truncate font-medium text-text">
                  {t(current.titleKey)}
                </li>
              </ol>
            ) : (
              <Link to="/" className="font-semibold text-text">
                {t("app.name")}
              </Link>
            )}
          </nav>
          <div className="flex min-w-0 flex-1 justify-end">
            <QuickSearch tools={tools} />
          </div>
          <AppearanceMenu />
          <ThemeSwitcher />
        </header>

        <main
          id="main"
          data-region="page"
          tabIndex={-1}
          className="flex-1 px-3 py-3 outline-none sm:px-4"
        >
          {children}
        </main>
      </div>

      <Dialog
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={t("app.name")}
        placement="left"
      >
        <div data-region="nav" className="min-h-full bg-region-nav">
          <SidebarNav tools={tools} onNavigate={() => setDrawerOpen(false)} showSearch={false} />
        </div>
      </Dialog>
    </div>
  );
}
