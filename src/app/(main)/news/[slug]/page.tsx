import React from "react";
import { notFound } from "next/navigation";
import { Button, Column, Flex, Media, Row, Tag, Text, Meta } from "@once-ui-system/core";
import type { Metadata } from "next";
import { baseURL, schema } from "@/resources";
import { CustomMDX } from "@/components/docs/mdx";
import { getFormatters, getT } from "@/i18n/server";
import { getPostBySlug, isNewsCategory } from "@/lib/news/news";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return {};

  return Meta.generate({
    title: `${post.title} – ${schema.name}`,
    description: post.summary || "",
    baseURL,
    path: `/news/${post.slug}`,
    type: "article",
    publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
    image:
      post.coverUrl ||
      `/api/og/generate?title=${encodeURIComponent(post.title)}&description=${encodeURIComponent(
        post.summary || "",
      )}`,
  });
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getT();
  const format = await getFormatters();
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  return (
    <Flex fillWidth horizontal="center" paddingY="40" paddingX="16">
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
          <Text variant="display-strong-xs">{post.title}</Text>
          {post.summary && (
            <Text variant="body-default-m" onBackground="neutral-medium">
              {post.summary}
            </Text>
          )}
        </Column>

        {post.coverUrl && (
          <Media src={post.coverUrl} radius="l" aspectRatio="16 / 9" alt={post.title} />
        )}

        <Column fillWidth gap="16">
          <CustomMDX source={post.content} />
        </Column>
      </Column>
    </Flex>
  );
}
