import { LOCALE_META, type Locale } from "./config";

export interface Formatters {
  /** 12 Mar 2026 */
  date: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  /** 12 Mar 2026, 14:05 */
  dateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  time: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** "3 minutes ago" / "in 2 days" */
  relative: (value: Date | string | number, now?: Date | number) => string;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
  ["second", 1_000],
];

const toDate = (value: Date | string | number) => (value instanceof Date ? value : new Date(value));

/** Locale-aware formatting, so dates and numbers match the language of the page. */
export function createFormatters(locale: Locale): Formatters {
  const tag = LOCALE_META[locale].tag;

  return {
    date: (value, options) =>
      toDate(value).toLocaleDateString(tag, options ?? { dateStyle: "medium" }),
    dateTime: (value, options) =>
      toDate(value).toLocaleString(tag, options ?? { dateStyle: "medium", timeStyle: "short" }),
    time: (value, options) =>
      toDate(value).toLocaleTimeString(tag, options ?? { timeStyle: "short" }),
    number: (value, options) => new Intl.NumberFormat(tag, options).format(value),
    relative: (value, now = Date.now()) => {
      const diff = toDate(value).getTime() - (typeof now === "number" ? now : now.getTime());
      const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });

      for (const [unit, ms] of UNITS) {
        if (Math.abs(diff) >= ms || unit === "second") {
          return rtf.format(Math.round(diff / ms), unit);
        }
      }
      return rtf.format(0, "second");
    },
  };
}
