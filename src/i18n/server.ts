import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, negotiateLocale, type Locale } from "./config";
import { createFormatters, type Formatters } from "./format";
import { loadMessages } from "./messages";
import { createTranslator, type Translator } from "./translate";

/**
 * The visitor's locale: the cookie set by the language switcher, otherwise the
 * browser's Accept-Language, otherwise English. Cached per request.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(stored)) return stored;

    return negotiateLocale((await headers()).get("accept-language"));
  } catch {
    // Outside a request (build time, scripts).
    return DEFAULT_LOCALE;
  }
});

/** Translator for server components, server actions and `generateMetadata`. */
export async function getT(): Promise<Translator> {
  const locale = await getLocale();
  return createTranslator(locale, loadMessages(locale));
}

export async function getFormatters(): Promise<Formatters> {
  return createFormatters(await getLocale());
}

export { loadMessages };
