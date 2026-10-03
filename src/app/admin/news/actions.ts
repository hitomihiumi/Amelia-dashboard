"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { requireSiteAdmin } from "@/lib/admin/access";
import { NEWS_CATEGORIES, slugify } from "@/lib/news/categories";
import type {
  DeleteNewsResult,
  SaveNewsInput,
  SaveNewsResult,
  SetPublishedResult,
} from "@/lib/news/types";
import { getT } from "@/i18n/server";

function revalidateNews(...slugs: Array<string | undefined>) {
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/admin/news");
  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/news/${slug}`);
  }
}

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Create or update a post. A missing or empty `id` means "create". */
export async function saveNewsPost(input: SaveNewsInput): Promise<SaveNewsResult> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const id = str(input?.id);
    const title = str(input?.title);
    const content = str(input?.content);
    const category = str(input?.category) || "update";
    const summary = str(input?.summary);
    const coverUrl = str(input?.coverUrl);
    const published = input?.published === true;
    const slugInput = str(input?.slug);

    if (title.length < 3 || title.length > 200) {
      return { ok: false, field: "title", error: t("adminNews.errors.titleLength") };
    }
    if (!content) return { ok: false, field: "content", error: t("adminNews.errors.bodyEmpty") };
    if (content.length > 50_000) {
      return { ok: false, field: "content", error: t("adminNews.errors.bodyTooLong") };
    }
    if (!NEWS_CATEGORIES.includes(category as never)) {
      return { ok: false, field: "category", error: t("adminNews.errors.unknownCategory") };
    }
    if (summary.length > 400) {
      return { ok: false, field: "summary", error: t("adminNews.errors.summaryTooLong") };
    }
    if (coverUrl && !/^https?:\/\/\S+$/i.test(coverUrl)) {
      return { ok: false, field: "coverUrl", error: t("adminNews.errors.coverInvalid") };
    }

    const slug = slugify(slugInput || title);

    // Slugs are the public URL, so they have to stay unique.
    const clash = await prisma.newsPost.findFirst({
      where: { slug, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    if (clash) {
      return { ok: false, field: "slug", error: t("adminNews.errors.slugTaken", { slug }) };
    }

    const data = {
      slug,
      title,
      summary: summary || null,
      content,
      category,
      coverUrl: coverUrl || null,
      published,
    };

    if (id) {
      const existing = await prisma.newsPost.findUnique({ where: { id } });
      if (!existing) return { ok: false, error: t("adminNews.errors.postNotFound") };

      const post = await prisma.newsPost.update({
        where: { id },
        data: {
          ...data,
          // The publication date is set once, when the post first goes live.
          publishedAt: published ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        },
      });

      revalidateNews(post.slug, existing.slug);
      return {
        ok: true,
        id: post.id,
        slug: post.slug,
        published: post.published,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        updatedAt: post.updatedAt.toISOString(),
      };
    }

    const post = await prisma.newsPost.create({
      data: {
        ...data,
        authorId: gate.admin.id,
        publishedAt: published ? new Date() : null,
      },
    });

    revalidateNews(post.slug);
    return {
      ok: true,
      id: post.id,
      slug: post.slug,
      published: post.published,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      updatedAt: post.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("[Admin News Error]:", error);
    return { ok: false, error: t("adminNews.errors.saveFailed") };
  }
}

/** Publish or unpublish without touching the rest of the post. */
export async function setNewsPublished(
  id: string,
  published: boolean,
): Promise<SetPublishedResult> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const existing = await prisma.newsPost.findUnique({ where: { id: str(id) } });
    if (!existing) return { ok: false, error: t("adminNews.errors.postNotFound") };

    const post = await prisma.newsPost.update({
      where: { id: existing.id },
      data: {
        published: published === true,
        publishedAt:
          published === true ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      },
    });

    revalidateNews(post.slug);
    return {
      ok: true,
      published: post.published,
      publishedAt: post.publishedAt?.toISOString() ?? null,
    };
  } catch (error) {
    console.error("[Admin News Publish Error]:", error);
    return { ok: false, error: t("adminNews.errors.saveFailed") };
  }
}

export async function deleteNewsPost(id: string): Promise<DeleteNewsResult> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const post = await prisma.newsPost.delete({ where: { id: str(id) } });

    revalidateNews(post.slug);
    return { ok: true };
  } catch (error) {
    console.error("[Admin News Delete Error]:", error);
    return { ok: false, error: t("adminNews.errors.deleteFailed") };
  }
}
