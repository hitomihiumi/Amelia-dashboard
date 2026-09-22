import React from "react";
import Link from "next/link";
import { Button, Column, Flex, Grid, Row, Tag, Text } from "@once-ui-system/core";
import type { NewsPost } from "@prisma/client";
import { NEWS_CATEGORY_LABELS } from "@/lib/news/categories";
import { formatDate } from "@/app/utils/formatDate";

export function LatestNews({ posts }: { posts: NewsPost[] }) {
  if (posts.length === 0) return null;

  return (
    <Column fillWidth gap="16">
      <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
        <Text variant="heading-strong-l">Latest news</Text>
        <Button size="s" variant="secondary" href="/news">
          All news
        </Button>
      </Row>

      <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="16" fillWidth>
        {posts.map((post) => (
          <Link key={post.id} href={`/news/${post.slug}`} style={{ textDecoration: "none" }}>
            <Flex
              direction="column"
              fillWidth
              fillHeight
              gap="12"
              padding="20"
              radius="l"
              border="neutral-medium"
              background="surface"
            >
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
    </Column>
  );
}
