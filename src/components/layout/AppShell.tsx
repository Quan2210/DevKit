import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router";
import { useT } from "../../i18n/useT";
import { listedTools, type ToolMeta } from "../../registry/tools.meta";
import { Dialog } from "../common/Dialog";
import { IconButton } from "../common/IconButton";
import { SidebarNav } from "./SidebarNav";
import { ThemeSwitcher } from "./ThemeSwitcher";

export interface AppShellProps {
  children: ReactNode;
  /** Tools shown in the navigation; defaults to the registry. Injectable for tests. */
  tools?: ReadonlyArray<ToolMeta>;
}

/**
 * docs/design/layouts.md §1-§2: fixed sidebar from lg, expandable rail on tablets,
 * drawer on mobile; skip link is the first focusable element.
 */
export function AppShell({ children, tools = listedTools() }: AppShellProps) {
  const t = useT();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh sm:grid sm:grid-cols-[4.5rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-on-primary"
      >
        {t("nav.skip")}
      </a>

      <aside className="relative hidden sm:block">
        <div className="group absolute inset-y-0 left-0 z-30 w-[4.5rem] overflow-x-hidden overflow-y-auto border-r border-border bg-surface transition-[width] hover:w-60 focus-within:w-60 lg:sticky lg:top-0 lg:h-dvh lg:w-60">
          <SidebarNav tools={tools} collapsible />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2 sm:justify-end">
          <div className="flex items-center gap-1 sm:hidden">
            <IconButton
              label={t("nav.openMenu")}
              icon={<Menu aria-hidden className="size-5" />}
              onClick={() => setDrawerOpen(true)}
            />
            <Link to="/" className="inline-flex min-h-10 items-center font-semibold">
              {t("app.name")}
            </Link>
          </div>
          <ThemeSwitcher />
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-3 py-4 outline-none sm:px-4 lg:px-6">
          {children}
        </main>
      </div>

      <Dialog
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={t("app.name")}
        placement="left"
      >
        <SidebarNav tools={tools} onNavigate={() => setDrawerOpen(false)} />
      </Dialog>
    </div>
  );
}
