"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { createFormatters, type Formatters } from "./format";
import type { Messages } from "./messages/types";
import { createTranslator, type Translator } from "./translate";

interface I18nContextValue {
  locale: Locale;
  t: Translator;
  format: Formatters;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Receives the already-merged dictionary of the active locale from the root layout. */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: createTranslator(locale, messages),
      format: createFormatters(locale),
    }),
    [locale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useT/useLocale must be used inside <I18nProvider>");
  return context;
}

/** Translation function for client components. */
export function useT(): Translator {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

/** Locale-aware date, time, number and relative-time formatting. */
export function useFormat(): Formatters {
  return useI18n().format;
}
