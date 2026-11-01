import { translate, DEFAULT_LOCALE } from "../i18n";
import { GROUPS, type GroupId, type ToolMeta } from "../registry/tools.meta";

/** Case-insensitive match on title, description and keywords. Empty query matches everything. */
export function filterTools(tools: ReadonlyArray<ToolMeta>, query: string): ToolMeta[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...tools];
  return tools.filter((tool) => {
    const haystack = [
      translate(DEFAULT_LOCALE, tool.titleKey),
      translate(DEFAULT_LOCALE, tool.descriptionKey),
      ...tool.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export interface ToolGroup {
  id: GroupId;
  labelKey: (typeof GROUPS)[number]["labelKey"];
  tools: ToolMeta[];
}

/** Group tools in registry group order, dropping empty groups. */
export function groupTools(tools: ReadonlyArray<ToolMeta>): ToolGroup[] {
  return GROUPS.map((group) => ({
    id: group.id,
    labelKey: group.labelKey,
    tools: tools.filter((tool) => tool.group === group.id),
  })).filter((group) => group.tools.length > 0);
}
