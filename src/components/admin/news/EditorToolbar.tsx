"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { Button, Column, IconButton, Input, Row, Text } from "@once-ui-system/core";
import {
  LuBold,
  LuCodeXml,
  LuImage,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuMinus,
  LuQuote,
  LuRedo2,
  LuSquareCode,
  LuStrikethrough,
  LuTable,
  LuUndo2,
  LuCode,
} from "react-icons/lu";
import { useT } from "@/i18n/client";
import { Eyebrow } from "@/components/admin/Eyebrow";
import { MenuSelect } from "@/components/admin/MenuSelect";
import { ImageUrlPreview } from "./ImageUrlPreview";
import styles from "./RichTextEditor.module.scss";

export type ToolbarPopover = "link" | "image" | null;
type Popover = ToolbarPopover;

interface ToolButtonProps {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolButton({ label, shortcut, active, disabled, onClick, children }: ToolButtonProps) {
  return (
    <IconButton
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="m"
      tooltip={shortcut ? `${label} (${shortcut})` : label}
      tooltipPosition="bottom"
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      // Keep the selection in the editor while a toolbar button is pressed.
      onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </IconButton>
  );
}

const HEADING_VALUES = ["paragraph", "1", "2", "3"] as const;

/** Accepts http(s), mailto, tel, in-site paths and anchors; bare domains get https://. */
export function normalizeLinkUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^(https?:\/\/|mailto:|tel:)\S+$/i.test(value)) return value;
  if (/^(\/|#)\S*$/.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value)) return `https://${value}`;
  return null;
}

export function EditorToolbar({
  editor,
  popover,
  setPopover,
}: {
  editor: Editor;
  popover: ToolbarPopover;
  setPopover: React.Dispatch<React.SetStateAction<ToolbarPopover>>;
}) {
  const t = useT();
  const [mod, setMod] = useState("Ctrl");
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.platform)) setMod("⌘");
  }, []);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      table: e.isActive("table"),
      heading: e.isActive("heading", { level: 1 })
        ? "1"
        : e.isActive("heading", { level: 2 })
          ? "2"
          : e.isActive("heading", { level: 3 })
            ? "3"
            : e.isActive("heading")
              ? "other"
              : "paragraph",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      canDeleteRow: e.can().deleteRow(),
      canDeleteColumn: e.can().deleteColumn(),
    }),
  });

  // Close an open popover on outside click or Escape.
  useEffect(() => {
    if (!popover) return;
    const onPointer = (event: PointerEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) setPopover(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPopover(null);
        editor.commands.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [popover, editor]);

  const setHeading = (value: string) => {
    const chain = editor.chain().focus();
    if (value === "paragraph") chain.setParagraph().run();
    else chain.setHeading({ level: Number(value) as 1 | 2 | 3 }).run();
  };

  const run = (command: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => {
    command(editor.chain().focus()).run();
  };

  const togglePopover = (next: Exclude<Popover, null>) =>
    setPopover((current) => (current === next ? null : next));

  const headingLabels: Record<(typeof HEADING_VALUES)[number], string> = {
    paragraph: t("adminNews.toolbar.paragraph"),
    "1": t("adminNews.toolbar.heading1"),
    "2": t("adminNews.toolbar.heading2"),
    "3": t("adminNews.toolbar.heading3"),
  };

  return (
    <Column
      ref={toolbarRef}
      fillWidth
      position="sticky"
      zIndex={3}
      gap="8"
      paddingX="12"
      paddingY="8"
      borderBottom="neutral-alpha-weak"
      background="surface"
      role="toolbar"
      aria-label={t("adminNews.toolbar.label")}
      style={{ top: "var(--news-sticky-top, 4rem)" }}
    >
      <Row fillWidth wrap vertical="center" gap="4" style={{ columnGap: "var(--static-space-8)" }}>
        <Row vertical="center" gap="2" className={styles.group}>
          <MenuSelect
            value={state.heading}
            minWidth={10}
            onSelect={setHeading}
            options={HEADING_VALUES.map((value) => ({ value, label: headingLabels[value] }))}
            trigger={
              <Button
                type="button"
                variant="secondary"
                size="m"
                suffixIcon="chevronDown"
                aria-label={t("adminNews.toolbar.textStyle")}
                style={{ minWidth: "7.5rem" }}
                onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
              >
                {state.heading === "other"
                  ? t("adminNews.toolbar.otherHeading")
                  : headingLabels[state.heading as (typeof HEADING_VALUES)[number]]}
              </Button>
            }
          />
        </Row>

        <Row vertical="center" gap="2" className={styles.group}>
          <ToolButton
            label={t("adminNews.toolbar.bold")}
            shortcut={`${mod}+B`}
            active={state.bold}
            onClick={() => run((c) => c.toggleBold())}
          >
            <LuBold />
          </ToolButton>
          <ToolButton
            label={t("adminNews.toolbar.italic")}
            shortcut={`${mod}+I`}
            active={state.italic}
            onClick={() => run((c) => c.toggleItalic())}
          >
            <LuItalic />
          </ToolButton>
          <ToolButton
            label={t("adminNews.toolbar.strike")}
            shortcut={`${mod}+Shift+S`}
            active={state.strike}
            onClick={() => run((c) => c.toggleStrike())}
          >
            <LuStrikethrough />
          </ToolButton>
          <ToolButton
            label={t("adminNews.toolbar.code")}
            shortcut={`${mod}+E`}
            active={state.code}
            onClick={() => run((c) => c.toggleCode())}
          >
            <LuCode />
          </ToolButton>
        </Row>

        <Row vertical="center" gap="2" className={styles.group}>
          <ToolButton
            label={t("adminNews.toolbar.link")}
            active={state.link || popover === "link"}
            onClick={() => togglePopover("link")}
          >
            <LuLink />
          </ToolButton>
          <ToolButton
            label={t("adminNews.toolbar.image")}
            active={popover === "image"}
            onClick={() => togglePopover("image")}
          >
            <LuImage />
          </ToolButton>
        </Row>

        <Row vertical="center" gap="2" className={styles.group}>
          <ToolButton
            label={t("adminNews.toolbar.bulletList")}
            shortcut={`${mod}+Shift+8`}
            active={state.bullet}
            onClick={() => run((c) => c.toggleBulletList())}
          >
            <LuList />
          </ToolButton>
          <ToolButton
            label={t("adminNews.toolbar.orderedList")}
            shortcut={`${mod}+Shift+7`}
            active={state.ordered}
            onClick={() => run((c) => c.toggleOrderedList())}
          >
            <LuListOrdered />
          </ToolButton>
          <ToolButton
            label={t("adminNews.toolbar.quote")}
            shortcut={`${mod}+Shift+B`}
            active={state.quote}
            onClick={() => run((c) => c.toggleBlockquote())}
          >
            <LuQuote />
          </ToolButton>
          <ToolButton
            label={t("adminNews.toolbar.codeBlock")}
            shortcut={`${mod}+Alt+C`}
            active={state.codeBlock}
            onClick={() => run((c) => c.toggleCodeBlock())}
          >
            <LuSquareCode />
          </ToolButton>
          <ToolButton
            label={t("adminNews.toolbar.rule")}
            onClick={() => run((c) => c.setHorizontalRule())}
          >
            <LuMinus />
          </ToolButton>
        </Row>

        <Row vertical="center" gap="2" className={styles.group}>
          <ToolButton
            label={t("adminNews.toolbar.table")}
            active={state.table}
            disabled={state.table}
            onClick={() =>
              run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))
            }
          >
            <LuTable />
          </ToolButton>
        </Row>

        <Row vertical="center" gap="2" className={`${styles.group} ${styles.groupEnd}`}>
          <ToolButton
            label={t("adminNews.toolbar.undo")}
            shortcut={`${mod}+Z`}
            disabled={!state.canUndo}
            onClick={() => run((c) => c.undo())}
          >
            <LuUndo2 />
          </ToolButton>
          <ToolButton
            label={t("adminNews.toolbar.redo")}
            shortcut={`${mod}+Shift+Z`}
            disabled={!state.canRedo}
            onClick={() => run((c) => c.redo())}
          >
            <LuRedo2 />
          </ToolButton>
        </Row>
      </Row>

      {state.table && (
        <Row
          fillWidth
          wrap
          vertical="center"
          gap="8"
          paddingTop="8"
          borderTop="neutral-alpha-weak"
          borderStyle="dashed"
          role="group"
          aria-label={t("adminNews.toolbar.tableTools")}
        >
          <Eyebrow style={{ marginRight: "var(--static-space-4)", fontWeight: 400 }}>
            {t("adminNews.toolbar.tableTools")}
          </Eyebrow>
          <TableButton onClick={() => run((c) => c.addRowAfter())}>
            {t("adminNews.toolbar.addRow")}
          </TableButton>
          <TableButton onClick={() => run((c) => c.addColumnAfter())}>
            {t("adminNews.toolbar.addColumn")}
          </TableButton>
          <TableButton disabled={!state.canDeleteRow} onClick={() => run((c) => c.deleteRow())}>
            {t("adminNews.toolbar.deleteRow")}
          </TableButton>
          <TableButton disabled={!state.canDeleteColumn} onClick={() => run((c) => c.deleteColumn())}>
            {t("adminNews.toolbar.deleteColumn")}
          </TableButton>
          <TableButton danger onClick={() => run((c) => c.deleteTable())}>
            {t("adminNews.toolbar.deleteTable")}
          </TableButton>
        </Row>
      )}

      {popover === "link" && (
        <LinkPopover editor={editor} onClose={() => setPopover(null)} />
      )}
      {popover === "image" && (
        <ImagePopover editor={editor} onClose={() => setPopover(null)} />
      )}
    </Column>
  );
}

