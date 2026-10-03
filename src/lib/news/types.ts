/** Plain, serialisable shapes shared by the admin pages, the editor and the server actions. */

export interface NewsPostDTO {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  coverUrl: string;
  published: boolean;
  /** ISO dates, so the object can cross the server/client boundary. */
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveNewsInput {
  /** Empty or missing means "create". */
  id?: string;
  title: string;
  /** Empty means "generate from the title". */
  slug: string;
  summary: string;
  content: string;
  category: string;
  coverUrl: string;
  published: boolean;
}

export type NewsField = "title" | "slug" | "summary" | "content" | "category" | "coverUrl";

export type SaveNewsResult =
  | {
      ok: true;
      id: string;
      slug: string;
      published: boolean;
      publishedAt: string | null;
      updatedAt: string;
    }
  | { ok: false; error: string; field?: NewsField };

export type SetPublishedResult =
  | { ok: true; published: boolean; publishedAt: string | null }
  | { ok: false; error: string };

export type DeleteNewsResult = { ok: true } | { ok: false; error: string };

/** The server actions, injected by the pages so the client components stay testable. */
export interface NewsActions {
  save: (input: SaveNewsInput) => Promise<SaveNewsResult>;
  setPublished: (id: string, published: boolean) => Promise<SetPublishedResult>;
  remove: (id: string) => Promise<DeleteNewsResult>;
}
