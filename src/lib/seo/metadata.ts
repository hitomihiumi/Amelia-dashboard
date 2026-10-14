import { Meta } from "@once-ui-system/core";
import type { Metadata } from "next";
import { baseURL, schema } from "@/resources";

interface PageMetadataInput {
  /** Page title without the site name: " – Amelia" is appended. */
  title: string;
  description: string;
  /** Path of the page, e.g. `/news`. Becomes the canonical URL. */
  path: string;
  type?: "website" | "article";
  /** Absolute URL or a path of the social preview. Falls back to a generated card. */
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  /** Keeps the page out of search results (the links on it are still followed). */
  noindex?: boolean;
}

/** Search engines must not list pages that only make sense for a signed in user. */
export const PRIVATE_METADATA: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

/** Generated social card, used when a page has no cover of its own. */
export function ogCardUrl(title: string, description?: string): string {
  const params = new URLSearchParams({ title });
  if (description) params.set("description", description);
  return `/api/og/generate?${params.toString()}`;
}

/**
 * Metadata for a public page. Every page names its own canonical URL: a missing one would be
 * inherited from the layout above it and tell search engines that the page is a copy of another.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  image,
  publishedTime,
  modifiedTime,
  noindex = false,
}: PageMetadataInput): Metadata {
  const fullTitle = `${title} – ${schema.name}`;
  const base = Meta.generate({
    title: fullTitle,
    description,
    baseURL,
    path,
    type,
    publishedTime,
    image: image ?? ogCardUrl(title, description),
  });

  return {
    ...base,
    alternates: { canonical: path },
    openGraph: {
      ...base.openGraph,
      siteName: schema.name,
      locale: schema.locale.replace("-", "_"),
      ...(modifiedTime && type === "article" ? { modifiedTime } : {}),
    },
    robots: noindex
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

/** Docs without real content (placeholders) are not worth a place in search results. */
export const MIN_INDEXABLE_DOC_LENGTH = 300;
