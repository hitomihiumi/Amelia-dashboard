export const LOCALES = ["en", "ru", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "amelia-locale";

export interface LocaleMeta {
  /** Name in the language itself, shown in the switcher. */
  nativeName: string;
  flag: string;
  /** BCP 47 tag used for Intl formatting and the <html lang> attribute. */
  tag: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { nativeName: "English", flag: "🇬🇧", tag: "en" },
  ru: { nativeName: "Русский", flag: "🇷🇺", tag: "ru" },
  uk: { nativeName: "Українська", flag: "🇺🇦", tag: "uk" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the best supported locale from an Accept-Language header,
 * honouring q-values; falls back to the default.
 */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number.parseFloat(q.slice(2)) : 1 };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}
