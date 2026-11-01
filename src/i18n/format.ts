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

/** "3 giờ trước" / "sau 2 ngày" for a number of seconds from now (negative = past). */
export function formatRelative(seconds: number, locale: Locale = DEFAULT_LOCALE): string {
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat(tags[locale], { numeric: "always" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.trunc(seconds / size), unit);
  }
  return formatter.format(Math.trunc(seconds), "second");
}
