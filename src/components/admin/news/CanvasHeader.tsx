"use client";

import React, { useLayoutEffect, useState } from "react";
import { Button, Card, Column, Input, Row, Text, Textarea } from "@once-ui-system/core";
import { LuImagePlus, LuPencil, LuTrash2 } from "react-icons/lu";
import { MenuSelect } from "@/components/admin/MenuSelect";
import { useFormat, useT } from "@/i18n/client";
import { NEWS_CATEGORIES, isNewsCategory } from "@/lib/news/categories";
import { ImageUrlPreview } from "./ImageUrlPreview";
import { SUMMARY_MAX, TITLE_MAX, type FieldErrors } from "./editorTypes";
import styles from "./CanvasHeader.module.scss";

function useAutoGrow(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}

interface CanvasHeaderProps {
  title: string;
  summary: string;
  category: string;
  coverUrl: string;
  /** ISO date shown next to the category, like on the published page. */
  date: string;
  errors: FieldErrors;
  titleRef: React.RefObject<HTMLTextAreaElement | null>;
  summaryRef: React.RefObject<HTMLTextAreaElement | null>;
  onTitle: (value: string) => void;
  onSummary: (value: string) => void;
  onCategory: (value: string) => void;
  onCover: (value: string) => void;
}

/**
 * The top of the article as readers see it (category, date, title, summary, cover),
 * except that every part is edited in place.
 */
export function CanvasHeader({
  title,
  summary,
  category,
  coverUrl,
  date,
  errors,
  titleRef,
  summaryRef,
  onTitle,
  onSummary,
  onCategory,
  onCover,
}: CanvasHeaderProps) {
  const t = useT();
  const format = useFormat();
  const [summaryFocused, setSummaryFocused] = useState(false);

  useAutoGrow(titleRef, title);
  useAutoGrow(summaryRef, summary);

  const categoryLabel = (value: string) =>
    isNewsCategory(value) ? t(`adminNews.categories.${value}`) : value;

  const showCounter = summaryFocused || summary.length > SUMMARY_MAX * 0.75;

  return (
    <Column
      as="header"
      fillWidth
      maxWidth="s"
      gap="12"
      paddingX="24"
      paddingTop="32"
      paddingBottom="24"
      s={{ paddingX: "16", paddingTop: "24", paddingBottom: "16" }}
    >
      <Row wrap vertical="center" gap="8">
        <MenuSelect
          value={category}
          minWidth={10}
          onSelect={onCategory}
          options={NEWS_CATEGORIES.map((item) => ({ value: item, label: categoryLabel(item) }))}
          trigger={
            <Button
              type="button"
              variant="tertiary"
              size="s"
              suffixIcon="chevronDown"
              aria-label={t("adminNews.inspector.category")}
            >
              {categoryLabel(category)}
            </Button>
          }
        />
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {format.date(date, { dateStyle: "long" })}
        </Text>
      </Row>

      <Column fillWidth gap="4">
        <Textarea
          id="news-title"
          ref={titleRef}
          variant="ghost"
          lines={1}
          resize="none"
          maxLength={TITLE_MAX}
          placeholder={t("adminNews.editor.titlePlaceholder")}
          aria-label={t("adminNews.editor.titleLabel")}
          aria-invalid={Boolean(errors.title)}
          error={Boolean(errors.title)}
          value={title}
          className={styles.titleField}
          onChange={(event) => onTitle(event.target.value.replace(/\n/g, " "))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              summaryRef.current?.focus();
            }
          }}
        />
        {errors.title && (
          <Text as="p" variant="label-default-s" onBackground="danger-strong">
            {errors.title}
          </Text>
        )}
      </Column>

      <Column fillWidth gap="4">
        <Textarea
          id="news-summary"
          ref={summaryRef}
          variant="ghost"
          lines={1}
          resize="none"
          maxLength={SUMMARY_MAX}
          placeholder={t("adminNews.editor.summaryPlaceholder")}
          aria-label={t("adminNews.editor.summaryLabel")}
          aria-invalid={Boolean(errors.summary)}
          error={Boolean(errors.summary)}
          value={summary}
          className={styles.summaryField}
          onFocus={() => setSummaryFocused(true)}
          onBlur={() => setSummaryFocused(false)}
          onChange={(event) => onSummary(event.target.value.replace(/\n/g, " "))}
        />
        <Row fillWidth vertical="center" horizontal="between">
          {errors.summary ? (
            <Text as="p" variant="label-default-s" onBackground="danger-strong">
              {errors.summary}
            </Text>
          ) : (
            <Row />
          )}
          {showCounter && (
            <Text
              variant="label-default-s"
              onBackground={
                summary.length >= SUMMARY_MAX
                  ? "danger-strong"
                  : summary.length > SUMMARY_MAX * 0.9
                    ? "warning-strong"
                    : "neutral-weak"
              }
              style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}
            >
              {summary.length} / {SUMMARY_MAX}
            </Text>
          )}
        </Row>
      </Column>

      <CoverBlock url={coverUrl} error={errors.coverUrl} onChange={onCover} />
    </Column>
  );
}

