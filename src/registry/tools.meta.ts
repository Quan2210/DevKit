/**
 * Tool registry: the single source of truth for routes, navigation, Home, sitemap and SEO.
 * Pure data and helpers only (no React, no browser globals) because `routes.ts`,
 * `react-router.config.ts` and Node build scripts import this file directly.
 */
import type { MessageKey } from "../i18n/locales/vi";

export type GroupId = "data" | "encoding" | "generator" | "writing" | "color" | "developer";

export type ToolIconName =
  | "braces"
  | "code"
  | "key"
  | "binary"
  | "fingerprint"
  | "file-text"
  | "pipette"
  | "palette"
  | "contrast"
  | "blend"
  | "database";

/** `planned` tools have metadata but no route, nav entry, Home row or sitemap entry yet. */
export type ToolStatus = "ready" | "planned";

export interface ToolMeta {
  id: string;
  /** URL segment under /tools/. */
  slug: string;
  group: GroupId;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  /** Extra search terms; language-neutral abbreviations and synonyms. */
  keywords: string[];
  priority: "P0" | "P1" | "P2";
  status: ToolStatus;
  /** Hidden tools are routable but not listed (SQL Formatter in v1). */
  hidden?: boolean;
  icon: ToolIconName;
  /** Route module relative to `src/`. */
  routeFile: string;
}

export const GROUPS: ReadonlyArray<{ id: GroupId; labelKey: MessageKey }> = [
  { id: "data", labelKey: "group.data" },
  { id: "encoding", labelKey: "group.encoding" },
  { id: "generator", labelKey: "group.generator" },
  { id: "writing", labelKey: "group.writing" },
  { id: "color", labelKey: "group.color" },
  { id: "developer", labelKey: "group.developer" },
];

export const TOOLS: ReadonlyArray<ToolMeta> = [
  {
    id: "json",
    slug: "json-formatter",
    group: "data",
    titleKey: "tool.json.title",
    descriptionKey: "tool.json.description",
    keywords: ["json", "format", "minify", "validate"],
    priority: "P0",
    status: "ready",
    icon: "braces",
    routeFile: "routes/tools/json-formatter.tsx",
  },
  {
    id: "xml",
    slug: "xml-formatter",
    group: "data",
    titleKey: "tool.xml.title",
    descriptionKey: "tool.xml.description",
    keywords: ["xml", "format", "minify", "validate"],
    priority: "P1",
    status: "ready",
    icon: "code",
    routeFile: "routes/tools/xml-formatter.tsx",
  },
  {
    id: "jwt",
    slug: "jwt-decoder",
    group: "encoding",
    titleKey: "tool.jwt.title",
    descriptionKey: "tool.jwt.description",
    keywords: ["jwt", "token", "decode", "claims"],
    priority: "P0",
    status: "ready",
    icon: "key",
    routeFile: "routes/tools/jwt-decoder.tsx",
  },
  {
    id: "base64",
    slug: "base64",
    group: "encoding",
    titleKey: "tool.base64.title",
    descriptionKey: "tool.base64.description",
    keywords: ["base64", "base64url", "encode", "decode"],
    priority: "P0",
    status: "ready",
    icon: "binary",
    routeFile: "routes/tools/base64.tsx",
  },
  {
    id: "uuid",
    slug: "uuid-generator",
    group: "generator",
    titleKey: "tool.uuid.title",
    descriptionKey: "tool.uuid.description",
    keywords: ["uuid", "guid", "v4", "random"],
    priority: "P0",
    status: "ready",
    icon: "fingerprint",
    routeFile: "routes/tools/uuid-generator.tsx",
  },
  {
    id: "markdown",
    slug: "markdown-preview",
    group: "writing",
    titleKey: "tool.markdown.title",
    descriptionKey: "tool.markdown.description",
    keywords: ["markdown", "md", "preview", "gfm"],
    priority: "P1",
    status: "ready",
    icon: "file-text",
    routeFile: "routes/tools/markdown-preview.tsx",
  },
  {
    id: "color-picker",
    slug: "color-picker",
    group: "color",
    titleKey: "tool.colorPicker.title",
    descriptionKey: "tool.colorPicker.description",
    keywords: ["color", "hex", "rgb", "rgba", "hsl"],
    priority: "P1",
    status: "ready",
    icon: "pipette",
    routeFile: "routes/tools/color-picker.tsx",
  },
  {
    id: "color-palette",
    slug: "color-palette",
    group: "color",
    titleKey: "tool.colorPalette.title",
    descriptionKey: "tool.colorPalette.description",
    keywords: ["palette", "harmony", "css variables"],
    priority: "P1",
    status: "ready",
    icon: "palette",
    routeFile: "routes/tools/color-palette.tsx",
  },
  {
    id: "color-contrast",
    slug: "color-contrast",
    group: "color",
    titleKey: "tool.colorContrast.title",
    descriptionKey: "tool.colorContrast.description",
    keywords: ["contrast", "wcag", "accessibility", "aa", "aaa"],
    priority: "P1",
    status: "ready",
    icon: "contrast",
    routeFile: "routes/tools/color-contrast.tsx",
  },
  {
    id: "css-gradient",
    slug: "css-gradient",
    group: "color",
    titleKey: "tool.cssGradient.title",
    descriptionKey: "tool.cssGradient.description",
    keywords: ["gradient", "linear", "radial", "css"],
    priority: "P1",
    status: "ready",
    icon: "blend",
    routeFile: "routes/tools/css-gradient.tsx",
  },
  {
    id: "sql",
    slug: "sql-formatter",
    group: "developer",
    titleKey: "tool.sql.title",
    descriptionKey: "tool.sql.description",
    keywords: ["sql", "format", "query"],
    priority: "P2",
    status: "planned",
    hidden: true,
    icon: "database",
    routeFile: "routes/tools/sql-formatter.tsx",
  },
];

/** Tools that have a route (including hidden ones). */
export function routableTools(tools: ReadonlyArray<ToolMeta> = TOOLS): ToolMeta[] {
  return tools.filter((tool) => tool.status === "ready");
}

/** Tools shown in navigation, on Home and in the sitemap. */
export function listedTools(tools: ReadonlyArray<ToolMeta> = TOOLS): ToolMeta[] {
  return routableTools(tools).filter((tool) => !tool.hidden);
}

export function toolPath(tool: Pick<ToolMeta, "slug">): string {
  return `/tools/${tool.slug}`;
}

/** Look up a tool by id; throws on a typo so a route can never render without metadata. */
export function getTool(id: string): ToolMeta {
  const tool = TOOLS.find((candidate) => candidate.id === id);
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}
