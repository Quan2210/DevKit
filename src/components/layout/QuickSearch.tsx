import { Search } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { useHotkeys } from "../../hooks/useHotkeys";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";
import { filterTools } from "../../lib/toolSearch";
import { toolPath, type ToolMeta } from "../../registry/tools.meta";
import { ToolIcon } from "../common/ToolIcon";

/** Top-nav quick jump to a tool page: Ctrl/Cmd+K focuses it, arrows pick, Enter opens. */
export function QuickSearch({ tools }: { tools: ReadonlyArray<ToolMeta> }) {
  const t = useT();
  const navigate = useNavigate();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = query.trim() === "" ? [] : filterTools(tools, query).slice(0, 8);
  const showList = open && query.trim() !== "";

  useHotkeys([
    {
      key: "k",
      mod: true,
      allowInInput: true,
      handler: () => {
        input.current?.focus();
        input.current?.select();
      },
    },
  ]);

  const go = (tool: ToolMeta) => {
    setQuery("");
    setOpen(false);
    input.current?.blur();
    void navigate(toolPath(tool));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && matches.length > 0) {
      event.preventDefault();
      setActive((active + 1) % matches.length);
    } else if (event.key === "ArrowUp" && matches.length > 0) {
      event.preventDefault();
      setActive((active - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      const target = matches[active] ?? matches[0];
      if (target) {
        event.preventDefault();
        go(target);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      input.current?.blur();
    }
  };

  return (
    <div className="relative w-full max-w-sm">
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label={t("nav.quickSearch")}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && matches[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={query}
        placeholder={t("nav.quickSearchPlaceholder")}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="min-h-9 w-full rounded-lg border border-border-strong bg-surface py-1 pr-16 pl-3 text-sm placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1.5 text-text-muted"
      >
        <kbd className="hidden rounded border border-border px-1 font-mono text-xs md:inline">
          {"Ctrl K"}
        </kbd>
        <Search className="size-4" />
      </span>
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("nav.quickResults")}
          className="absolute top-full right-0 left-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {matches.length === 0 ? (
            <li role="option" aria-selected={false} className="px-3 py-2 text-sm text-text-muted">
              {t("nav.noResults", { query })}
            </li>
          ) : (
            matches.map((tool, index) => (
              <li
                key={tool.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                // mousedown, not click: the input's blur would close the list before a click lands
                onMouseDown={(event) => {
                  event.preventDefault();
                  go(tool);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm",
                  index === active && "bg-surface-muted",
                )}
              >
                <ToolIcon name={tool.icon} className="size-4 shrink-0" />
                {t(tool.titleKey)}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
