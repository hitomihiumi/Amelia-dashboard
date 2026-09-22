import React from "react";
import { Column, Text } from "@once-ui-system/core";
import { getAllPosts } from "@/lib/news/news";
import { NewsManager } from "./NewsManager";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  const posts = await getAllPosts();

  return (
    <Column fillWidth gap="16">
      <Column gap="4">
        <Text variant="heading-strong-m">News</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Posts are written in Markdown and appear on /news as soon as they are published.
        </Text>
      </Column>

      <NewsManager posts={posts} />
    </Column>
  );
}
