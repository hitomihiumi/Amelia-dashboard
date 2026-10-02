import React from "react";
import Link from "next/link";
import { Button, Column, Flex, Grid, Row, Tag, Text } from "@once-ui-system/core";
import type { NewsPost } from "@prisma/client";
import { isNewsCategory } from "@/lib/news/categories";
import { getFormatters, getT } from "@/i18n/server";

export async function LatestNews({ posts }: { posts: NewsPost[] }) {
  if (posts.length === 0) return null;

  const t = await getT();
  const format = await getFormatters();

  return (
    <Column fillWidth gap="16">
      <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
        <Text variant="heading-strong-l">{t("site.landing.latestNews.title")}</Text>
        <Button size="s" variant="secondary" href="/news">
          {t("site.landing.latestNews.all")}
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
                <Tag scheme="neutral">
                  {isNewsCategory(post.category)
                    ? t(`site.news.categories.${post.category}`)
                    : post.category}
                </Tag>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  {format.date(post.publishedAt ?? post.createdAt, { dateStyle: "long" })}
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
