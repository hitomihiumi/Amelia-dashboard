import "server-only";

import type { NewsPost } from "@prisma/client";
import { prisma } from "@/lib/db/db";
import { NEWS_PAGE_SIZE, type NewsCategory } from "./categories";
import type { NewsPostDTO } from "./types";

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

export async function getPostById(id: string): Promise<NewsPost | null> {
  return await prisma.newsPost.findUnique({ where: { id } });
}

/** Serialisable copy of a post for client components. */
export function toNewsDTO(post: NewsPost): NewsPostDTO {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    summary: post.summary ?? "",
    content: post.content,
    category: post.category,
    coverUrl: post.coverUrl ?? "",
    published: post.published,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
