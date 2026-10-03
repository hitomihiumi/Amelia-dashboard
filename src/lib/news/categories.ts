/**
 * News constants shared by the server and the admin editor.
 * Kept apart from `news.ts` because that module is server only.
 */

export const NEWS_CATEGORIES = ["update", "feature", "maintenance", "announcement"] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  update: "Update",
  feature: "Feature",
  maintenance: "Maintenance",
  announcement: "Announcement",
};

export const NEWS_PAGE_SIZE = 9;

export function isNewsCategory(value: string | null | undefined): value is NewsCategory {
  return Boolean(value) && NEWS_CATEGORIES.includes(value as NewsCategory);
}

export const NEWS_SLUG_MAX = 80;

/** Visual identity of a category, shared by the list, the picker and the previews. */
export const NEWS_CATEGORY_SCHEME: Record<
  NewsCategory,
  "brand" | "accent" | "warning" | "info"
> = {
  update: "brand",
  feature: "accent",
  maintenance: "warning",
  announcement: "info",
};

// Cyrillic -> Latin, following the common passport-style (BGN/PCGN-like) conventions.
const RU: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

// Ukrainian differs in several letters (г, и, е-like ones) and adds і ї є ґ.
const UK: Record<string, string> = {
  ...RU,
  г: "h", ґ: "g", е: "e", є: "ye", и: "y", і: "i", ї: "yi", й: "y", щ: "shch", ь: "", ю: "yu", я: "ya",
  ъ: "", ы: "y", э: "e", ё: "yo",
};

const UK_ONLY = /[іїєґ]/;

/** Transliterates Russian and Ukrainian text; the Ukrainian table is used when the text has і ї є ґ. */
export function transliterate(value: string): string {
  const lower = value.toLowerCase();
  const table = UK_ONLY.test(lower) ? UK : RU;

  let out = "";
  for (const ch of lower) out += ch in table ? table[ch] : ch;
  return out;
}

/**
 * Turns text into a URL-safe slug and returns "" when nothing usable is left.
 * Deterministic and free of server-only APIs, so the editor can preview it live.
 */
export function toSlug(value: string): string {
  return transliterate(value)
    // Apostrophes vanish instead of splitting words: "м'яч" -> "myach".
    .replace(/['’ʼ`]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, NEWS_SLUG_MAX)
    .replace(/-$/g, "");
}

/** Turn a title into a url friendly slug; falls back to a timestamp. */
export function slugify(value: string): string {
  return toSlug(value) || `post-${Date.now()}`;
}
