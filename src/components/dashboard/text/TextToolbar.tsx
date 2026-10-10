"use client";

import { EmojiPickerDropdown } from "@/components/dashboard/discord/EmojiPickerDropdown";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages/types";
import { emojiToText } from "@/lib/discord/emojis-api";
import {
  cycleHeading,
  insertLink,
  insertText,
  toggleCodeBlock,
  toggleLinePrefix,
  wrapSelection,
} from "@/lib/layouts/markdown";
import { IconButton, Line, Row } from "@once-ui-system/core";
import type { ReactNode } from "react";
import {
  LuBold,
  LuCode,
  LuEyeOff,
  LuHeading,
  LuItalic,
  LuLink,
  LuList,
  LuQuote,
  LuSmile,
  LuSquareCode,
  LuStrikethrough,
  LuUnderline,
} from "react-icons/lu";
import type { ApplyEdit, EditFn } from "./applyEdit";
import { PlaceholderMenu } from "./PlaceholderMenu";

/** Keeps the caret in the field while a toolbar button is pressed. */
const keepFocus = (event: React.MouseEvent) => event.preventDefault();

function Separator() {
  return (
    <Line vert aria-hidden fillHeight={false} marginX="4" background="neutral-alpha-medium" style={{ height: 20 }} />
  );
}

/** Bold, italic, headings, lists, quotes, code, spoilers and links: Discord markdown for the selection. */
export function FormatButtons({ apply }: { apply: ApplyEdit }) {
  const t = useT();

  const tool = (labelKey: MessageKey, icon: ReactNode, edit: EditFn) => (
    <IconButton
      icon="text"
      type="button"
      variant="ghost"
      size="s"
      tooltip={t(labelKey)}
      aria-label={t(labelKey)}
      onMouseDown={keepFocus}
      onClick={() => apply(edit)}
    >
      {icon}
    </IconButton>
  );

  return (
    <>
      {tool("common.textTools.bold", <LuBold size={15} />, (v, s, e) =>
        wrapSelection(v, s, e, "**", t("common.textTools.sampleBold")),
      )}
      {tool("common.textTools.italic", <LuItalic size={15} />, (v, s, e) =>
        wrapSelection(v, s, e, "*", t("common.textTools.sampleItalic")),
      )}
      {tool("common.textTools.underline", <LuUnderline size={15} />, (v, s, e) =>
        wrapSelection(v, s, e, "__", t("common.textTools.sampleUnderline")),
      )}
      {tool("common.textTools.strike", <LuStrikethrough size={15} />, (v, s, e) =>
        wrapSelection(v, s, e, "~~", t("common.textTools.sampleStrike")),
      )}
      <Separator />
      {tool("common.textTools.heading", <LuHeading size={15} />, cycleHeading)}
      {tool("common.textTools.list", <LuList size={15} />, (v, s, e) => toggleLinePrefix(v, s, e, "- "))}
      {tool("common.textTools.quote", <LuQuote size={15} />, (v, s, e) => toggleLinePrefix(v, s, e, "> "))}
      <Separator />
      {tool("common.textTools.code", <LuCode size={15} />, (v, s, e) =>
        wrapSelection(v, s, e, "`", t("common.textTools.sampleCode")),
      )}
      {tool("common.textTools.codeBlock", <LuSquareCode size={15} />, (v, s, e) =>
        toggleCodeBlock(v, s, e, t("common.textTools.sampleCodeBlock")),
      )}
      {tool("common.textTools.spoiler", <LuEyeOff size={15} />, (v, s, e) =>
        wrapSelection(v, s, e, "||", t("common.textTools.sampleSpoiler")),
      )}
      {tool("common.textTools.link", <LuLink size={15} />, (v, s, e) =>
        insertLink(v, s, e, t("common.textTools.sampleLink")),
      )}
    </>
  );
}

export interface EmojiMenuProps {
  apply: ApplyEdit;
  guildId?: string;
  /** Offer only standard emojis, for text Discord does not render server emojis in. */
  unicodeOnly?: boolean;
  size?: "s" | "m";
}

/** A button that opens the emoji panel and inserts the pick at the caret. */
export function EmojiMenu({ apply, guildId, unicodeOnly, size = "s" }: EmojiMenuProps) {
  const t = useT();
  return (
    <EmojiPickerDropdown
      guildId={guildId}
      unicodeOnly={unicodeOnly}
      placement="bottom-start"
      onSelect={(emoji) => apply((v, s, e) => insertText(v, s, e, emojiToText(emoji)))}
      trigger={
        <IconButton
          icon="text"
          type="button"
          variant={size === "s" ? "ghost" : "tertiary"}
          size={size}
          tooltip={t("common.emoji.insert")}
          aria-label={t("common.emoji.insert")}
          onMouseDown={keepFocus}
        >
          <LuSmile size={size === "s" ? 15 : 18} />
        </IconButton>
      }
    />
  );
}

export interface TextToolbarProps {
  apply: ApplyEdit;
  /** `markdown` adds the formatting buttons. */
  format?: "markdown" | "none";
  placeholders?: boolean | "url";
  /** Offer the scenario placeholders. Off for messages that are posted outside a scenario. */
  scenario?: boolean;
  emoji?: boolean | "unicode";
  guildId?: string;
  /** Extra controls on the right, e.g. "remove this text". */
  actions?: ReactNode;
}

/** The bar above a multi-line field: formatting, placeholders and emoji. */
export function TextToolbar({
  apply,
  format = "markdown",
  placeholders = true,
  scenario = true,
  emoji = true,
  guildId,
  actions,
}: TextToolbarProps) {
  const t = useT();
  const hasInsert = placeholders || emoji;

  return (
    <Row
      role="toolbar"
      aria-label={t("common.textTools.toolbar")}
      fillWidth
      wrap
      vertical="center"
      gap="2"
      padding="2"
      border="neutral-medium"
      radius="m"
      background="neutral-alpha-weak"
    >
      {format === "markdown" ? <FormatButtons apply={apply} /> : null}
      {format === "markdown" && hasInsert ? <Separator /> : null}
      {placeholders ? (
        <PlaceholderMenu apply={apply} scenario={scenario} urlOnly={placeholders === "url"} />
      ) : null}
      {emoji ? <EmojiMenu apply={apply} guildId={guildId} unicodeOnly={emoji === "unicode"} /> : null}
      {actions ? (
        <Row gap="2" style={{ marginLeft: "auto" }}>
          {actions}
        </Row>
      ) : null}
    </Row>
  );
}
