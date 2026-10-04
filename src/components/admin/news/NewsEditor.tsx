"use client";

import React, { memo, useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Dialog, Row, Tag, Text, useToast } from "@once-ui-system/core";
import { LuArrowLeft, LuCode, LuColumns2, LuEye, LuPencilLine } from "react-icons/lu";
import { useFormat, useT } from "@/i18n/client";
import { toSlug, transliterate, NEWS_SLUG_MAX } from "@/lib/news/categories";
import type { NewsActions, NewsField, NewsPostDTO } from "@/lib/news/types";
import {
  CONTENT_MAX,
  SUMMARY_MAX,
  TITLE_MAX,
  type FieldErrors,
  type FormState,
  type PostMeta,
  type Snapshot,
} from "./editorTypes";
import { CanvasHeader } from "./CanvasHeader";
import { NewsInspector } from "./NewsInspector";
import { NewsPreview } from "./NewsPreview";
import { RichTextEditor, type RichTextEditorHandle } from "./RichTextEditor";

const PreviewPane = memo(NewsPreview);
const Inspector = memo(NewsInspector);
import styles from "./NewsEditor.module.scss";

type Tab = "visual" | "markdown" | "preview";
type Busy = "draft" | "publish" | "update" | "unpublish" | null;
type Side = "settings" | "preview";

const SIDE_KEY = "amelia:news-side";

const DRAFT_PREFIX = "amelia:news-draft:";
const DRAFT_DELAY_MS = 700;

interface StoredDraft extends FormState {
  savedAt: number;
}

function formFromPost(post: NewsPostDTO | null): FormState {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    // An existing URL must not move just because the title was edited.
    slugTouched: Boolean(post),
    summary: post?.summary ?? "",
    content: post?.content ?? "",
    category: post?.category ?? "update",
    coverUrl: post?.coverUrl ?? "",
  };
}

function snapshotOf(form: FormState): Snapshot {
  return {
    title: form.title,
    slug: form.slugTouched ? toSlug(form.slug) : toSlug(form.title),
    summary: form.summary,
    content: form.content,
    category: form.category,
    coverUrl: form.coverUrl,
  };
}

function sameSnapshot(a: Snapshot, b: Snapshot) {
  return (
    a.title === b.title &&
    a.slug === b.slug &&
    a.summary === b.summary &&
    a.content === b.content &&
    a.category === b.category &&
    a.coverUrl === b.coverUrl
  );
}

function readDraft(id: string | null): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + (id ?? "new"));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (typeof parsed.title !== "string" || typeof parsed.content !== "string") return null;
    return {
      title: parsed.title,
      slug: typeof parsed.slug === "string" ? parsed.slug : "",
      slugTouched: parsed.slugTouched === true,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      content: parsed.content,
      category: typeof parsed.category === "string" ? parsed.category : "update",
      coverUrl: typeof parsed.coverUrl === "string" ? parsed.coverUrl : "",
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function writeDraft(id: string | null, form: FormState) {
  try {
    const value: StoredDraft = { ...form, savedAt: Date.now() };
    window.localStorage.setItem(DRAFT_PREFIX + (id ?? "new"), JSON.stringify(value));
  } catch {
    // Storage can be full or blocked; the draft is a convenience, never a requirement.
  }
}

function clearDraft(id: string | null) {
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + (id ?? "new"));
  } catch {
    // See writeDraft.
  }
}