function CoverBlock({
  url,
  error,
  onChange,
}: {
  url: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const valid = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());
  const trimmed = url.trim();

  const open = () => {
    setDraft(url);
    setEditing(true);
  };

  const apply = () => {
    if (!valid(draft)) return;
    onChange(draft.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <Column
        fillWidth
        gap="8"
        marginTop="4"
        padding="12"
        radius="l"
        border="neutral-alpha-medium"
        background="neutral-alpha-weak"
      >
        <Row fillWidth wrap gap="8">
          <Input
            id="news-cover-draft"
            autoFocus
            size="s"
            type="text"
            inputMode="url"
            placeholder="https://…"
            aria-label={t("adminNews.inspector.cover")}
            value={draft}
            style={{ flex: "1 1 14rem", minWidth: 0 }}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                apply();
              } else if (event.key === "Escape") {
                setEditing(false);
              }
            }}
          />
          <Button type="button" variant="primary" size="m" disabled={!valid(draft)} onClick={apply}>
            {t("adminNews.canvas.coverApply")}
          </Button>
          <Button type="button" variant="secondary" size="m" onClick={() => setEditing(false)}>
            {t("common.actions.cancel")}
          </Button>
        </Row>
        <ImageUrlPreview
          ratio="cover"
          url={valid(draft) ? draft.trim() : ""}
          hint={t("adminNews.inspector.coverHint")}
          errorText={t("adminNews.inspector.coverBroken")}
        />
      </Column>
    );
  }

  if (!trimmed || !valid(trimmed)) {
    return (
      <Column fillWidth gap="4" marginTop="4">
        <Card
          fillWidth
          center
          gap="8"
          height={3.5}
          radius="l"
          background="transparent"
          border="neutral-alpha-strong"
          borderStyle="dashed"
          onBackground="neutral-weak"
          className={styles.addCover}
          onClick={open}
        >
          <LuImagePlus aria-hidden />
          <Text variant="body-default-s">{t("adminNews.canvas.addCover")}</Text>
        </Card>
        {(error || (trimmed && !valid(trimmed))) && (
          <Text as="p" variant="label-default-s" onBackground="danger-strong">
            {error ?? t("adminNews.errors.coverInvalid")}
          </Text>
        )}
      </Column>
    );
  }

  return (
    <Column fillWidth marginTop="12" className={styles.cover}>
      <ImageUrlPreview
        ratio="cover"
        url={trimmed}
        hint={t("adminNews.inspector.coverHint")}
        errorText={t("adminNews.inspector.coverBroken")}
      />
      <Row position="absolute" top="12" right="12" gap="8" className={styles.coverActions}>
        <Button type="button" variant="secondary" size="s" className={styles.coverBtn} onClick={open}>
          <LuPencil aria-hidden /> {t("adminNews.canvas.changeCover")}
        </Button>
        <Button type="button" variant="secondary" size="s" className={styles.coverBtn} onClick={() => onChange("")}>
          <LuTrash2 aria-hidden /> {t("adminNews.inspector.coverRemove")}
        </Button>
      </Row>
    </Column>
  );
}
