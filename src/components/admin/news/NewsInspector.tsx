"use client";

import React from "react";
import { Column, Row, Switch, Tag, Text } from "@once-ui-system/core";
import { LuX } from "react-icons/lu";
import { AdminCard } from "@/components/admin/AdminPage";
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

function Eyebrow({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label className={styles.eyebrow} htmlFor={htmlFor}>
      {children}
    </label>
  );
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
    <div className={styles.stack}>
      {/* Status */}
      <AdminCard padding="20" gap="12">
        <Row horizontal="between" vertical="center" gap="12">
          <Column gap="4" style={{ minWidth: 0 }}>
            <Eyebrow>{t("adminNews.inspector.status")}</Eyebrow>
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
          <Row horizontal="between" vertical="center" className={styles.danger}>
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
        <Eyebrow>{t("adminNews.inspector.category")}</Eyebrow>
        <div className={styles.chips} role="radiogroup" aria-label={t("adminNews.inspector.category")}>
          {NEWS_CATEGORIES.map((category) => {
            const tokens = categoryTokens(category);
            const selected = form.category === category;
            return (
              <button
                key={category}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
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
                <span className={styles.chipIcon}>
                  <CategoryIcon category={category} size={16} />
                </span>
                <span className={styles.chipText}>
                  <span className={styles.chipLabel}>{categoryLabel(category)}</span>
                  <span className={styles.chipHint}>{t(`adminNews.categoryHints.${category}`)}</span>
                </span>
              </button>
            );
          })}
        </div>
        {errors.category && <p className={styles.error}>{errors.category}</p>}
      </AdminCard>

      {/* Slug */}
      <AdminCard padding="20" gap="12">
        <Row horizontal="between" vertical="center" gap="8">
          <Eyebrow htmlFor="news-slug">{t("adminNews.inspector.slug")}</Eyebrow>
          {auto ? (
            <Tag scheme="brand" size="s">
              {t("adminNews.inspector.slugAuto")}
            </Tag>
          ) : (
            <button type="button" className={styles.link} onClick={onSlugReset}>
              {t("adminNews.inspector.slugReset")}
            </button>
          )}
        </Row>
        <div className={`${styles.slugField} ${errors.slug ? styles.slugInvalid : ""}`}>
          <span className={styles.slugPrefix} aria-hidden>
            /news/
          </span>
          <input
            id="news-slug"
            className={styles.slugInput}
            type="text"
            value={effectiveSlug}
            maxLength={80}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder={t("adminNews.inspector.slugPlaceholder")}
            aria-invalid={Boolean(errors.slug)}
            aria-describedby="news-slug-url"
            onChange={(event) => onSlugInput(event.target.value)}
          />
        </div>
        {errors.slug && <p className={styles.error}>{errors.slug}</p>}
        <p id="news-slug-url" className={styles.url}>
          <span className={styles.urlLabel}>{t("adminNews.inspector.publicUrl")}</span>
          <span className={styles.urlValue}>
            {origin}/news/{effectiveSlug || "…"}
          </span>
        </p>
      </AdminCard>

      {/* Cover */}
      <AdminCard padding="20" gap="12">
        <Eyebrow htmlFor="news-cover">{t("adminNews.inspector.cover")}</Eyebrow>
        <div className={`${styles.coverField} ${coverError ? styles.slugInvalid : ""}`}>
          <input
            id="news-cover"
            className={styles.slugInput}
            type="url"
            inputMode="url"
            maxLength={500}
            placeholder="https://…"
            value={form.coverUrl}
            aria-invalid={Boolean(coverError)}
            onChange={(event) => onCover(event.target.value)}
          />
          {form.coverUrl && (
            <button
              type="button"
              className={styles.clear}
              aria-label={t("adminNews.inspector.coverRemove")}
              onClick={() => onCover("")}
            >
              <LuX aria-hidden />
            </button>
          )}
        </div>
        {coverError && <p className={styles.error}>{coverError}</p>}
        <ImageUrlPreview
          ratio="cover"
          url={coverValid ? cover : ""}
          hint={t("adminNews.inspector.coverHint")}
          errorText={t("adminNews.inspector.coverBroken")}
        />
      </AdminCard>

      {/* List preview */}
      <AdminCard padding="20" gap="12">
        <Eyebrow>{t("adminNews.inspector.listPreview")}</Eyebrow>
        <div className={styles.miniCard}>
          {cover && coverValid && (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={cover} src={cover} alt="" className={styles.miniCover} />
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
        </div>
      </AdminCard>
    </div>
  );
}
