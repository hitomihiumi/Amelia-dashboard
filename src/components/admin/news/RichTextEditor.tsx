"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Column } from "@once-ui-system/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { useT } from "@/i18n/client";
import { BubbleToolbar, PlusButton, SlashMenu } from "./EditorOverlays";
import { EditorToolbar, type ToolbarPopover } from "./EditorToolbar";
import { IMAGE_URL } from "./slashItems";
import styles from "./RichTextEditor.module.scss";

export interface RichTextEditorHandle {
  /** The document right now, serialised; never behind the debounce. */
  getMarkdown: () => string;
  /** Pushes a pending edit to `onChange` immediately. */
  flush: () => void;
}

export interface RichTextEditorProps {
  /** Markdown the editor starts with. Later changes are ignored; remount with a new `key` instead. */
  initialMarkdown: string;
  /** Debounced: called with the serialised Markdown shortly after the author stops typing. */
  onChange: (markdown: string) => void;
  /** Cheap, synchronous signal that the document changed and a flush is pending. */
  onActivity?: () => void;
  placeholder?: string;
  /** Rendered between the toolbar and the body: cover, tag, title and summary. */
  header?: React.ReactNode;
}

const DEBOUNCE_MS = 150;

/**
 * Tiptap WYSIWYG editor that reads and writes Markdown, the format `NewsPost.content` is
 * stored in. It is only mounted while the Visual tab is open, so its document is always
 * rebuilt from the Markdown source of truth when the author comes back to it. The document
 * lives in Tiptap; only a debounced Markdown copy travels up to the page.
 */
export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ initialMarkdown, onChange, onActivity, placeholder, header }, ref) {
    const t = useT();
    const [popover, setPopover] = useState<ToolbarPopover>(null);
    const onChangeRef = useRef(onChange);
    const onActivityRef = useRef(onActivity);
    const timer = useRef<number | null>(null);
    const dirty = useRef(false);
    const slashKeys = useRef<(event: KeyboardEvent) => boolean>(() => false);

    useEffect(() => {
      onChangeRef.current = onChange;
      onActivityRef.current = onActivity;
    });

    const labels = useRef({ main: "", slash: "" });
    labels.current = { main: placeholder ?? "", slash: t("adminNews.visual.slashHint") };

    const extensions = useMemo(
      () => [
        StarterKit.configure({
          // The public renderer has no underline, so it would be lost when the post is published.
          underline: false,
          link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
        }),
        Markdown,
        Image.configure({ inline: false }),
        TableKit.configure({ table: { resizable: false } }),
        Placeholder.configure({
          placeholder: ({ editor: instance }) =>
            instance.isEmpty ? labels.current.main : labels.current.slash,
        }),
      ],
      [],
    );

    const editor = useEditor({
      // Rendering on the server would not match the client and Tiptap needs the DOM anyway.
      immediatelyRender: false,
      // The toolbar and menus subscribe to what they need; the page must not re-render per keystroke.
      shouldRerenderOnTransaction: false,
      extensions,
      content: initialMarkdown,
      contentType: "markdown",
      editorProps: {
        attributes: {
          class: styles.prose,
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": t("adminNews.visual.ariaLabel"),
        },
        handleKeyDown: (_view, event) => slashKeys.current(event),
        // Pasting a bare image address inserts the image.
        handlePaste: (view, event) => {
          const text = event.clipboardData?.getData("text/plain").trim() ?? "";
          if (!IMAGE_URL.test(text)) return false;
          const node = view.state.schema.nodes.image?.create({ src: text });
          if (!node) return false;
          view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView());
          return true;
        },
        handleDrop: (view, event) => {
          const text = (
            event.dataTransfer?.getData("text/uri-list") ||
            event.dataTransfer?.getData("text/plain") ||
            ""
          ).trim();
          if (!IMAGE_URL.test(text)) return false;
          const node = view.state.schema.nodes.image?.create({ src: text });
          const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (!node || !at) return false;
          event.preventDefault();
          view.dispatch(view.state.tr.insert(at.pos, node));
          return true;
        },
      },
      onUpdate: ({ editor: instance }) => {
        dirty.current = true;
        onActivityRef.current?.();
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          timer.current = null;
          dirty.current = false;
          onChangeRef.current(instance.getMarkdown());
        }, DEBOUNCE_MS);
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        getMarkdown: () => editor?.getMarkdown() ?? initialMarkdown,
        flush: () => {
          if (!editor || !dirty.current) return;
          if (timer.current !== null) window.clearTimeout(timer.current);
          timer.current = null;
          dirty.current = false;
          onChangeRef.current(editor.getMarkdown());
        },
      }),
      [editor, initialMarkdown],
    );

    // Leaving the Visual tab must not lose the last keystrokes.
    useEffect(() => {
      return () => {
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = null;
        if (dirty.current && editor && !editor.isDestroyed) {
          dirty.current = false;
          onChangeRef.current(editor.getMarkdown());
        }
      };
    }, [editor]);

    return (
      <Column fillWidth horizontal="center">
        {editor && <EditorToolbar editor={editor} popover={popover} setPopover={setPopover} />}
        {header}
        <Column
          fillWidth
          maxWidth="s"
          paddingX="24"
          paddingBottom="40"
          s={{ paddingX: "16", paddingBottom: "24" }}
        >
          <EditorContent editor={editor} className={styles.content} />
        </Column>
        {editor && (
          <>
            <SlashMenu editor={editor} keyHandler={slashKeys} onImage={() => setPopover("image")} />
            <BubbleToolbar editor={editor} />
            <PlusButton editor={editor} />
          </>
        )}
      </Column>
    );
  },
);
