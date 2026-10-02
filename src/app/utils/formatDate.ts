import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { createFormatters } from "@/i18n/format";

/**
 * Long date ("August 17, 2026" / "17 августа 2026 г.") rendered in the given locale.
 * Pass the active locale from `getLocale()`; it defaults to English.
 */
export function formatDate(date: string, includeRelative = false, locale: Locale = DEFAULT_LOCALE) {
  if (!date.includes("T")) {
    date = `${date}T00:00:00`;
  }

  const format = createFormatters(locale);
  const fullDate = format.date(date, { year: "numeric", month: "long", day: "numeric" });

  if (!includeRelative) {
    return fullDate;
  }

  return `${fullDate} (${format.relative(date)})`;
}
