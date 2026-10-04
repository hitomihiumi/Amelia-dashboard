import fs from "fs";
import path from "path";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";

/** Root of the English (canonical) documentation tree. */
export const CONTENT_DIR = path.join(process.cwd(), "src", "content");

const LOCALE_FOLDERS: readonly string[] = LOCALES;

/**
 * Translations live next to the English files, in `src/content/<locale>/…`.
 * Those folders must never be walked as documentation sections of their own,
 * otherwise every translated page would show up again in the English listing.
 */
export function isLocaleFolder(parentDir: string, name: string): boolean {
  return path.resolve(parentDir) === CONTENT_DIR && LOCALE_FOLDERS.includes(name);
}

/**
 * Maps a file of the English tree to the file that should be served for the locale:
 * `src/content/<locale>/<same relative path>` when it exists, the English file otherwise.
 * English stays the source of truth for which pages exist, so a missing translation
 * falls back to the English page instead of disappearing.
 */
export function resolveLocalizedFile(englishFile: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return englishFile;

  const relative = path.relative(CONTENT_DIR, englishFile);
  if (relative.startsWith("..")) return englishFile;

  const candidate = path.join(CONTENT_DIR, locale, relative);
  return fs.existsSync(candidate) ? candidate : englishFile;
}
