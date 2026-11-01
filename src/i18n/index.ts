import { viGuides } from "./guides/vi";
import { vi, type MessageKey } from "./locales/vi";
import type { Catalog, GuideBlock, Locale, MessageParams } from "./types";

export type { Catalog, GuideBlock, Locale, MessageParams } from "./types";
export type { MessageKey } from "./locales/vi";

export const DEFAULT_LOCALE: Locale = "vi";

const catalogs: Record<Locale, Catalog> = { vi };

/**
 * Translate a key. Not a hook, so it also works in route `meta` exports and build scripts.
 * `{name}` placeholders are replaced from `params`; unknown placeholders are left as written.
 */
export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const template = catalogs[locale][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export const t = (key: MessageKey, params?: MessageParams): string =>
  translate(DEFAULT_LOCALE, key, params);

const guides: Record<Locale, Record<string, GuideBlock[]>> = { vi: viGuides };

/** Structured help content for a tool (usage, limits, FAQ); empty when a tool has none yet. */
export function getGuide(locale: Locale, toolId: string): GuideBlock[] {
  return guides[locale][toolId] ?? [];
}
