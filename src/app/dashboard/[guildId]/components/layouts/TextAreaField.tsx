"use client";

import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages/types";
import { VARIABLE_PLACEHOLDERS } from "@/lib/db/types";
import {
  cycleHeading,
  insertText,
  type TextEdit,
  toggleLinePrefix,
  wrapSelection,
} from "@/lib/layouts/markdown";
import { Column, DropdownWrapper, IconButton, Option, Row, Text, Textarea } from "@once-ui-system/core";
import { type ReactNode, useRef, useState } from "react";
import {
  LuBold,
  LuBraces,
  LuCode,
  LuEyeOff,
  LuHeading,
  LuItalic,
  LuList,
  LuQuote,
  LuStrikethrough,
  LuUnderline,
} from "react-icons/lu";
import styles from "./LayoutEditor.module.scss";

const PLACEHOLDER_LABELS: Record<keyof typeof VARIABLE_PLACEHOLDERS, MessageKey> = {
  USER_ID: "layouts.placeholders.USER_ID",
  USER_NAME: "layouts.placeholders.USER_NAME",
  USER_DISPLAY_NAME: "layouts.placeholders.USER_DISPLAY_NAME",
  USER_MENTION: "layouts.placeholders.USER_MENTION",
  USER_AVATAR: "layouts.placeholders.USER_AVATAR",
  CHANNEL_ID: "layouts.placeholders.CHANNEL_ID",
  CHANNEL_NAME: "layouts.placeholders.CHANNEL_NAME",
  CHANNEL_MENTION: "layouts.placeholders.CHANNEL_MENTION",
  GUILD_ID: "layouts.placeholders.GUILD_ID",
  GUILD_NAME: "layouts.placeholders.GUILD_NAME",
  GUILD_ICON: "layouts.placeholders.GUILD_ICON",
  DATE: "layouts.placeholders.DATE",
  TIME: "layouts.placeholders.TIME",
  TIMESTAMP: "layouts.placeholders.TIMESTAMP",
};

export interface TextAreaFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  invalid?: boolean;
  /** Extra controls on the right of the toolbar, e.g. "remove this text". */
  actions?: ReactNode;
}

/** A markdown textarea with a formatting toolbar, a placeholder menu and its own character count. */
export function TextAreaField({
  id,
  value,
  onChange,
  label,
  placeholder,
  invalid,
  actions,
}: TextAreaFieldProps) {
  const t = useT();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [placeholdersOpen, setPlaceholdersOpen] = useState(false);

  const apply = (edit: (value: string, start: number, end: number) => TextEdit) => {
    const el = ref.current;
    if (!el) return;
    const next = edit(el.value, el.selectionStart, el.selectionEnd);
    onChange(next.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  };

  const keepFocus = (event: React.MouseEvent) => event.preventDefault();

  const tool = (
    labelKey: MessageKey,
    icon: ReactNode,
    edit: (value: string, start: number, end: number) => TextEdit,
  ) => (
    <IconButton
      icon="text"
      variant="ghost"
      size="s"
      tooltip={t(labelKey)}
      onMouseDown={keepFocus}
      onClick={() => apply(edit)}
    >
      {icon}
    </IconButton>
  );

  return (
    <Column fillWidth gap="4">
      <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
        <Text variant="label-default-s" onBackground="neutral-medium">
          {label}
        </Text>
        <Text variant="label-default-xs" onBackground="neutral-weak">
          {t("layouts.text.chars", { count: value.length })}
        </Text>
      </Row>

      <div className={styles.toolbar} role="toolbar" aria-label={t("layouts.text.toolbar")}>
        {tool("layouts.text.bold", <LuBold size={15} />, (v, s, e) =>
          wrapSelection(v, s, e, "**", t("layouts.text.sampleBold")),
        )}
        {tool("layouts.text.italic", <LuItalic size={15} />, (v, s, e) =>
          wrapSelection(v, s, e, "*", t("layouts.text.sampleItalic")),
        )}
        {tool("layouts.text.underline", <LuUnderline size={15} />, (v, s, e) =>
          wrapSelection(v, s, e, "__", t("layouts.text.sampleUnderline")),
        )}
        {tool("layouts.text.strike", <LuStrikethrough size={15} />, (v, s, e) =>
          wrapSelection(v, s, e, "~~", t("layouts.text.sampleStrike")),
        )}
        <span className={styles.toolbarSep} aria-hidden />
        {tool("layouts.text.heading", <LuHeading size={15} />, cycleHeading)}
        {tool("layouts.text.list", <LuList size={15} />, (v, s, e) => toggleLinePrefix(v, s, e, "- "))}
        {tool("layouts.text.quote", <LuQuote size={15} />, (v, s, e) => toggleLinePrefix(v, s, e, "> "))}
        <span className={styles.toolbarSep} aria-hidden />
        {tool("layouts.text.code", <LuCode size={15} />, (v, s, e) =>
          wrapSelection(v, s, e, "`", t("layouts.text.sampleCode")),
        )}
        {tool("layouts.text.spoiler", <LuEyeOff size={15} />, (v, s, e) =>
          wrapSelection(v, s, e, "||", t("layouts.text.sampleSpoiler")),
        )}
        <span className={styles.toolbarSep} aria-hidden />
        <DropdownWrapper
          open={placeholdersOpen}
          onOpenChange={setPlaceholdersOpen}
          placement="bottom-start"
          trigger={
            <IconButton
              icon="text"
              variant="ghost"
              size="s"
              tooltip={t("layouts.text.placeholders")}
              onMouseDown={keepFocus}
            >
              <LuBraces size={15} />
            </IconButton>
          }
          dropdown={
            <Column gap="2" padding="4" minWidth={16} maxHeight={22} style={{ overflowY: "auto" }}>
              <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="8" paddingY="4">
                {t("layouts.text.placeholderHint", { token: VARIABLE_PLACEHOLDERS.USER_NAME })}
              </Text>
              {(Object.keys(VARIABLE_PLACEHOLDERS) as Array<keyof typeof VARIABLE_PLACEHOLDERS>).map(
                (key) => (
                  <Option
                    key={key}
                    value={key}
                    label={t(PLACEHOLDER_LABELS[key])}
                    description={VARIABLE_PLACEHOLDERS[key]}
                    onClick={() => {
                      setPlaceholdersOpen(false);
                      apply((v, s, e) => insertText(v, s, e, VARIABLE_PLACEHOLDERS[key]));
                    }}
                  />
                ),
              )}
            </Column>
          }
        />
        {actions ? (
          <Row gap="2" style={{ marginLeft: "auto" }}>
            {actions}
          </Row>
        ) : null}
      </div>

      <Textarea
        ref={ref}
        id={id}
        label={placeholder ? undefined : label}
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={invalid}
      />
    </Column>
  );
}
