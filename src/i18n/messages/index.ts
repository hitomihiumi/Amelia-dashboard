import type { Locale } from "../config";
import { en } from "./en";
import { ru } from "./ru";
import { uk } from "./uk";
import type { Messages } from "./types";

const REGISTRY: Record<Locale, Messages> = { en, ru, uk };

function merge<T>(base: T, override: unknown): T {
  if (!override || typeof override !== "object") return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    const current = out[key];
    out[key] =
      current && typeof current === "object" && value && typeof value === "object"
        ? merge(current, value)
        : (value ?? current);
  }
  return out as T;
}

/** English underneath, so a string missing from a translation shows English rather than a key. */
export function loadMessages(locale: Locale): Messages {
  return locale === "en" ? en : merge(en, REGISTRY[locale]);
}

export type { Messages, MessageKey } from "./types";
