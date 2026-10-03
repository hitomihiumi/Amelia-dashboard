import React from "react";
import type { IconType } from "react-icons";
import { LuMegaphone, LuRefreshCw, LuSparkles, LuWrench } from "react-icons/lu";
import {
  NEWS_CATEGORIES,
  NEWS_CATEGORY_SCHEME,
  isNewsCategory,
  type NewsCategory,
} from "@/lib/news/categories";

export const CATEGORY_ICONS: Record<NewsCategory, IconType> = {
  update: LuRefreshCw,
  feature: LuSparkles,
  maintenance: LuWrench,
  announcement: LuMegaphone,
};

export { NEWS_CATEGORIES };

/** CSS colour tokens for one category; unknown categories fall back to neutral. */
export function categoryTokens(category: string) {
  const scheme = isNewsCategory(category) ? NEWS_CATEGORY_SCHEME[category] : null;
  return scheme
    ? {
        solid: `var(--${scheme}-solid-strong)`,
        alpha: `var(--${scheme}-alpha-weak)`,
        alphaMedium: `var(--${scheme}-alpha-medium)`,
        text: `var(--${scheme}-on-background-strong)`,
      }
    : {
        solid: "var(--neutral-solid-strong)",
        alpha: "var(--neutral-alpha-weak)",
        alphaMedium: "var(--neutral-alpha-medium)",
        text: "var(--neutral-on-background-strong)",
      };
}

export function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  const Icon = isNewsCategory(category) ? CATEGORY_ICONS[category] : LuRefreshCw;
  return <Icon size={size} aria-hidden />;
}
