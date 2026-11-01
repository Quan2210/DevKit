import { DEFAULT_LOCALE } from "./index";
import type { Locale } from "./types";

const tags: Record<Locale, string> = { vi: "vi-VN" };

export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(tags[locale]).format(value);
}

export function formatDateTime(
  value: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "medium" },
  locale: Locale = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(tags[locale], options).format(value);
}

export function pluralCategory(
  count: number,
  locale: Locale = DEFAULT_LOCALE,
): Intl.LDMLPluralRule {
  return new Intl.PluralRules(tags[locale]).select(count);
}
