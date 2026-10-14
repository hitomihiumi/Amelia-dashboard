import React from "react";
import { notFound } from "next/navigation";
import { Button, Column, Flex, Row, Tag, Text } from "@once-ui-system/core";
import type { Metadata } from "next";
import { baseURL, schema } from "@/resources";
import { JsonLd } from "@/components/seo/JsonLd";
import { ogCardUrl, pageMetadata } from "@/lib/seo/metadata";
import { Markdown } from "@/components/content/Markdown";
import { getFormatters, getT } from "@/i18n/server";
import { getPostBySlug, isNewsCategory } from "@/lib/news/news";

export const dynamic = "force-dynamic";

/** Posts written without a summary still get a description made of their first words. */
function articleDescription(markdown: string): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return {};

  return pageMetadata({
    title: post.title,
    description: post.summary || articleDescription(post.content),
    path: `/news/${post.slug}`,
    type: "article",
    publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
    modifiedTime: post.updatedAt.toISOString(),
    image: post.coverUrl || undefined,
  });
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getT();
  const format = await getFormatters();
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const cover = post.coverUrl || ogCardUrl(post.title, post.summary || undefined);

  return (
    <Flex fillWidth horizontal="center" paddingY="40" paddingX="16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          mainEntityOfPage: `${baseURL}/news/${post.slug}`,
          headline: post.title,
          description: post.summary || articleDescription(post.content),
          image: cover.startsWith("http") ? cover : `${baseURL}${cover}`,
          datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
          dateModified: post.updatedAt.toISOString(),
          author: { "@type": "Person", name: schema.author.name, url: schema.author.url },
          publisher: { "@type": "Organization", name: schema.name, url: baseURL },
        }}
      />
      <Column maxWidth="s" fillWidth gap="24">
        <Button size="s" variant="secondary" prefixIcon="back" href="/news">
          {t("site.news.allNews")}
        </Button>

        <Column gap="12">
          <Row gap="8" vertical="center" wrap>
            <Tag scheme="neutral">
              {isNewsCategory(post.category)
                ? t(`site.news.categories.${post.category}`)
                : post.category}
            </Tag>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {format.date(post.publishedAt ?? post.createdAt, { dateStyle: "long" })}
            </Text>
          </Row>
          <Text as="h1" variant="display-strong-xs">{post.title}</Text>
          {post.summary && (
            <Text variant="body-default-m" onBackground="neutral-medium">
              {post.summary}
            </Text>
          )}
        </Column>

        {post.coverUrl && (
          // A plain <img>: the cover can live on any host, which next/image would refuse.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverUrl}
            alt={post.title}
            style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "var(--radius-l)" }}
          />
        )}

        <Column fillWidth gap="16">
          <Markdown source={post.content} />
        </Column>
      </Column>
    </Flex>
  );
}
