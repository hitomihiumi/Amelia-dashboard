import type { NewsField } from "@/lib/news/types";

/** Everything the author edits. `slugTouched` stops the slug following the title. */
export interface FormState {
  title: string;
  slug: string;
  slugTouched: boolean;
  summary: string;
  content: string;
  category: string;
  coverUrl: string;
}

/** The saved shape of a form: the slug is already resolved, so two snapshots are comparable. */
export interface Snapshot {
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  coverUrl: string;
}

/** Server-side facts about the post that the form does not edit. */
export interface PostMeta {
  id: string | null;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
}

export type FieldErrors = Partial<Record<NewsField, string>>;

export const SUMMARY_MAX = 400;
export const TITLE_MAX = 200;
export const CONTENT_MAX = 50_000;
