"use client";

import React from "react";
import { Column, Tag, Text, Row } from "@once-ui-system/core";
import { Markdown } from "@/components/content/Markdown";
import { useFormat, useT } from "@/i18n/client";
import { isNewsCategory } from "@/lib/news/categories";
import styles from "./NewsPreview.module.scss";

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
    <div className={styles.frame}>
      <Column maxWidth="s" fillWidth gap="24" className={styles.article}>
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
          // A plain <img>: the cover can live on any host, which next/image would refuse.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={cover}
            src={cover}
            alt={title}
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              objectFit: "cover",
              borderRadius: "var(--radius-l)",
            }}
          />
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
    </div>
  );
}
