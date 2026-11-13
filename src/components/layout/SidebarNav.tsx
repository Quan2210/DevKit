import { useId, useState } from "react";
import { NavLink } from "react-router";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";
import { filterTools, groupTools } from "../../lib/toolSearch";
import { toolPath, type ToolMeta } from "../../registry/tools.meta";
import { ToolIcon } from "../common/ToolIcon";

/** Logo glyph; a brand mark, not translatable text. */
const BRAND_GLYPH = "K";

export interface SidebarNavProps {
  tools: ReadonlyArray<ToolMeta>;
  /** Called when a link is followed (closes the mobile drawer). */
  onNavigate?: () => void;
  /** Icon rail: labels are hidden (kept as tooltip and accessible name). */
  collapsed?: boolean;
  /** In-list search; the top nav has the quick search, so the shell turns this off. */
  showSearch?: boolean;
}

export function SidebarNav({
  tools,
  onNavigate,
  collapsed = false,
  showSearch = true,
}: SidebarNavProps) {
  const t = useT();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const matches = filterTools(tools, query);
  const label = collapsed ? "sr-only" : "";

  return (
    <nav aria-label={t("nav.main")} className="flex flex-col gap-3 p-3">
      <NavLink
        to="/"
        onClick={onNavigate}
        title={t("app.name")}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-base font-semibold"
      >
        <span
          aria-hidden
          className="grid size-6 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-on-primary"
        >
          {BRAND_GLYPH}
        </span>
        <span className={label}>{t("app.name")}</span>
      </NavLink>

      {showSearch ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={searchId} className="text-sm font-medium">
            {t("nav.search")}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("nav.searchPlaceholder")}
            className="min-h-11 sm:min-h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-sm placeholder:text-text-muted"
          />
        </div>
      ) : null}

      {tools.length === 0 ? (
        <p className={cn("text-sm text-text-muted", label)}>{t("nav.empty")}</p>
      ) : matches.length === 0 ? (
        <p role="status" className={cn("text-sm text-text-muted", label)}>
          {t("nav.noResults", { query })}
        </p>
      ) : (
        groupTools(matches).map((group) => (
          <div key={group.id} className={collapsed ? "border-t border-border pt-2" : undefined}>
            <p className={cn("mb-1 px-2 text-sm font-semibold text-text-muted", label)}>
              {t(group.labelKey)}
            </p>
            <ul className="space-y-0.5">
              {group.tools.map((tool) => (
                <li key={tool.id}>
                  <NavLink
                    to={toolPath(tool)}
                    onClick={onNavigate}
                    title={t(tool.titleKey)}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-11 sm:min-h-9 items-center gap-2 rounded-md px-2 text-sm",
                        isActive ? "bg-surface-muted font-medium" : "hover:bg-surface-muted",
                      )
                    }
                  >
                    <ToolIcon name={tool.icon} className="size-4 shrink-0" />
                    <span className={label}>{t(tool.titleKey)}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </nav>
  );
}
