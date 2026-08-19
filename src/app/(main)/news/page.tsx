import React from "react";
import Link from "next/link";
import { Button, Column, Flex, Grid, Media, Row, Tag, Text, Meta } from "@once-ui-system/core";
import type { Metadata } from "next";
import { baseURL, schema } from "@/resources";
import { formatDate } from "@/app/utils/formatDate";
import {
  NEWS_CATEGORIES,
  NEWS_CATEGORY_LABELS,
  NEWS_PAGE_SIZE,
  getPublishedPosts,
  isNewsCategory,
} from "@/lib/news/news";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return Meta.generate({
    title: `News – ${schema.name}`,
    description: "Updates, new features and maintenance notices.",
    baseURL,
    path: "/news",
  });
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const query = await searchParams;
  const category = isNewsCategory(query.category) ? query.category : null;
  const page = Math.max(1, Number(query.page) || 1);

  const { posts, total } = await getPublishedPosts({ category, page });
  const pages = Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE));

  const href = (next: { category?: string | null; page?: number }) => {
    const params = new URLSearchParams();
    const nextCategory = next.category === undefined ? category : next.category;
    if (nextCategory) params.set("category", nextCategory);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const search = params.toString();
    return search ? `/news?${search}` : "/news";
  };

  return (
    <Flex fillWidth horizontal="center" paddingY="40" paddingX="16">
      <Column maxWidth="l" fillWidth gap="32">
        <Column gap="8">
          <Text variant="display-strong-xs">News</Text>
          <Text variant="body-default-m" onBackground="neutral-medium">
            Releases, new features and everything else worth knowing about the bot.
          </Text>
        </Column>

        <Row gap="8" wrap>
          <Button
            size="s"
            variant={category === null ? "primary" : "secondary"}
            href={href({ category: null, page: 1 })}
          >
            All
          </Button>
          {NEWS_CATEGORIES.map((item) => (
            <Button
              key={item}
              size="s"
              variant={category === item ? "primary" : "secondary"}
              href={href({ category: item, page: 1 })}
            >
              {NEWS_CATEGORY_LABELS[item]}
            </Button>
          ))}
        </Row>

        {posts.length === 0 && (
          <Text variant="body-default-m" onBackground="neutral-weak">
            Nothing published here yet.
          </Text>
        )}

        <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="16" fillWidth>
          {posts.map((post) => (
            <Link key={post.id} href={`/news/${post.slug}`} style={{ textDecoration: "none" }}>
              <Flex
                direction="column"
                fillWidth
                fillHeight
                gap="12"
                padding="16"
                radius="l"
                border="neutral-medium"
                background="surface"
              >
                {post.coverUrl && (
                  <Media src={post.coverUrl} radius="m" aspectRatio="16 / 9" alt={post.title} />
                )}
                <Row gap="8" vertical="center" wrap>
                  <Tag variant="neutral">
                    {NEWS_CATEGORY_LABELS[post.category as never] ?? post.category}
                  </Tag>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    {formatDate((post.publishedAt ?? post.createdAt).toISOString())}
                  </Text>
                </Row>
                <Text variant="heading-strong-s">{post.title}</Text>
                {post.summary && (
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {post.summary}
                  </Text>
                )}
              </Flex>
            </Link>
          ))}
        </Grid>

        {pages > 1 && (
          <Row fillWidth horizontal="center" gap="8" vertical="center">
            <Button
              size="s"
              variant="secondary"
              disabled={page <= 1}
              href={href({ page: page - 1 })}
            >
              Previous
            </Button>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Page {page} / {pages}
            </Text>
            <Button
              size="s"
              variant="secondary"
              disabled={page >= pages}
              href={href({ page: page + 1 })}
            >
              Next
            </Button>
          </Row>
        )}
      </Column>
    </Flex>
  );
}
