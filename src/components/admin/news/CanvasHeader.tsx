"use client";

import React, { useLayoutEffect, useState } from "react";
import { Tag } from "@once-ui-system/core";
import { LuChevronDown, LuImagePlus, LuPencil, LuTrash2 } from "react-icons/lu";
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
    <header className={styles.header}>
      <div className={styles.meta}>
        <label className={styles.tagPick}>
          <Tag scheme="neutral">{categoryLabel(category)}</Tag>
          <LuChevronDown className={styles.tagChevron} aria-hidden />
          <select
            className={styles.tagSelect}
            value={category}
            aria-label={t("adminNews.inspector.category")}
            onChange={(event) => onCategory(event.target.value)}
          >
            {NEWS_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {categoryLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.date}>{format.date(date, { dateStyle: "long" })}</span>
      </div>

      <div className={styles.field}>
        <textarea
          ref={titleRef}
          className={`${styles.title} ${errors.title ? styles.invalid : ""}`}
          rows={1}
          maxLength={TITLE_MAX}
          placeholder={t("adminNews.editor.titlePlaceholder")}
          aria-label={t("adminNews.editor.titleLabel")}
          aria-invalid={Boolean(errors.title)}
          value={title}
          onChange={(event) => onTitle(event.target.value.replace(/\n/g, " "))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              summaryRef.current?.focus();
            }
          }}
        />
        {errors.title && <p className={styles.error}>{errors.title}</p>}
      </div>

      <div className={styles.field}>
        <textarea
          ref={summaryRef}
          className={`${styles.summary} ${errors.summary ? styles.invalid : ""}`}
          rows={1}
          maxLength={SUMMARY_MAX}
          placeholder={t("adminNews.editor.summaryPlaceholder")}
          aria-label={t("adminNews.editor.summaryLabel")}
          aria-invalid={Boolean(errors.summary)}
          value={summary}
          onFocus={() => setSummaryFocused(true)}
          onBlur={() => setSummaryFocused(false)}
          onChange={(event) => onSummary(event.target.value.replace(/\n/g, " "))}
        />
        <div className={styles.summaryMeta}>
          {errors.summary ? <p className={styles.error}>{errors.summary}</p> : <span />}
          {showCounter && (
            <span
              className={styles.counter}
              data-level={summary.length >= SUMMARY_MAX ? "max" : summary.length > SUMMARY_MAX * 0.9 ? "near" : "ok"}
            >
              {summary.length} / {SUMMARY_MAX}
            </span>
          )}
        </div>
      </div>

      <CoverBlock url={coverUrl} error={errors.coverUrl} onChange={onCover} />
    </header>
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
      <div className={styles.coverForm}>
        <div className={styles.coverRow}>
          <input
            autoFocus
            className={styles.coverInput}
            type="text"
            inputMode="url"
            placeholder="https://…"
            aria-label={t("adminNews.inspector.cover")}
            value={draft}
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
          <button type="button" className={styles.coverApply} disabled={!valid(draft)} onClick={apply}>
            {t("adminNews.canvas.coverApply")}
          </button>
          <button type="button" className={styles.coverCancel} onClick={() => setEditing(false)}>
            {t("common.actions.cancel")}
          </button>
        </div>
        <ImageUrlPreview
          ratio="cover"
          url={valid(draft) ? draft.trim() : ""}
          hint={t("adminNews.inspector.coverHint")}
          errorText={t("adminNews.inspector.coverBroken")}
        />
      </div>
    );
  }

  if (!trimmed || !valid(trimmed)) {
    return (
      <div className={styles.coverEmptyWrap}>
        <button type="button" className={styles.addCover} onClick={open}>
          <LuImagePlus aria-hidden />
          <span>{t("adminNews.canvas.addCover")}</span>
        </button>
        {(error || (trimmed && !valid(trimmed))) && (
          <p className={styles.error}>{error ?? t("adminNews.errors.coverInvalid")}</p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.cover}>
      <ImageUrlPreview
        ratio="cover"
        url={trimmed}
        hint={t("adminNews.inspector.coverHint")}
        errorText={t("adminNews.inspector.coverBroken")}
      />
      <div className={styles.coverActions}>
        <button type="button" className={styles.coverBtn} onClick={open}>
          <LuPencil aria-hidden />
          {t("adminNews.canvas.changeCover")}
        </button>
        <button type="button" className={styles.coverBtn} onClick={() => onChange("")}>
          <LuTrash2 aria-hidden />
          {t("adminNews.inspector.coverRemove")}
        </button>
      </div>
    </div>
  );
}
