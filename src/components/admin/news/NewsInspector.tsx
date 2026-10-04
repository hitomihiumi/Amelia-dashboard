"use client";

import React from "react";
import { Button, Column, IconButton, Input, Media, Row, Switch, Tag, Text, ToggleButton } from "@once-ui-system/core";
import { AdminCard } from "@/components/admin/AdminPage";
import { Eyebrow } from "@/components/admin/Eyebrow";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { useFormat, useT } from "@/i18n/client";
import { NEWS_CATEGORIES, isNewsCategory } from "@/lib/news/categories";
import { CategoryIcon, categoryTokens } from "./categoryMeta";
import { ImageUrlPreview } from "./ImageUrlPreview";
import type { FieldErrors, FormState, PostMeta } from "./editorTypes";
import styles from "./NewsInspector.module.scss";

interface InspectorProps {
  form: FormState;
  meta: PostMeta;
  errors: FieldErrors;
  /** The slug that will be saved: typed by hand, or generated from the title. */
  effectiveSlug: string;
  origin: string;
  /** Date shown on the previews: publication date, or today for drafts. */
  previewDate: string;
  statusBusy: boolean;
  onCategory: (category: string) => void;
  onSlugInput: (raw: string) => void;
  onSlugReset: () => void;
  onCover: (url: string) => void;
  onTogglePublished: (next: boolean) => void;
  onDelete: () => void;
}

