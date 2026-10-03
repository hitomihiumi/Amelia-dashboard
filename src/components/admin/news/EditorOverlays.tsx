"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";
import {
  LuBold,
  LuCode,
  LuHeading2,
  LuHeading3,
  LuItalic,
  LuLink,
  LuPlus,
  LuStrikethrough,
  LuUnlink,
} from "react-icons/lu";
import { useT } from "@/i18n/client";
import { normalizeLinkUrl } from "./EditorToolbar";
import { SLASH_ITEMS, type SlashItem } from "./slashItems";
import styles from "./EditorOverlays.module.scss";

/* The menus live in a portal: the page frame uses CSS containment, which would make
   `position: fixed` relative to the frame instead of the viewport. */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

function coords(editor: Editor, pos: number) {
  try {
    return editor.view.coordsAtPos(pos);
  } catch {
    return null;
  }
}

/** Re-runs `update` when the page scrolls or resizes, so fixed menus follow their anchor. */
function useReposition(active: boolean, update: () => void) {
  useEffect(() => {
    if (!active) return;
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, update]);
}

/* ───────────────────────── Slash menu ───────────────────────── */

interface SlashState {
  from: number;
  to: number;
  query: string;
}

interface Props {
  editor: Editor;
}

export function SlashMenu({
  editor,
  keyHandler,
  onImage,
}: Props & {
  /** The editor's keydown hook; the menu fills it in while it is open. */
  keyHandler: React.MutableRefObject<(event: KeyboardEvent) => boolean>;
  onImage: () => void;
}) {
  const t = useT();
  const [state, setState] = useState<SlashState | null>(null);
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number; bottom: number } | null>(null);
  const dismissed = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const label = useCallback((item: SlashItem) => t(`adminNews.slash.items.${item.id}`), [t]);

  const items = useMemo(() => {
    if (!state) return [];
    const q = state.query.toLowerCase();
    if (!q) return SLASH_ITEMS;
    return SLASH_ITEMS.filter(
      (item) =>
        label(item).toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.keywords.some((word) => word.startsWith(q)),
    );
  }, [state, label]);

  // Detect "/query" typed at the start of a paragraph or after a space.
  useEffect(() => {
    const compute = () => {
      const { selection } = editor.state;
      let next: SlashState | null = null;

      if (editor.isFocused && selection.empty) {
        const { $from } = selection;
        if ($from.parent.type.name === "paragraph") {
          const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
          const match = /(?:^|\s)\/([^\s/]*)$/.exec(before);
          if (match) {
            next = { from: $from.pos - match[1].length - 1, to: $from.pos, query: match[1] };
          }
        }
      }

      if (!next) dismissed.current = null;
      else if (dismissed.current === next.from) next = null;

      setState((prev) =>
        prev && next && prev.from === next.from && prev.to === next.to && prev.query === next.query
          ? prev
          : next,
      );
    };

    editor.on("transaction", compute);
    editor.on("focus", compute);
    editor.on("blur", compute);
    return () => {
      editor.off("transaction", compute);
      editor.off("focus", compute);
      editor.off("blur", compute);
    };
  }, [editor]);

  useEffect(() => setIndex(0), [state?.query, state?.from]);

  const measure = useCallback(() => {
    if (!state) return setPos(null);
    const c = coords(editor, state.from);
    if (c) setPos({ x: c.left, y: c.top, bottom: c.bottom });
  }, [editor, state]);

  useLayoutEffect(measure, [measure]);
  useReposition(Boolean(state), measure);

  const run = useCallback(
    (item: SlashItem) => {
      if (!state) return;
      const chain = editor.chain().focus().deleteRange({ from: state.from, to: state.to });
      item.run(chain).run();
      if (item.id === "image") onImage();
    },
    [editor, state, onImage],
  );

  const open = Boolean(state) && items.length > 0;

  useEffect(() => {
    keyHandler.current = (event) => {
      if (!open) return false;
      if (event.key === "ArrowDown") {
        setIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setIndex((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        run(items[Math.min(index, items.length - 1)]);
        return true;
      }
      if (event.key === "Escape") {
        dismissed.current = state?.from ?? null;
        setState(null);
        return true;
      }
      return false;
    };
    return () => {
      keyHandler.current = () => false;
    };
  }, [keyHandler, open, items, index, run, state]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open || !pos) return null;

  const width = 288;
  const left = Math.max(8, Math.min(pos.x, window.innerWidth - width - 8));
  const spaceBelow = window.innerHeight - pos.bottom - 14;
  const spaceAbove = pos.y - 14;
  const below = spaceBelow >= 260 || spaceBelow >= spaceAbove;
  const maxHeight = Math.max(160, Math.min(320, below ? spaceBelow : spaceAbove));

  return (
    <Portal>
      <div
        className={styles.slash}
        style={{
          left,
          width,
          maxHeight,
          ...(below
            ? { top: pos.bottom + 6 }
            : { top: pos.y - 6, transform: "translateY(-100%)" }),
        }}
        role="listbox"
        aria-label={t("adminNews.slash.title")}
        ref={listRef}
        onMouseDown={(event) => event.preventDefault()}
      >
        <p className={styles.slashTitle}>{t("adminNews.slash.title")}</p>
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={i === index}
              data-index={i}
              className={`${styles.slashItem} ${i === index ? styles.slashActive : ""}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => run(item)}
            >
              <span className={styles.slashIcon}>
                <Icon aria-hidden />
              </span>
              <span className={styles.slashText}>
                <span className={styles.slashLabel}>{label(item)}</span>
                <span className={styles.slashHint}>{t(`adminNews.slash.hints.${item.id}`)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Portal>
  );
}

/* ───────────────────────── Selection (bubble) menu ───────────────────────── */

export function BubbleToolbar({ editor }: Props) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; top: number; bottom: number } | null>(null);
  const [linkMode, setLinkModeState] = useState(false);
  const linkModeRef = useRef(false);
  const setLinkMode = useCallback((value: boolean) => {
    linkModeRef.current = value;
    setLinkModeState(value);
  }, []);
  const [url, setUrl] = useState("");
  const [invalid, setInvalid] = useState(false);

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
    }),
  });

  const compute = useCallback(() => {
    const { selection } = editor.state;
    const hasText =
      !selection.empty &&
      selection instanceof TextSelection &&
      !editor.isActive("codeBlock") &&
      editor.state.doc.textBetween(selection.from, selection.to, " ").trim() !== "";
    const focusInside = Boolean(ref.current?.contains(document.activeElement));

    // While the address field is open the editor is blurred on purpose.
    if (!hasText || !(editor.isFocused || focusInside || linkModeRef.current)) {
      setAnchor(null);
      setLinkMode(false);
      return;
    }

    const a = coords(editor, selection.from);
    const b = coords(editor, selection.to);
    if (!a || !b) return setAnchor(null);
    setAnchor({
      x: (Math.min(a.left, b.left) + Math.max(a.right, b.right)) / 2,
      top: Math.min(a.top, b.top),
      bottom: Math.max(a.bottom, b.bottom),
    });
  }, [editor, setLinkMode]);

  useEffect(() => {
    // On blur, document.activeElement is not the new target yet; look one tick later.
    const afterBlur = () => window.setTimeout(compute, 0);
    editor.on("transaction", compute);
    editor.on("focus", compute);
    editor.on("blur", afterBlur);
    return () => {
      editor.off("transaction", compute);
      editor.off("focus", compute);
      editor.off("blur", afterBlur);
    };
  }, [editor, compute]);

  useReposition(Boolean(anchor), compute);

  useEffect(() => {
    if (!linkMode) return;
    inputRef.current?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      setLinkMode(false);
      window.setTimeout(compute, 0);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [linkMode, compute, setLinkMode]);

  const openLink = () => {
    setUrl((editor.getAttributes("link").href as string | undefined) ?? "");
    setInvalid(false);
    setLinkMode(true);
  };

  const closeLink = () => {
    setLinkMode(false);
    editor.commands.focus();
  };

  const applyLink = () => {
    const href = normalizeLinkUrl(url);
    if (!href) return setInvalid(true);
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkMode(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkMode(false);
  };

  if (!anchor) return null;

  const width = linkMode ? 320 : 276;
  const left = Math.max(8 + width / 2, Math.min(anchor.x, window.innerWidth - width / 2 - 8));
  // Selections scrolled under the sticky bars get the menu below them instead.
  const above = anchor.top > 150;

  const btn = (
    label: string,
    on: boolean,
    action: () => void,
    icon: React.ReactNode,
  ) => (
    <button
      type="button"
      className={`${styles.bubbleBtn} ${on ? styles.bubbleOn : ""}`}
      aria-label={label}
      aria-pressed={on}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
    >
      {icon}
    </button>
  );

  return (
    <Portal>
      <div
        ref={ref}
        className={styles.bubble}
        role="toolbar"
        aria-label={t("adminNews.toolbar.label")}
        style={{
          left,
          ...(above
            ? { top: anchor.top - 8, transform: "translate(-50%, -100%)" }
            : { top: anchor.bottom + 8, transform: "translateX(-50%)" }),
        }}
      >
        {linkMode ? (
          <div className={styles.bubbleLink}>
            <input
              ref={inputRef}
              className={`${styles.bubbleInput} ${invalid ? styles.bubbleInvalid : ""}`}
              type="text"
              inputMode="url"
              placeholder="https://"
              aria-label={t("adminNews.toolbar.linkUrl")}
              aria-invalid={invalid}
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setInvalid(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  closeLink();
                }
              }}
            />
            <button type="button" className={styles.bubbleApply} onClick={applyLink} disabled={!url.trim()}>
              {t("adminNews.toolbar.linkApply")}
            </button>
            {active.link && (
              <button
                type="button"
                className={styles.bubbleBtn}
                aria-label={t("adminNews.toolbar.linkRemove")}
                title={t("adminNews.toolbar.linkRemove")}
                onClick={removeLink}
              >
                <LuUnlink aria-hidden />
              </button>
            )}
          </div>
        ) : (
          <>
            {btn(t("adminNews.toolbar.bold"), active.bold, () => editor.chain().focus().toggleBold().run(), <LuBold aria-hidden />)}
            {btn(t("adminNews.toolbar.italic"), active.italic, () => editor.chain().focus().toggleItalic().run(), <LuItalic aria-hidden />)}
            {btn(t("adminNews.toolbar.strike"), active.strike, () => editor.chain().focus().toggleStrike().run(), <LuStrikethrough aria-hidden />)}
            {btn(t("adminNews.toolbar.code"), active.code, () => editor.chain().focus().toggleCode().run(), <LuCode aria-hidden />)}
            <span className={styles.bubbleSep} aria-hidden />
            {btn(t("adminNews.toolbar.link"), active.link, openLink, <LuLink aria-hidden />)}
            <span className={styles.bubbleSep} aria-hidden />
            {btn(t("adminNews.toolbar.heading2"), active.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <LuHeading2 aria-hidden />)}
            {btn(t("adminNews.toolbar.heading3"), active.h3, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <LuHeading3 aria-hidden />)}
          </>
        )}
      </div>
    </Portal>
  );
}

/* ───────────────────────── "+" on empty lines ───────────────────────── */

export function PlusButton({ editor }: Props) {
  const t = useT();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const compute = useCallback(() => {
    const { selection } = editor.state;
    const { $from } = selection;
    const empty =
      editor.isFocused &&
      selection.empty &&
      $from.parent.type.name === "paragraph" &&
      $from.parent.content.size === 0 &&
      $from.depth === 1;

    if (!empty) return setPos(null);

    const c = coords(editor, $from.pos);
    const box = editor.view.dom.getBoundingClientRect();
    // Not enough gutter on phones; the "/" shortcut still works there.
    if (!c || box.left < 44) return setPos(null);
    setPos({ x: box.left - 34, y: (c.top + c.bottom) / 2 - 13 });
  }, [editor]);

  useEffect(() => {
    editor.on("transaction", compute);
    editor.on("focus", compute);
    editor.on("blur", compute);
    return () => {
      editor.off("transaction", compute);
      editor.off("focus", compute);
      editor.off("blur", compute);
    };
  }, [editor, compute]);

  useReposition(Boolean(pos), compute);

  if (!pos) return null;

  return (
    <Portal>
      <button
        type="button"
        className={styles.plus}
        style={{ left: pos.x, top: pos.y }}
        aria-label={t("adminNews.slash.add")}
        title={t("adminNews.slash.add")}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().insertContent("/").run()}
      >
        <LuPlus aria-hidden />
      </button>
    </Portal>
  );
}
