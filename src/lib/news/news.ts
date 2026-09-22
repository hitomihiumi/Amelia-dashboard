import "server-only";

import type { NewsPost } from "@prisma/client";
import { prisma } from "@/lib/db/db";
import { NEWS_PAGE_SIZE, type NewsCategory } from "./categories";

export * from "./categories";

/** Published posts only — drafts stay in the admin panel. */
export async function getPublishedPosts(options: {
  category?: NewsCategory | null;
  page?: number;
  take?: number;
}): Promise<{ posts: NewsPost[]; total: number }> {
  const take = options.take ?? NEWS_PAGE_SIZE;
  const page = Math.max(1, options.page ?? 1);

  const where = {
    published: true,
    ...(options.category ? { category: options.category } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.newsPost.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * take,
      take,
    }),
    prisma.newsPost.count({ where }),
  ]);

  return { posts, total };
}

export async function getPostBySlug(slug: string): Promise<NewsPost | null> {
  return await prisma.newsPost.findFirst({ where: { slug, published: true } });
}

/** Every post, drafts included. Admin panel only. */
export async function getAllPosts(): Promise<NewsPost[]> {
  return await prisma.newsPost.findMany({ orderBy: { updatedAt: "desc" } });
}