export function NewsEditor({ post, actions }: { post: NewsPostDTO | null; actions: NewsActions }) {
  const t = useT();
  const format = useFormat();
  const router = useRouter();
  const { addToast } = useToast();

  const [form, setForm] = useState<FormState>(() => formFromPost(post));
  const [baseline, setBaseline] = useState<Snapshot>(() => snapshotOf(formFromPost(post)));
  const [meta, setMeta] = useState<PostMeta>(() => ({
    id: post?.id ?? null,
    published: post?.published ?? false,
    publishedAt: post?.publishedAt ?? null,
    updatedAt: post?.updatedAt ?? null,
  }));
  const [tab, setTab] = useState<Tab>("visual");
  // Bumped whenever the document is replaced from outside, so Tiptap rebuilds from the new Markdown.
  const [editorKey, setEditorKey] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<Busy>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [restorable, setRestorable] = useState<StoredDraft | null>(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [today] = useState(() => new Date().toISOString());
  const [now, setNow] = useState<number | null>(null);

  const [side, setSide] = useState<Side>("settings");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  // True between a keystroke in the visual editor and its debounced hand-over to `form.content`.
  const pendingRef = useRef(false);

  const snapshot = snapshotOf(form);
  const dirty = !sameSnapshot(snapshot, baseline);

  // Handlers registered once (window listeners) read the latest state through refs.
  const latest = useRef({ form, meta, dirty, busy });
  useEffect(() => {
    latest.current = { form, meta, dirty, busy };
  });
  const leavingRef = useRef(false);
  const busyRef = useRef(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setNow(Date.now());
    try {
      if (window.localStorage.getItem(SIDE_KEY) === "preview") setSide("preview");
    } catch {
      // A remembered panel is a convenience only.
    }
  }, []);

  // Keeps "saved 2 minutes ago" honest.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const changeSide = (next: Side) => {
    setSide(next);
    try {
      window.localStorage.setItem(SIDE_KEY, next);
    } catch {
      // See above.
    }
  };

  /* ───────────── Local draft safety ───────────── */

  useEffect(() => {
    const stored = readDraft(post?.id ?? null);
    if (!stored) return;

    const differs = !sameSnapshot(snapshotOf(stored), baseline);
    if (differs) setRestorable(stored);
    else clearDraft(post?.id ?? null);
    // Runs once: it compares the stored draft with what the server sent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Wait for the author to answer the restore banner before touching storage.
    if (restorable) return;

    const timer = window.setTimeout(() => {
      if (dirty) writeDraft(meta.id, form);
      else clearDraft(meta.id);
    }, DRAFT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [form, dirty, meta.id, restorable]);

  const restore = () => {
    if (!restorable) return;
    const { savedAt: _savedAt, ...rest } = restorable;
    setForm(rest);
    setEditorKey((key) => key + 1);
    setRestorable(null);
  };

  const discardStored = () => {
    clearDraft(meta.id);
    setRestorable(null);
  };

  /* ───────────── Leaving with unsaved changes ───────────── */

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!(latest.current.dirty || pendingRef.current) || leavingRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      if (!(latest.current.dirty || pendingRef.current) || leavingRef.current) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!anchor || anchor.hasAttribute("download") || anchor.getAttribute("target") === "_blank") {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let next: URL;
      try {
        next = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (next.protocol !== "http:" && next.protocol !== "https:") return;
      if (next.pathname === window.location.pathname && next.search === window.location.search) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setLeaveHref(next.origin === window.location.origin ? next.pathname + next.search : next.href);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const leaveTo = (href: string) => {
    leavingRef.current = true;
    setLeaveHref(null);
    if (/^https?:\/\//i.test(href)) window.location.assign(href);
    else router.push(href);
  };

  /* ───────────── Editing ───────────── */

  const update = useCallback((patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      if ("title" in patch) delete next.title;
      if ("summary" in patch) delete next.summary;
      if ("content" in patch) delete next.content;
      if ("category" in patch) delete next.category;
      if ("coverUrl" in patch) delete next.coverUrl;
      if ("slug" in patch || "slugTouched" in patch || "title" in patch) delete next.slug;
      return next;
    });
  }, []);

  const onSlugInput = useCallback((raw: string) => {
    const cleaned = transliterate(raw)
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-{2,}/g, "-")
      .slice(0, NEWS_SLUG_MAX);

    // Clearing the field hands the slug back to the title.
    if (!cleaned) update({ slug: "", slugTouched: false });
    else update({ slug: cleaned, slugTouched: true });
  }, [update]);

  /* ───────────── Saving ───────────── */

  const validate = (snap: Snapshot): FieldErrors => {
    const found: FieldErrors = {};
    const title = snap.title.trim();
    if (title.length < 3 || title.length > TITLE_MAX) found.title = t("adminNews.errors.titleLength");
    if (!snap.content.trim()) found.content = t("adminNews.errors.bodyEmpty");
    else if (snap.content.trim().length > CONTENT_MAX) found.content = t("adminNews.errors.bodyTooLong");
    if (snap.summary.trim().length > SUMMARY_MAX) found.summary = t("adminNews.errors.summaryTooLong");
    const cover = snap.coverUrl.trim();
    if (cover && !/^https?:\/\/\S+$/i.test(cover)) found.coverUrl = t("adminNews.errors.coverInvalid");
    return found;
  };

  const save = useCallback(
    async (publish: boolean, kind: Exclude<Busy, null>): Promise<boolean> => {
      if (busyRef.current) return false;

      // Keystrokes still inside the editor's debounce are part of this save.
      const liveContent = editorRef.current?.getMarkdown();
      editorRef.current?.flush();
      const current = latest.current;
      const formNow = liveContent === undefined ? current.form : { ...current.form, content: liveContent };
      const snap = snapshotOf(formNow);
      const found = validate(snap);

      if (Object.keys(found).length > 0) {
        setErrors(found);
        const first = Object.values(found)[0];
        if (first) addToast({ message: first, variant: "danger" });
        if (found.title) titleRef.current?.focus();
        return false;
      }

      busyRef.current = true;
      setBusy(kind);
      setErrors({});

      try {
        const result = await actions.save({
          id: current.meta.id ?? undefined,
          title: snap.title,
          slug: snap.slug,
          summary: snap.summary,
          content: snap.content,
          category: snap.category,
          coverUrl: snap.coverUrl,
          published: publish,
        });

        if (!result.ok) {
          const field: NewsField | undefined = result.field;
          if (field) setErrors({ [field]: result.error });
          addToast({ message: result.error, variant: "danger" });
          return false;
        }

        const wasNew = !current.meta.id;
        const saved: Snapshot = { ...snap, slug: result.slug };

        setBaseline(saved);
        setMeta({
          id: result.id,
          published: result.published,
          publishedAt: result.publishedAt,
          updatedAt: result.updatedAt,
        });
        // The URL is fixed once the post exists, so the slug stops following the title.
        setForm((prev) => {
          // The editor normalises Markdown; adopt what was saved unless the text changed meanwhile.
          const next =
            prev.content === current.form.content || prev.content === snap.content
              ? { ...prev, content: snap.content }
              : prev;
          return sameSnapshot(snapshotOf(next), snap)
            ? { ...next, slug: result.slug, slugTouched: true }
            : next;
        });
        clearDraft(current.meta.id);
        clearDraft(result.id);
        setNow(Date.now());

        addToast({
          message: t(
            kind === "publish"
              ? "adminNews.toast.published"
              : kind === "update"
                ? "adminNews.toast.updated"
                : kind === "unpublish"
                  ? "adminNews.toast.unpublished"
                  : "adminNews.toast.draftSaved",
          ),
          variant: "success",
        });

        if (wasNew) {
          // Move to the post's own URL without remounting the editor (and losing the cursor).
          window.history.replaceState(null, "", `/admin/news/${result.id}`);
        } else {
          router.refresh();
        }
        return true;
      } catch {
        addToast({ message: t("adminNews.errors.saveFailed"), variant: "danger" });
        return false;
      } finally {
        busyRef.current = false;
        setBusy(null);
      }
    },
    // validate/addToast/router are stable enough; state is read through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions, t],
  );

  const saveInPlace = useCallback(() => {
    const { meta: m } = latest.current;
    return save(m.published, m.published ? "update" : "draft");
  }, [save]);

  // Cmd/Ctrl+S
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (latest.current.dirty || pendingRef.current || !latest.current.meta.id) void saveInPlace();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveInPlace]);

  const togglePublished = async (next: boolean) => {
    const id = latest.current.meta.id;
    if (!id) return;

    setStatusBusy(true);
    try {
      const result = await actions.setPublished(id, next);
      if (!result.ok) {
        addToast({ message: result.error, variant: "danger" });
        return;
      }
      setMeta((prev) => ({ ...prev, published: result.published, publishedAt: result.publishedAt }));
      addToast({
        message: t(result.published ? "adminNews.toast.published" : "adminNews.toast.unpublished"),
        variant: "success",
      });
      router.refresh();
    } catch {
      addToast({ message: t("adminNews.errors.saveFailed"), variant: "danger" });
    } finally {
      setStatusBusy(false);
    }
  };

  const deletePost = async () => {
    const id = latest.current.meta.id;
    if (!id) return;

    try {
      const result = await actions.remove(id);
      if (!result.ok) {
        addToast({ message: result.error, variant: "danger" });
        return;
      }
      clearDraft(id);
      leavingRef.current = true;
      addToast({ message: t("adminNews.toast.deleted"), variant: "success" });
      router.push("/admin/news");
    } catch {
      addToast({ message: t("adminNews.errors.deleteFailed"), variant: "danger" });
    }
  };

  /* ───────────── Derived view state ───────────── */

  const words = form.content.trim() ? form.content.trim().split(/\s+/).length : 0;
  const chars = form.content.length;
  const tooLong = chars > CONTENT_MAX;
  const effectiveSlug = form.slugTouched ? form.slug : toSlug(form.title);
  const previewDate = meta.published && meta.publishedAt ? meta.publishedAt : today;
  const deferred = {
    title: useDeferredValue(form.title),
    summary: useDeferredValue(form.summary),
    content: useDeferredValue(form.content),
    coverUrl: useDeferredValue(form.coverUrl),
  };

  const stateKey = busy ? "saving" : dirty ? "unsaved" : meta.id ? "saved" : "new";
  const savedAgo =
    stateKey === "saved" && meta.updatedAt && now !== null
      ? format.relative(meta.updatedAt, Math.max(now, new Date(meta.updatedAt).getTime()))
      : "";

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: "visual", label: t("adminNews.editor.tabs.visual"), icon: <LuPencilLine aria-hidden /> },
    { id: "markdown", label: t("adminNews.editor.tabs.source"), icon: <LuCode aria-hidden /> },
    { id: "preview", label: t("adminNews.editor.tabs.preview"), icon: <LuEye aria-hidden /> },
  ];

  const onTabKeyDown = (event: React.KeyboardEvent) => {
    const index = tabs.findIndex((item) => item.id === tab);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else return;
    event.preventDefault();
    setTab(tabs[next].id);
    document.getElementById(`news-tab-${tabs[next].id}`)?.focus();
  };

  const onCategory = useCallback((category: string) => update({ category }), []);
  const onSlugReset = useCallback(() => update({ slug: "", slugTouched: false }), []);
  const onCover = useCallback((coverUrl: string) => update({ coverUrl }), []);

  const header = (
    <CanvasHeader
      title={form.title}
      summary={form.summary}
      category={form.category}
      coverUrl={form.coverUrl}
      date={previewDate}
      errors={errors}
      titleRef={titleRef}
      summaryRef={summaryRef}
      onTitle={(title) => update({ title })}
      onSummary={(summary) => update({ summary })}
      onCategory={onCategory}
      onCover={onCover}
    />
  );

  return (
    <div className={styles.page}>
      {/* ───── Sticky top bar ───── */}
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <Link href="/admin/news" className={styles.back}>
            <LuArrowLeft aria-hidden />
            <span className={styles.backLabel}>{t("adminNews.editor.back")}</span>
          </Link>
          <span className={styles.divider} aria-hidden />
          <div className={styles.state} role="status" aria-live="polite">
            <span className={styles.dot} data-state={stateKey} aria-hidden />
            <span className={styles.stateText}>
              {t(`adminNews.editor.state.${stateKey}`)}
              {savedAgo && <span className={styles.stateSub}> · {savedAgo}</span>}
            </span>
          </div>
          <Tag scheme={meta.published ? "success" : "neutral"} size="s" className={styles.statusTag}>
            {meta.published ? t("adminNews.status.published") : t("adminNews.status.draft")}
          </Tag>
        </div>

        <Row gap="8" vertical="center" className={styles.topRight}>
          {meta.published ? (
            <Button
              variant="secondary"
              size="m"
              loading={busy === "unpublish"}
              disabled={busy !== null}
              onClick={() => save(false, "unpublish")}
            >
              {t("adminNews.editor.actions.unpublish")}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="m"
              loading={busy === "draft"}
              disabled={busy !== null || (Boolean(meta.id) && !dirty)}
              onClick={() => save(false, "draft")}
            >
              {t("adminNews.editor.actions.saveDraft")}
            </Button>
          )}
          {meta.published ? (
            <Button
              variant="primary"
              size="m"
              loading={busy === "update"}
              disabled={busy !== null || !dirty}
              onClick={() => save(true, "update")}
            >
              {t("adminNews.editor.actions.update")}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="m"
              loading={busy === "publish"}
              disabled={busy !== null}
              onClick={() => save(true, "publish")}
            >
              {t("adminNews.editor.actions.publish")}
            </Button>
          )}
        </Row>
      </header>

      {restorable && (
        <div className={styles.banner} role="alert">
          <Text variant="body-default-s" onBackground="neutral-strong" className={styles.bannerText}>
            {t("adminNews.restore.text", {
              time: now !== null ? format.relative(restorable.savedAt, now) : format.dateTime(restorable.savedAt),
            })}
          </Text>
          <Row gap="8">
            <Button size="s" variant="secondary" onClick={discardStored}>
              {t("adminNews.restore.discard")}
            </Button>
            <Button size="s" variant="primary" onClick={restore}>
              {t("adminNews.restore.restore")}
            </Button>
          </Row>
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.main}>
          {/* Mode bar */}
          <div className={styles.modeBar}>
            <div
              className={styles.tabs}
              role="tablist"
              aria-label={t("adminNews.editor.tabsLabel")}
              onKeyDown={onTabKeyDown}
            >
              {tabs.map((item) => (
                <button
                  key={item.id}
                  id={`news-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  aria-controls={`news-panel-${item.id}`}
                  aria-label={item.label}
                  tabIndex={tab === item.id ? 0 : -1}
                  className={`${styles.tab} ${tab === item.id ? styles.tabActive : ""}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.icon}
                  <span className={styles.tabLabel}>{item.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.modeEnd}>
              <div className={styles.stats}>
                <span>{t("adminNews.editor.words", { count: words })}</span>
                <span className={tooLong ? styles.statsDanger : undefined}>
                  {t("adminNews.editor.chars", {
                    count: format.number(chars),
                    max: format.number(CONTENT_MAX),
                  })}
                </span>
              </div>
              <button
                type="button"
                className={`${styles.liveToggle} ${side === "preview" ? styles.liveOn : ""}`}
                aria-pressed={side === "preview"}
                onClick={() => changeSide(side === "preview" ? "settings" : "preview")}
              >
                <LuColumns2 aria-hidden />
                <span>{t("adminNews.editor.livePreview")}</span>
              </button>
            </div>
          </div>

          <div
            id={`news-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`news-tab-${tab}`}
            className={`${styles.canvas} ${errors.content ? styles.canvasInvalid : ""}`}
          >
            {tab === "visual" && (
              <RichTextEditor
                key={editorKey}
                ref={editorRef}
                initialMarkdown={form.content}
                placeholder={t("adminNews.visual.placeholder")}
                onActivity={() => {
                  pendingRef.current = true;
                }}
                onChange={(markdown) => {
                  pendingRef.current = false;
                  update({ content: markdown });
                }}
                header={header}
              />
            )}

            {tab === "markdown" && (
              <>
                {header}
                <textarea
                  className={styles.markdown}
                  spellCheck={false}
                  rows={22}
                  placeholder={t("adminNews.markdown.placeholder")}
                  aria-label={t("adminNews.markdown.ariaLabel")}
                  value={form.content}
                  onChange={(event) => update({ content: event.target.value })}
                />
              </>
            )}

            {tab === "preview" && (
              <NewsPreview
                title={form.title}
                summary={form.summary}
                content={form.content}
                category={form.category}
                coverUrl={form.coverUrl}
                date={previewDate}
              />
            )}
          </div>
          {errors.content && <p className={styles.error}>{errors.content}</p>}
        </div>

        <aside className={styles.aside} data-side={side} aria-label={t("adminNews.inspector.label")}>
          <div className={styles.sideSwitch} role="group" aria-label={t("adminNews.editor.sideLabel")}>
            <button
              type="button"
              aria-pressed={side === "settings"}
              className={`${styles.sideBtn} ${side === "settings" ? styles.sideOn : ""}`}
              onClick={() => changeSide("settings")}
            >
              {t("adminNews.editor.settings")}
            </button>
            <button
              type="button"
              aria-pressed={side === "preview"}
              className={`${styles.sideBtn} ${side === "preview" ? styles.sideOn : ""}`}
              onClick={() => changeSide("preview")}
            >
              {t("adminNews.editor.livePreview")}
            </button>
          </div>

          <div className={styles.settingsPane} hidden={side !== "settings"} data-pane="settings">
            <Inspector
              form={form}
              meta={meta}
              errors={errors}
              effectiveSlug={effectiveSlug}
              origin={origin}
              previewDate={previewDate}
              statusBusy={statusBusy}
              onCategory={onCategory}
              onSlugInput={onSlugInput}
              onSlugReset={onSlugReset}
              onCover={onCover}
              onTogglePublished={togglePublished}
              onDelete={deletePost}
            />
          </div>

          {side === "preview" && (
            <div className={styles.livePane} data-pane="live">
              <PreviewPane
                title={deferred.title}
                summary={deferred.summary}
                content={deferred.content}
                category={form.category}
                coverUrl={deferred.coverUrl}
                date={previewDate}
              />
            </div>
          )}
        </aside>
      </div>

      <Dialog
        open={leaveHref !== null}
        onClose={() => setLeaveHref(null)}
        title={t("adminNews.leave.title")}
        description={t("adminNews.leave.text")}
        footer={
          <Row gap="8" horizontal="end" wrap fillWidth>
            <Button variant="secondary" onClick={() => setLeaveHref(null)}>
              {t("adminNews.leave.stay")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (leaveHref) leaveTo(leaveHref);
              }}
            >
              {t("adminNews.leave.discard")}
            </Button>
            <Button
              variant="primary"
              loading={busy !== null}
              onClick={async () => {
                const href = leaveHref;
                const saved = await saveInPlace();
                // Stay on the page when saving failed, so nothing is lost.
                if (href && saved) leaveTo(href);
                else setLeaveHref(null);
              }}
            >
              {t("adminNews.leave.save")}
            </Button>
          </Row>
        }
      />
    </div>
  );
}
