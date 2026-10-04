import React from "react";
import Link from "next/link";
import { Button, Column, IconButton, Text } from "@once-ui-system/core";
import { getFormatters, getT } from "@/i18n/server";
import { Panel } from "./primitives";
import type { PublishedPost } from "./types";
import styles from "./Overview.module.scss";

export async function RecentPosts({ posts }: { posts: PublishedPost[] }) {
  const t = await getT();
  const { relative } = await getFormatters();

  return (
    <Panel
      icon="navNews"
      title={t("admin.overview.recent.title")}
      description={t("admin.overview.recent.description")}
      aside={
        posts.length > 0 ? (
          <Button variant="tertiary" size="s" href="/admin/news" suffixIcon="chevronRight">
            {t("admin.overview.recent.viewAll")}
          </Button>
        ) : undefined
      }
    >
      {posts.length === 0 ? (
        <Column fillWidth gap="12" horizontal="start">
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("admin.overview.recent.empty")}
          </Text>
          <Button variant="secondary" size="s" prefixIcon="plus" href="/admin/news/new">
            {t("admin.overview.recent.writeFirst")}
          </Button>
        </Column>
      ) : (
        <ul className={styles.list}>
          {posts.map((post) => (
            <li key={post.id} className={styles.rowWrap}>
              <Link href={`/admin/news/${post.id}`} className={styles.row}>
                <Column className={styles.grow} gap="2">
                  <Text variant="body-strong-s" className={styles.truncate}>
                    {post.title || t("admin.overview.attention.untitled")}
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    {t(`admin.newsCategory.${post.category as "update"}`)}
                    {post.publishedAt ? ` · ${relative(post.publishedAt)}` : ""}
                  </Text>
                </Column>
              </Link>
              <IconButton
                icon="arrowUpRight"
                variant="tertiary"
                size="s"
                href={`/news/${post.slug}`}
                tooltip={t("admin.overview.recent.openOnSite")}
                aria-label={t("admin.overview.recent.openOnSite")}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
