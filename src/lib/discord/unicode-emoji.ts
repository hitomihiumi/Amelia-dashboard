import type { Locale } from "@/i18n/config";

/** Groups of the unicode emoji set, in the order a picker shows them. */
export const UNICODE_GROUPS = [
  { key: "smileys", group: 0, glyph: "😀" },
  { key: "people", group: 1, glyph: "🧑" },
  { key: "nature", group: 3, glyph: "🐻" },
  { key: "food", group: 4, glyph: "🍔" },
  { key: "travel", group: 5, glyph: "✈️" },
  { key: "activities", group: 6, glyph: "⚽" },
  { key: "objects", group: 7, glyph: "💡" },
  { key: "symbols", group: 8, glyph: "❤️" },
  { key: "flags", group: 9, glyph: "🏳️" },
] as const;

export type UnicodeGroupKey = (typeof UNICODE_GROUPS)[number]["key"];

export interface UnicodeEmojiItem {
  unicode: string;
  /** Localised name, e.g. "waving hand". */
  label: string;
  /** Lower-cased search text: the name and the keywords, localised. */
  search: string;
}

export type UnicodeEmojiSet = Record<UnicodeGroupKey, UnicodeEmojiItem[]>;

interface RawEmoji {
  unicode: string;
  label: string;
  group?: number;
  tags?: string[];
}

/** The datasets are big (~0.5 MB each), so they are a separate chunk loaded when a picker opens. */
const LOADERS: Record<Locale, () => Promise<{ default: unknown }>> = {
  en: () => import("emojibase-data/en/compact.json"),
  ru: () => import("emojibase-data/ru/compact.json"),
  uk: () => import("emojibase-data/uk/compact.json"),
};

const cache = new Map<Locale, Promise<UnicodeEmojiSet>>();

function build(raw: RawEmoji[]): UnicodeEmojiSet {
  const set = Object.fromEntries(UNICODE_GROUPS.map((g) => [g.key, [] as UnicodeEmojiItem[]])) as UnicodeEmojiSet;
  const byGroup = new Map<number, UnicodeGroupKey>(UNICODE_GROUPS.map((g) => [g.group, g.key]));

  for (const emoji of raw) {
    if (emoji.group === undefined) continue;
    const key = byGroup.get(emoji.group);
    if (!key) continue; // "component" (skin tone swatches, hair) is not an emoji on its own
    set[key].push({
      unicode: emoji.unicode,
      label: emoji.label,
      search: [emoji.label, ...(emoji.tags ?? [])].join(" ").toLowerCase(),
    });
  }
  return set;
}

/** The emoji set in the given language; the first call per language downloads it, later ones are free. */
export function loadUnicodeEmojis(locale: Locale): Promise<UnicodeEmojiSet> {
  let pending = cache.get(locale);
  if (!pending) {
    pending = (LOADERS[locale] ?? LOADERS.en)()
      .then((mod) => build(mod.default as RawEmoji[]))
      .catch((error) => {
        cache.delete(locale); // let the next open retry
        throw error;
      });
    cache.set(locale, pending);
  }
  return pending;
}
