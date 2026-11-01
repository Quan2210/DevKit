import { useRef, useState } from "react";
import { Input } from "../components/common/Input";
import { ToolList } from "../components/common/ToolList";
import { useHotkeys } from "../hooks/useHotkeys";
import { useT } from "../i18n/useT";
import { homeMeta } from "../lib/seo";
import { filterTools } from "../lib/toolSearch";
import { listedTools } from "../registry/tools.meta";

export const meta = () => homeMeta();

/** Launcher, not a landing page (docs/design/ui-direction.md §4): search first, then grouped tools. */
export default function Home() {
  const t = useT();
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const tools = listedTools();
  const matches = filterTools(tools, query);

  useHotkeys([{ key: "/", handler: () => search.current?.focus() }]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold sm:text-[1.75rem] sm:leading-tight">
          {t("home.title")}
        </h1>
        <p className="max-w-[60ch] text-text-muted">{t("home.lead")}</p>
      </header>

      <Input
        ref={search}
        type="search"
        label={t("nav.search")}
        placeholder={t("nav.searchPlaceholder")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {tools.length === 0 ? (
        <p className="text-text-muted">{t("nav.empty")}</p>
      ) : matches.length === 0 ? (
        <p role="status" className="text-text-muted">
          {t("nav.noResults", { query })}
        </p>
      ) : (
        <ToolList tools={matches} label={t("home.toolsLabel")} />
      )}
    </div>
  );
}