export function NewsInspector({
  form,
  meta,
  errors,
  effectiveSlug,
  origin,
  previewDate,
  statusBusy,
  onCategory,
  onSlugInput,
  onSlugReset,
  onCover,
  onTogglePublished,
  onDelete,
}: InspectorProps) {
  const t = useT();
  const format = useFormat();

  const categoryLabel = (category: string) =>
    isNewsCategory(category) ? t(`adminNews.categories.${category}`) : category;

  const cover = form.coverUrl.trim();
  const coverValid = !cover || /^https?:\/\/\S+$/i.test(cover);
  const coverError = errors.coverUrl ?? (!coverValid ? t("adminNews.errors.coverInvalid") : "");
  const auto = !form.slugTouched;

  return (
    <Column fillWidth gap="16">
      {/* Status */}
      <AdminCard padding="20" gap="12">
        <Row horizontal="between" vertical="center" gap="12">
          <Column gap="4" style={{ minWidth: 0 }}>
            <Eyebrow as="label">{t("adminNews.inspector.status")}</Eyebrow>
            <Row gap="8" vertical="center">
              <Tag scheme={meta.published ? "success" : "neutral"} size="m">
                {meta.published ? t("adminNews.status.published") : t("adminNews.status.draft")}
              </Tag>
            </Row>
          </Column>
          <Switch
            checked={meta.published}
            loading={statusBusy}
            disabled={!meta.id || statusBusy}
            ariaLabel={t("adminNews.inspector.publishedSwitch")}
            onToggle={() => onTogglePublished(!meta.published)}
          />
        </Row>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {!meta.id
            ? t("adminNews.inspector.statusNew")
            : meta.published
              ? t("adminNews.inspector.statusLive", {
                  date: format.date(meta.publishedAt ?? previewDate, { dateStyle: "long" }),
                })
              : t("adminNews.inspector.statusDraft")}
        </Text>
        {meta.id && (
          <Row horizontal="between" vertical="center" paddingTop="12" borderTop="neutral-alpha-weak">
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("adminNews.inspector.deletePost")}
            </Text>
            <ConfirmIconButton
              variant="confirm"
              onConfirm={onDelete}
              tooltip={t("adminNews.inspector.deletePost")}
              confirmMessage={t("adminNews.inspector.deleteConfirm")}
            />
          </Row>
        )}
      </AdminCard>

      {/* Category */}
      <AdminCard padding="20" gap="12">
        <Eyebrow as="label">{t("adminNews.inspector.category")}</Eyebrow>
        <Column fillWidth gap="8" role="radiogroup" aria-label={t("adminNews.inspector.category")}>
          {NEWS_CATEGORIES.map((category) => {
            const tokens = categoryTokens(category);
            const selected = form.category === category;
            return (
              <ToggleButton
                key={category}
                type="button"
                role="radio"
                aria-checked={selected}
                fillWidth
                horizontal="start"
                size="l"
                radius="m"
                variant="outline"
                className={styles.chip}
                style={
                  {
                    "--cat-solid": tokens.solid,
                    "--cat-alpha": tokens.alpha,
                    "--cat-alpha-medium": tokens.alphaMedium,
                    "--cat-text": tokens.text,
                  } as React.CSSProperties
                }
                onClick={() => onCategory(category)}
              >
                <Row fillWidth vertical="center" gap="12">
                  <Row width={2} height={2} center radius="s" className={styles.chipIcon}>
                    <CategoryIcon category={category} size={16} />
                  </Row>
                  <Column flex={1} align="start">
                    <Text variant="body-strong-s">{categoryLabel(category)}</Text>
                    <Text variant="label-default-xs" onBackground="neutral-weak" align="left">
                      {t(`adminNews.categoryHints.${category}`)}
                    </Text>
                  </Column>
                </Row>
              </ToggleButton>
            );
          })}
        </Column>
        {errors.category && (
          <Text as="p" variant="label-default-s" onBackground="danger-strong">
            {errors.category}
          </Text>
        )}
      </AdminCard>

      {/* Slug */}
      <AdminCard padding="20" gap="12">
        <Row horizontal="between" vertical="center" gap="8">
          <Eyebrow as="label" htmlFor="news-slug">
            {t("adminNews.inspector.slug")}
          </Eyebrow>
          {auto ? (
            <Tag scheme="brand" size="s">
              {t("adminNews.inspector.slugAuto")}
            </Tag>
          ) : (
            <Button type="button" variant="link" size="s" onClick={onSlugReset}>
              {t("adminNews.inspector.slugReset")}
            </Button>
          )}
        </Row>
        <Input
          id="news-slug"
          size="s"
          type="text"
          value={effectiveSlug}
          maxLength={80}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder={t("adminNews.inspector.slugPlaceholder")}
          prefix={
            <Text variant="body-default-s" onBackground="neutral-weak" family="code" aria-hidden>
              /news/
            </Text>
          }
          error={Boolean(errors.slug)}
          errorMessage={errors.slug}
          aria-invalid={Boolean(errors.slug)}
          aria-describedby="news-slug-url"
          className={styles.code}
          onChange={(event) => onSlugInput(event.target.value)}
        />
        <Column id="news-slug-url" gap="2">
          <Text variant="label-default-xs" onBackground="neutral-weak">
            {t("adminNews.inspector.publicUrl")}
          </Text>
          <Text variant="label-default-s" onBackground="neutral-medium" family="code" className={styles.wrap}>
            {origin}/news/{effectiveSlug || "…"}
          </Text>
        </Column>
      </AdminCard>

      {/* Cover */}
      <AdminCard padding="20" gap="12">
        <Eyebrow as="label" htmlFor="news-cover">
          {t("adminNews.inspector.cover")}
        </Eyebrow>
        <Input
          id="news-cover"
          size="s"
          type="url"
          inputMode="url"
          maxLength={500}
          placeholder="https://…"
          value={form.coverUrl}
          error={Boolean(coverError)}
          errorMessage={coverError || undefined}
          aria-invalid={Boolean(coverError)}
          suffix={
            form.coverUrl ? (
              <IconButton
                type="button"
                icon="close"
                variant="ghost"
                size="s"
                aria-label={t("adminNews.inspector.coverRemove")}
                onClick={() => onCover("")}
              />
            ) : undefined
          }
          onChange={(event) => onCover(event.target.value)}
        />
        <ImageUrlPreview
          ratio="cover"
          url={coverValid ? cover : ""}
          hint={t("adminNews.inspector.coverHint")}
          errorText={t("adminNews.inspector.coverBroken")}
        />
      </AdminCard>

      {/* List preview */}
      <AdminCard padding="20" gap="12">
        <Eyebrow as="label">{t("adminNews.inspector.listPreview")}</Eyebrow>
        <Column fillWidth gap="12" padding="16" radius="l" border="neutral-alpha-medium" background="page">
          {cover && coverValid && (
            <Media key={cover} unoptimized src={cover} alt="" aspectRatio="16 / 9" radius="m" />
          )}
          <Row gap="8" vertical="center" wrap>
            <Tag scheme="neutral">{categoryLabel(form.category)}</Tag>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {format.date(previewDate, { dateStyle: "long" })}
            </Text>
          </Row>
          <Text variant="heading-strong-s" className={styles.clamp2}>
            {form.title.trim() || t("adminNews.untitled")}
          </Text>
          {form.summary.trim() && (
            <Text variant="body-default-s" onBackground="neutral-weak" className={styles.clamp3}>
              {form.summary.trim()}
            </Text>
          )}
        </Column>
      </AdminCard>
    </Column>
  );
}