function TableButton({
  danger,
  disabled,
  onClick,
  children,
}: {
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="s"
      rounded
      variant={danger ? "danger" : "secondary"}
      disabled={disabled}
      onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/** The floating panel under the toolbar that holds the link and image forms. */
function Popover({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Column
      gap="8"
      padding="12"
      radius="m"
      border="neutral-alpha-strong"
      background="page"
      shadow="l"
      zIndex={6}
      position="absolute"
      role="dialog"
      aria-label={label}
      style={{
        top: "calc(100% + 6px)",
        left: "var(--static-space-12)",
        width: "min(22rem, calc(100% - var(--static-space-24)))",
      }}
    >
      {children}
    </Column>
  );
}

function LinkPopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const t = useT();
  const existing = (editor.getAttributes("link").href as string | undefined) ?? "";
  const [url, setUrl] = useState(existing);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const apply = useCallback(() => {
    const href = normalizeLinkUrl(url);
    if (!href) {
      setInvalid(true);
      return;
    }

    const { empty } = editor.state.selection;
    if (empty && !editor.isActive("link")) {
      // Nothing selected: insert the address itself as the link text.
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: url.trim(), marks: [{ type: "link", attrs: { href } }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    onClose();
  }, [editor, onClose, url]);

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  };

  return (
    <Popover label={t("adminNews.toolbar.link")}>
      <Text as="label" variant="label-default-s" onBackground="neutral-weak" htmlFor="news-link-url">
        {t("adminNews.toolbar.linkUrl")}
      </Text>
      <Input
        id="news-link-url"
        ref={inputRef}
        size="s"
        type="text"
        inputMode="url"
        placeholder="https://"
        value={url}
        error={invalid}
        aria-invalid={invalid}
        onChange={(event) => {
          setUrl(event.target.value);
          setInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
        }}
      />
      {invalid && (
        <Text as="p" variant="label-default-s" onBackground="danger-strong">
          {t("adminNews.toolbar.linkInvalid")}
        </Text>
      )}
      <Row fillWidth vertical="center" gap="8">
        {existing && (
          <Button type="button" size="s" variant="danger" onClick={remove}>
            {t("adminNews.toolbar.linkRemove")}
          </Button>
        )}
        <Row flex={1} />
        <Button type="button" size="s" variant="secondary" onClick={onClose}>
          {t("common.actions.cancel")}
        </Button>
        <Button type="button" size="s" variant="primary" onClick={apply} disabled={!url.trim()}>
          {t("adminNews.toolbar.linkApply")}
        </Button>
      </Row>
    </Popover>
  );
}

function ImagePopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const t = useT();
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const valid = /^https?:\/\/\S+$/i.test(url.trim());

  const insert = () => {
    if (!valid) return;
    // A block image must not swallow a text selection; it goes in after it.
    const { to } = editor.state.selection;
    editor
      .chain()
      .focus()
      .setTextSelection(to)
      .setImage({ src: url.trim(), alt: alt.trim() })
      .run();
    onClose();
  };

  return (
    <Popover label={t("adminNews.toolbar.image")}>
      <Text as="label" variant="label-default-s" onBackground="neutral-weak" htmlFor="news-image-url">
        {t("adminNews.toolbar.imageUrl")}
      </Text>
      <Input
        id="news-image-url"
        ref={inputRef}
        size="s"
        type="text"
        inputMode="url"
        placeholder="https://"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            insert();
          }
        }}
      />
      <Text as="label" variant="label-default-s" onBackground="neutral-weak" htmlFor="news-image-alt">
        {t("adminNews.toolbar.imageAlt")}
      </Text>
      <Input
        id="news-image-alt"
        size="s"
        type="text"
        value={alt}
        onChange={(event) => setAlt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            insert();
          }
        }}
      />
      <ImageUrlPreview
        url={valid ? url.trim() : ""}
        onStatus={setStatus}
        hint={t("adminNews.toolbar.imageHint")}
        errorText={t("adminNews.toolbar.imageBroken")}
      />
      <Row fillWidth vertical="center" gap="8">
        <Row flex={1} />
        <Button type="button" size="s" variant="secondary" onClick={onClose}>
          {t("common.actions.cancel")}
        </Button>
        <Button
          type="button"
          size="s"
          variant="primary"
          onClick={insert}
          disabled={!valid || status === "loading"}
        >
          {t("adminNews.toolbar.imageInsert")}
        </Button>
      </Row>
    </Popover>
  );
}
