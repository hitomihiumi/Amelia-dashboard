import type { MetadataRoute } from "next";
import { baseURL, schema } from "@/resources";
import { getPages } from "@/app/utils/utils";
import { MIN_INDEXABLE_DOC_LENGTH } from "@/lib/seo/metadata";
import { getPublishedPosts } from "@/lib/news/news";

export const dynamic = "force-dynamic";

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: baseURL, changeFrequency: "weekly", priority: 1 },
  { url: `${baseURL}/news`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${baseURL}/status`, changeFrequency: "daily", priority: 0.4 },
  { url: `${baseURL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  { url: `${baseURL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
];

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docs: MetadataRoute.Sitemap = getPages()
    .filter((doc) => doc.content.trim().length >= MIN_INDEXABLE_DOC_LENGTH)
    .map((doc) => ({
      url: `${baseURL}/docs/${doc.slug}`,
      lastModified: parseDate(doc.metadata.updatedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  // The sitemap must still be served when the database is unreachable.
  const posts: MetadataRoute.Sitemap = await getPublishedPosts({ take: 1000 })
    .then(({ posts }) =>
      posts.map((post) => ({
        url: `${baseURL}/news/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    )
    .catch((error) => {
      console.warn(`[${schema.name}] sitemap: news posts skipped`, error);
      return [];
    });

  return [...STATIC_PAGES, ...docs, ...posts];
}
