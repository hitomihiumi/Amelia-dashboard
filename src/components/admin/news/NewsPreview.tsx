"use client";

import React from "react";
import { Column, Media, Row, Tag, Text } from "@once-ui-system/core";
import { Markdown } from "@/components/content/Markdown";
import { useFormat, useT } from "@/i18n/client";
import { isNewsCategory } from "@/lib/news/categories";

interface NewsPreviewProps {
  title: string;
  summary: string;
  content: string;
  category: string;
  coverUrl: string;
  /** ISO date shown under the category tag. */
  date: string;
}

/** The post as readers see it: same layout as src/app/(main)/news/[slug]/page.tsx. */
export function NewsPreview({ title, summary, content, category, coverUrl, date }: NewsPreviewProps) {
  const t = useT();
  const format = useFormat();
  const cover = /^https?:\/\/\S+$/i.test(coverUrl.trim()) ? coverUrl.trim() : "";

  return (
    <Row
      fillWidth
      horizontal="center"
      paddingX="24"
      paddingY="40"
      s={{ paddingX: "16", paddingY: "24" }}
      background="page"
      bottomRadius="l"
    >
      <Column maxWidth="s" fillWidth gap="24">
        <Column gap="12">
          <Row gap="8" vertical="center" wrap>
            <Tag scheme="neutral">
              {isNewsCategory(category) ? t(`adminNews.categories.${category}`) : category}
            </Tag>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {format.date(date, { dateStyle: "long" })}
            </Text>
          </Row>
          <Text variant="display-strong-xs">{title.trim() || t("adminNews.untitled")}</Text>
          {summary.trim() && (
            <Text variant="body-default-m" onBackground="neutral-medium">
              {summary.trim()}
            </Text>
          )}
        </Column>

        {cover && (
          // The cover can live on any host, so the image is not optimised.
          <Media key={cover} unoptimized src={cover} alt={title} aspectRatio="16 / 9" radius="l" />
        )}

        <Column fillWidth gap="16">
          {content.trim() ? (
            <Markdown source={content} />
          ) : (
            <Text variant="body-default-m" onBackground="neutral-weak">
              {t("adminNews.preview.empty")}
            </Text>
          )}
        </Column>
      </Column>
    </Row>
  );
}
