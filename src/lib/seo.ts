import { translate, DEFAULT_LOCALE, type MessageKey } from "../i18n";
import type { ToolMeta } from "../registry/tools.meta";
import { toolPath } from "../registry/tools.meta";
import { buildUrl } from "./url";

export interface PageSeo {
  title: string;
  description: string;
  /** Page path without base, e.g. "/" or "/tools/json-formatter". */
  path: string;
}

type MetaDescriptor =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { tagName: "link"; rel: string; href: string };

/** Title, description, Open Graph, Twitter Card and canonical for one page (SD-2). */
export function buildMeta({ title, description, path }: PageSeo): MetaDescriptor[] {
  const url = buildUrl(path);
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:locale", content: "vi_VN" },
    { property: "og:site_name", content: translate(DEFAULT_LOCALE, "app.name") },
    { property: "og:image", content: buildUrl("/og-default.png") },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: buildUrl("/og-default.png") },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { tagName: "link", rel: "canonical", href: url },
  ];
}

const msg = (key: MessageKey): string => translate(DEFAULT_LOCALE, key);

export function homeMeta(): MetaDescriptor[] {
  return buildMeta({
    title: msg("home.metaTitle"),
    description: msg("home.metaDescription"),
    path: "/",
  });
}

export function notFoundMeta(): MetaDescriptor[] {
  return buildMeta({
    title: msg("notFound.metaTitle"),
    description: msg("notFound.metaDescription"),
    path: "/404",
  });
}

/** `<title>` is "<tool> - DevKit"; description comes from the registry entry. */
export function toolMeta(tool: ToolMeta): MetaDescriptor[] {
  return buildMeta({
    title: `${msg(tool.titleKey)} - ${msg("app.name")}`,
    description: msg(tool.descriptionKey),
    path: toolPath(tool),
  });
}
