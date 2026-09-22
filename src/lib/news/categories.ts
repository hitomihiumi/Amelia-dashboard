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

/** Turn a title into a url friendly slug; falls back to a timestamp. */
export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return slug || `post-${Date.now()}`;
}
