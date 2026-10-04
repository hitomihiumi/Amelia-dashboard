"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Column,
  Grid,
  Icon,
  IconButton,
  Input,
  Media,
  Row,
  SegmentedControl,
  SmartLink,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import { LuFilePlus } from "react-icons/lu";
import { AdminCard, AdminPage } from "@/components/admin/AdminPage";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { useFormat, useT } from "@/i18n/client";
import { isNewsCategory } from "@/lib/news/categories";
import type { NewsActions, NewsPostDTO } from "@/lib/news/types";
import { CategoryIcon, categoryTokens } from "./categoryMeta";
import styles from "./NewsList.module.scss";

type Filter = "all" | "published" | "drafts";

export function NewsList({
  posts: initialPosts,
  actions,
}: {
  posts: NewsPostDTO[];
  actions: Pick<NewsActions, "setPublished" | "remove">;
}) {
  const t = useT();
  const format = useFormat();
  const router = useRouter();
  const { addToast } = useToast();

  const [posts, setPosts] = useState(initialPosts);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  // Relative times depend on the clock, so they only appear after hydration.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => setPosts(initialPosts), [initialPosts]);
  useEffect(() => setNow(Date.now()), []);

  const counts = useMemo(() => {
    const published = posts.filter((post) => post.published).length;
    return { all: posts.length, published, drafts: posts.length - published };
  }, [posts]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (filter === "published" && !post.published) return false;
      if (filter === "drafts" && post.published) return false;
      if (!needle) return true;
      return post.title.toLowerCase().includes(needle) || post.slug.toLowerCase().includes(needle);
    });
  }, [posts, filter, query]);

  const categoryLabel = (category: string) =>
    isNewsCategory(category) ? t(`adminNews.categories.${category}`) : category;

  const togglePublished = async (post: NewsPostDTO) => {
    setBusyId(post.id);
    try {
      const result = await actions.setPublished(post.id, !post.published);
      if (!result.ok) {
        addToast({ message: result.error, variant: "danger" });
        return;
      }
      setPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? { ...item, published: result.published, publishedAt: result.publishedAt }
            : item,
        ),
      );
      addToast({
        message: t(result.published ? "adminNews.toast.published" : "adminNews.toast.unpublished"),
        variant: "success",
      });
      router.refresh();
    } catch {
      addToast({ message: t("adminNews.errors.saveFailed"), variant: "danger" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (post: NewsPostDTO) => {
    setBusyId(post.id);
    try {
      const result = await actions.remove(post.id);
      if (!result.ok) {
        addToast({ message: result.error, variant: "danger" });
        return;
      }
      setPosts((prev) => prev.filter((item) => item.id !== post.id));
      addToast({ message: t("adminNews.toast.deleted"), variant: "success" });
      router.refresh();
    } catch {
      addToast({ message: t("adminNews.errors.deleteFailed"), variant: "danger" });
    } finally {
      setBusyId(null);
    }
  };

  const filters: Array<{ id: Filter; label: string; count: number }> = [
    { id: "all", label: t("adminNews.list.filters.all"), count: counts.all },
    { id: "published", label: t("adminNews.list.filters.published"), count: counts.published },
    { id: "drafts", label: t("adminNews.list.filters.drafts"), count: counts.drafts },
  ];

  const whenLabel = (post: NewsPostDTO) => {
    const date = post.published ? (post.publishedAt ?? post.createdAt) : post.updatedAt;
    const absolute = format.date(date, { dateStyle: "medium" });
    const key = post.published ? "adminNews.list.publishedWhen" : "adminNews.list.editedWhen";
    return {
      text: t(key, { when: now === null ? absolute : format.relative(date, now) }),
      absolute: now === null ? "" : absolute,
      full: format.dateTime(date),
    };
  };

  return (
    <AdminPage
      title={t("adminNews.list.title")}
      description={t("adminNews.list.description")}
      actions={
        <Button href="/admin/news/new" prefixIcon="plus" size="m">
          {t("adminNews.list.newPost")}
        </Button>
      }
    >
      {posts.length === 0 ? (
        <AdminCard padding="32">
          <EmptyState
            icon={<LuFilePlus size={24} aria-hidden />}
            title={<Text variant="heading-strong-m">{t("adminNews.list.empty.title")}</Text>}
            text={
              <Text variant="body-default-m" onBackground="neutral-weak" align="center" style={{ maxWidth: "28rem" }}>
                {t("adminNews.list.empty.text")}
              </Text>
            }
          >
            <Button href="/admin/news/new" prefixIcon="plus">
              {t("adminNews.list.empty.cta")}
            </Button>
          </EmptyState>
        </AdminCard>
      ) : (
        <Column fillWidth gap="16">
          <Row fillWidth wrap horizontal="between" vertical="center" gap="12">
            <SegmentedControl
              fillWidth={false}
              aria-label={t("adminNews.list.filters.label")}
              value={filter}
              onChange={(value) => setFilter(value as Filter)}
              buttons={filters.map((item) => ({
                value: item.id,
                size: "m",
                weight: "strong",
                label: (
                  <Row vertical="center" gap="8">
                    {item.label}
                    <Row
                      minWidth={1.25}
                      paddingX="4"
                      radius="full"
                      center
                      background="neutral-alpha-medium"
                    >
                      <Text variant="label-strong-xs" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {item.count}
                      </Text>
                    </Row>
                  </Row>
                ),
              }))}
            />

            <Row className={styles.search}>
              <Input
                id="news-search"
                type="search"
                size="s"
                placeholder={t("adminNews.list.searchPlaceholder")}
                aria-label={t("adminNews.list.searchLabel")}
                value={query}
                prefix={<Icon name="search" size="s" onBackground="neutral-weak" />}
                suffix={
                  query ? (
                    <IconButton
                      icon="close"
                      variant="ghost"
                      size="s"
                      aria-label={t("common.actions.clear")}
                      onClick={() => setQuery("")}
                    />
                  ) : undefined
                }
                onChange={(event) => setQuery(event.target.value)}
              />
            </Row>
          </Row>

          {visible.length === 0 ? (
            <EmptyState
              icon={<Icon name="search" size="m" />}
              title={<Text variant="heading-strong-s">{t("adminNews.list.noMatches.title")}</Text>}
              text={
                <Text variant="body-default-s" onBackground="neutral-weak" align="center">
                  {t("adminNews.list.noMatches.text")}
                </Text>
              }
            >
              <Button
                size="s"
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                {t("adminNews.list.noMatches.reset")}
              </Button>
            </EmptyState>
          ) : (
            <Grid
              as="ul"
              fillWidth
              margin="0"
              padding="0"
              aria-label={t("adminNews.list.title")}
              className={styles.list}
            >
              {visible.map((post) => {
                const tokens = categoryTokens(post.category);
                const when = whenLabel(post);
                const editHref = `/admin/news/${post.id}`;
                const busy = busyId === post.id;

                return (
                  <Column
                    as="li"
                    key={post.id}
                    fillWidth
                    className={styles.cell}
                    style={
                      {
                        "--cat-alpha": tokens.alpha,
                        "--cat-alpha-medium": tokens.alphaMedium,
                        "--cat-text": tokens.text,
                      } as React.CSSProperties
                    }
                  >
                    <Grid
                      fillWidth
                      fillHeight
                      padding="12"
                      radius="l"
                      border="neutral-alpha-medium"
                      background="surface"
                      className={styles.row}
                    >
                      <Row
                        border="neutral-alpha-weak"
                        radius="m"
                        overflow="hidden"
                        className={styles.thumb}
                      >
                        <SmartLink href={editHref} unstyled fillWidth tabIndex={-1} aria-hidden>
                          {post.coverUrl ? (
                            <Media fill stretch unoptimized src={post.coverUrl} alt="" />
                          ) : (
                            <Row fill center className={styles.thumbPlaceholder}>
                              <CategoryIcon category={post.category} size={24} />
                            </Row>
                          )}
                        </SmartLink>
                      </Row>

                      <Column fillWidth gap="4">
                        <Row wrap vertical="center" gap="8">
                          <Tag scheme={post.published ? "success" : "neutral"} size="s">
                            {post.published ? t("adminNews.status.published") : t("adminNews.status.draft")}
                          </Tag>
                          <Row vertical="center" gap="4" style={{ color: "var(--cat-text)" }}>
                            <CategoryIcon category={post.category} size={13} />
                            <Text variant="label-default-s">{categoryLabel(post.category)}</Text>
                          </Row>
                        </Row>

                        <SmartLink href={editHref} unstyled className={styles.title}>
                          <Text variant="heading-strong-s" onBackground="neutral-strong" className={styles.wrapText}>
                            {post.title.trim() || t("adminNews.untitled")}
                          </Text>
                        </SmartLink>

                        <Text
                          as="p"
                          variant="body-default-s"
                          onBackground="neutral-medium"
                          className={styles.summary}
                        >
                          {post.summary.trim() || (
                            <Text as="span" onBackground="neutral-weak" style={{ fontStyle: "italic" }}>
                              {t("adminNews.list.noSummary")}
                            </Text>
                          )}
                        </Text>

                        <Text
                          as="p"
                          variant="label-default-s"
                          onBackground="neutral-weak"
                          marginTop="2"
                          title={when.full}
                          className={styles.wrapText}
                        >
                          {when.text}
                          {when.absolute && ` · ${when.absolute}`}
                          <Text as="span" family="code">
                            {" "}
                            · /news/{post.slug}
                          </Text>
                        </Text>
                      </Column>

                      <Row wrap vertical="center" gap="8" className={styles.actions}>
                        <Button href={editHref} size="m" variant="secondary" prefixIcon="edit">
                          {t("common.actions.edit")}
                        </Button>
                        {post.published && (
                          <IconButton
                            icon="arrowUpRight"
                            variant="ghost"
                            size="m"
                            href={`/news/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            tooltip={t("adminNews.list.viewLive")}
                            aria-label={t("adminNews.list.viewLive")}
                          />
                        )}
                        <Button
                          size="m"
                          variant="secondary"
                          prefixIcon={post.published ? "eyeOff" : "eye"}
                          loading={busy}
                          disabled={busy}
                          onClick={() => togglePublished(post)}
                        >
                          {post.published ? t("adminNews.list.unpublish") : t("adminNews.list.publish")}
                        </Button>
                        <ConfirmIconButton
                          variant="confirm"
                          size="m"
                          onConfirm={() => remove(post)}
                          tooltip={t("adminNews.list.delete")}
                        />
                      </Row>
                    </Grid>
                  </Column>
                );
              })}
            </Grid>
          )}
        </Column>
      )}
    </AdminPage>
  );
}

/** Icon, headline, text and a call to action, centred; used for "no posts" and "no matches". */
function EmptyState({
  icon,
  title,
  text,
  children,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  text: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Column fillWidth horizontal="center" gap="12" paddingX="16" paddingY="32">
      <Row
        width={3.5}
        height={3.5}
        center
        radius="l"
        background="brand-alpha-weak"
        border="brand-alpha-medium"
        onBackground="brand-strong"
        aria-hidden
      >
        {icon}
      </Row>
      {title}
      {text}
      {children}
    </Column>
  );
}
