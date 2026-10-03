"use client";

import { useT } from "@/i18n/client";
import { type PickedEmoji, emojiToText, parseEmojiText } from "@/lib/discord/emojis-api";
import { IconButton, Input } from "@once-ui-system/core";
import type { ReactNode } from "react";
import { LuX } from "react-icons/lu";
import { EmojiGlyph } from "./EmojiPicker";
import styles from "./EmojiPicker.module.scss";
import { EmojiPickerIconButton } from "./EmojiPickerDropdown";

/** Puts `text` into the text field `id` where its caret is and reports the new value. */
export function insertAtCaret(id: string, current: string, text: string, onValue: (value: string) => void) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  const start = el?.selectionStart ?? current.length;
  const end = el?.selectionEnd ?? start;
  const next = current.slice(0, start) + text + current.slice(end);
  const max = el && el.maxLength > 0 ? el.maxLength : null;
  if (max !== null && next.length > max) return; // would be cut off by the field anyway

  onValue(next);
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus({ preventScroll: true });
    const caret = start + text.length;
    el.setSelectionRange(caret, caret);
  });
}

/**
 * Wraps a text field (`Input` or `Textarea` carrying the same `id`) with a small emoji button
 * that inserts the picked emoji at the caret: standard ones as the character, server ones as
 * `<:name:id>`.
 */
export function EmojiField({
  id,
  value,
  onValueChange,
  children,
  multiline = false,
  guildId,
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  /** Button sits in the top-right corner (textarea) instead of the vertical middle. */
  multiline?: boolean;
  guildId?: string;
}) {
  const picker = (
    <EmojiPickerIconButton
      guildId={guildId}
      onSelect={(emoji) => insertAtCaret(id, value, emojiToText(emoji), onValueChange)}
    />
  );

  // A textarea has room in its corner; a one-line input keeps its character count on the right,
  // so the button sits beside it instead of on top of it.
  if (multiline) {
    return (
      <div className={styles.insertWrap}>
        {children}
        <div className={styles.insertButton}>{picker}</div>
      </div>
    );
  }

  return (
    <div className={styles.insertRow}>
      <div className={styles.insertRowField}>{children}</div>
      <div className={styles.insertRowButton}>{picker}</div>
    </div>
  );
}

/**
 * A field that stores exactly one emoji (buttons, select options): preview, editable text,
 * picker and a clear button. Accepts a standard emoji, `<:name:id>` or `<a:name:id>`.
 */
export function EmojiValueField({
  id,
  label,
  value,
  onChange,
  guildId,
  description,
}: {
  id: string;
  label: string;
  value: unknown;
  /** `undefined` when the field was emptied. */
  onChange: (text: string | undefined) => void;
  guildId?: string;
  description?: string;
}) {
  const t = useT();
  const text = typeof value === "string" ? value : textOf(value);
  const parsed = parseEmojiText(value);

  return (
    <div className={styles.valueField}>
      <div className={styles.valuePreview} aria-hidden>
        {parsed ? <EmojiGlyph value={parsed} size={30} /> : <span style={{ fontSize: 12 }}>—</span>}
      </div>
      <div className={styles.valueInput}>
        <Input
          id={id}
          label={label}
          value={text}
          onChange={(e) => onChange(e.target.value || undefined)}
          description={description}
        />
      </div>
      <div className={styles.valueActions}>
        <EmojiPickerIconButton guildId={guildId} onSelect={(emoji: PickedEmoji) => onChange(emojiToText(emoji))} />
        {text && (
          <IconButton
            variant="tertiary"
            size="m"
            type="button"
            tooltip={t("common.emoji.clear")}
            aria-label={t("common.emoji.clear")}
            onClick={() => onChange(undefined)}
          >
            <LuX size={16} />
          </IconButton>
        )}
      </div>
    </div>
  );
}

function textOf(value: unknown): string {
  const parsed = parseEmojiText(value);
  return parsed ? emojiToText(parsed) : "";
}
