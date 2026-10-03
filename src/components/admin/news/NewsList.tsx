"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, IconButton, Tag, Text, useToast } from "@once-ui-system/core";
import { LuFilePlus, LuSearch, LuX } from "react-icons/lu";
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
          <div className={`${styles.empty} ${styles.root}`}>
            <span className={styles.emptyIcon} aria-hidden>
              <LuFilePlus />
            </span>
            <Text variant="heading-strong-m">{t("adminNews.list.empty.title")}</Text>
            <Text variant="body-default-m" onBackground="neutral-weak" className={styles.emptyText}>
              {t("adminNews.list.empty.text")}
            </Text>
            <Button href="/admin/news/new" prefixIcon="plus">
              {t("adminNews.list.empty.cta")}
            </Button>
          </div>
        </AdminCard>
      ) : (
        <AdminCard padding="16" gap="16">
          <div className={styles.root}>
          <div className={styles.toolbar}>
            <div className={styles.filters} role="group" aria-label={t("adminNews.list.filters.label")}>
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filter === item.id}
                  className={`${styles.filter} ${filter === item.id ? styles.filterActive : ""}`}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                  <span className={styles.filterCount}>{item.count}</span>
                </button>
              ))}
            </div>

            <div className={styles.search}>
              <LuSearch className={styles.searchIcon} aria-hidden />
              <input
                type="search"
                className={styles.searchInput}
                placeholder={t("adminNews.list.searchPlaceholder")}
                aria-label={t("adminNews.list.searchLabel")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className={styles.searchClear}
                  aria-label={t("common.actions.clear")}
                  onClick={() => setQuery("")}
                >
                  <LuX aria-hidden />
                </button>
              )}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon} aria-hidden>
                <LuSearch />
              </span>
              <Text variant="heading-strong-s">{t("adminNews.list.noMatches.title")}</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {t("adminNews.list.noMatches.text")}
              </Text>
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
            </div>
          ) : (
            <ul className={styles.list} aria-label={t("adminNews.list.title")}>
              {visible.map((post) => {
                const tokens = categoryTokens(post.category);
                const when = whenLabel(post);
                const editHref = `/admin/news/${post.id}`;
                const busy = busyId === post.id;

                return (
                  <li
                    key={post.id}
                    className={styles.row}
                    style={
                      {
                        "--cat-alpha": tokens.alpha,
                        "--cat-alpha-medium": tokens.alphaMedium,
                        "--cat-text": tokens.text,
                      } as React.CSSProperties
                    }
                  >
                    <Link href={editHref} className={styles.thumb} tabIndex={-1} aria-hidden>
                      {post.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.coverUrl} alt="" loading="lazy" className={styles.thumbImg} />
                      ) : (
                        <span className={styles.thumbPlaceholder}>
                          <CategoryIcon category={post.category} size={24} />
                        </span>
                      )}
                    </Link>

                    <div className={styles.body}>
                      <div className={styles.tags}>
                        <Tag scheme={post.published ? "success" : "neutral"} size="s">
                          {post.published ? t("adminNews.status.published") : t("adminNews.status.draft")}
                        </Tag>
                        <span className={styles.category}>
                          <CategoryIcon category={post.category} size={13} />
                          {categoryLabel(post.category)}
                        </span>
                      </div>

                      <Link href={editHref} className={styles.title}>
                        {post.title.trim() || t("adminNews.untitled")}
                      </Link>

                      <p className={styles.summary}>
                        {post.summary.trim() || (
                          <span className={styles.noSummary}>{t("adminNews.list.noSummary")}</span>
                        )}
                      </p>

                      <p className={styles.date} title={when.full}>
                        {when.text}
                        {when.absolute && <span className={styles.dateAbs}> · {when.absolute}</span>}
                        <span className={styles.slug}> · /news/{post.slug}</span>
                      </p>
                    </div>

                    <div className={styles.actions}>
                      <Button href={editHref} size="s" variant="secondary" prefixIcon="edit">
                        {t("common.actions.edit")}
                      </Button>
                      {post.published && (
                        <IconButton
                          icon="arrowUpRight"
                          variant="ghost"
                          size="s"
                          href={`/news/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          tooltip={t("adminNews.list.viewLive")}
                          aria-label={t("adminNews.list.viewLive")}
                        />
                      )}
                      <Button
                        size="s"
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
                        onConfirm={() => remove(post)}
                        tooltip={t("adminNews.list.delete")}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          </div>
        </AdminCard>
      )}
    </AdminPage>
  );
}
