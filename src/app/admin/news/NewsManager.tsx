"use client";

import React, { useState } from "react";
import {
  Accordion,
  Button,
  Column,
  Flex,
  Input,
  Line,
  Row,
  SegmentedControl,
  Switch,
  Tag,
  Text,
  Textarea,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import type { NewsPost } from "@prisma/client";
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABELS } from "@/lib/news/categories";
import { deleteNewsPost, saveNewsPost } from "../actions";

interface Draft {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  coverUrl: string;
  published: boolean;
}

const EMPTY: Draft = {
  id: "",
  slug: "",
  title: "",
  summary: "",
  content: "",
  category: "update",
  coverUrl: "",
  published: false,
};

function toDraft(post: NewsPost): Draft {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    summary: post.summary ?? "",
    content: post.content,
    category: post.category,
    coverUrl: post.coverUrl ?? "",
    published: post.published,
  };
}

export function NewsManager({ posts }: { posts: NewsPost[] }) {
  const router = useRouter();
  const { addToast } = useToast();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);

  const update = (patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    setPending(true);

    const fd = new FormData();
    for (const [key, value] of Object.entries(draft)) {
      fd.set(key, typeof value === "boolean" ? String(value) : value);
    }

    const result = await saveNewsPost(fd);
    setPending(false);

    if (result.ok) {
      addToast({ message: draft.id ? "Post updated" : "Post created", variant: "success" });
      setDraft(EMPTY);
      router.refresh();
    } else {
      addToast({ message: result.error, variant: "danger" });
    }
  };

  const remove = async (id: string) => {
    const result = await deleteNewsPost(id);

    if (result.ok) {
      addToast({ message: "Post deleted", variant: "success" });
      if (draft.id === id) setDraft(EMPTY);
      router.refresh();
    } else {
      addToast({ message: result.error, variant: "danger" });
    }
  };

  return (
    <Column fillWidth gap="24">
      <Flex
        direction="column"
        fillWidth
        gap="16"
        padding="24"
        radius="l"
        border="neutral-medium"
        background="surface"
      >
        <Row fillWidth horizontal="between" vertical="center">
          <Text variant="heading-strong-s">{draft.id ? "Edit post" : "New post"}</Text>
          {draft.id && (
            <Button size="s" variant="secondary" onClick={() => setDraft(EMPTY)}>
              Cancel editing
            </Button>
          )}
        </Row>

        <Line />

        <Input
          id="news-title"
          label="Title"
          value={draft.title}
          maxLength={200}
          onChange={(e) => update({ title: e.target.value })}
        />

        <Input
          id="news-slug"
          label="Slug (optional — generated from the title)"
          value={draft.slug}
          maxLength={80}
          onChange={(e) => update({ slug: e.target.value })}
        />

        <SegmentedControl
          fillWidth
          buttons={NEWS_CATEGORIES.map((category) => ({
            value: category,
            label: NEWS_CATEGORY_LABELS[category],
          }))}
          selected={draft.category}
          onToggle={(value) => update({ category: value })}
        />

        <Textarea
          id="news-summary"
          label="Summary"
          lines={2}
          value={draft.summary}
          maxLength={400}
          onChange={(e) => update({ summary: e.target.value })}
        />

        <Input
          id="news-cover"
          label="Cover image URL"
          value={draft.coverUrl}
          maxLength={500}
          onChange={(e) => update({ coverUrl: e.target.value })}
        />

        <Textarea
          id="news-content"
          label="Body (Markdown)"
          lines={12}
          value={draft.content}
          onChange={(e) => update({ content: e.target.value })}
        />

        <Row fillWidth gap="12" vertical="center">
          <Switch
            isChecked={draft.published}
            onToggle={() => update({ published: !draft.published })}
          />
          <Text variant="label-default-s">Published</Text>
        </Row>

        <Row fillWidth horizontal="end">
          <Button onClick={save} loading={pending} disabled={pending}>
            {draft.id ? "Save changes" : "Create post"}
          </Button>
        </Row>
      </Flex>

      <Column fillWidth gap="12">
        <Text variant="heading-strong-s">All posts ({posts.length})</Text>

        {posts.length === 0 && (
          <Text variant="body-default-s" onBackground="neutral-weak">
            No posts yet.
          </Text>
        )}

        {posts.map((post) => (
          <Accordion key={post.id} title={post.title}>
            <Column fillWidth gap="12">
              <Row gap="8" vertical="center" wrap>
                <Tag variant={post.published ? "success" : "neutral"}>
                  {post.published ? "published" : "draft"}
                </Tag>
                <Tag variant="neutral">{post.category}</Tag>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  /news/{post.slug}
                </Text>
              </Row>

              {post.summary && (
                <Text variant="body-default-s" onBackground="neutral-medium">
                  {post.summary}
                </Text>
              )}

              <Row gap="8" horizontal="end">
                <Button size="s" variant="secondary" onClick={() => setDraft(toDraft(post))}>
                  Edit
                </Button>
                <Button size="s" variant="danger" onClick={() => remove(post.id)}>
                  Delete
                </Button>
              </Row>
            </Column>
          </Accordion>
        ))}
      </Column>
    </Column>
  );
}
