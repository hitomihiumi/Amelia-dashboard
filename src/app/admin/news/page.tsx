import React from "react";
import { Column, Text } from "@once-ui-system/core";
import { getAllPosts } from "@/lib/news/news";
import { getT } from "@/i18n/server";
import { NewsManager } from "./NewsManager";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  const t = await getT();
  const posts = await getAllPosts();

  return (
    <Column fillWidth gap="16">
      <Column gap="4">
        <Text variant="heading-strong-m">{t("admin.news.title")}</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("admin.news.description")}
        </Text>
      </Column>

      <NewsManager posts={posts} />
    </Column>
  );
}
