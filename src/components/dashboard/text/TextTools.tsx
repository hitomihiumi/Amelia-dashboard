"use client";

import { Column, Flex, Row } from "@once-ui-system/core";
import type { ReactNode } from "react";
import { applyToField, type ApplyEdit } from "./applyEdit";
import { EmojiMenu, TextToolbar } from "./TextToolbar";
import { PlaceholderMenu } from "./PlaceholderMenu";

export interface TextToolsProps {
  /** The id of the `Input` or `Textarea` passed as `children`. */
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  /** A textarea: the tools sit in a bar above it instead of beside it. */
  multiline?: boolean;
  /** Discord markdown buttons, for fields that render markdown. */
  format?: "markdown" | "none";
  /** `url` offers only the placeholders that work as a link or an id. */
  placeholders?: boolean | "url";
  /** Offer the scenario placeholders. Off for messages that are posted outside a scenario. */
  scenario?: boolean;
  /** `unicode` offers only standard emojis, for text Discord does not render server emojis in. */
  emoji?: boolean | "unicode";
  guildId?: string;
}

/**
 * Wraps a text field with the tools that fit it: placeholders, emoji and, for fields that render
 * markdown, the formatting buttons. Every tool edits the field at its caret or selection.
 */
export function TextTools({
  id,
  value,
  onValueChange,
  children,
  multiline = false,
  format = multiline ? "markdown" : "none",
  placeholders = true,
  scenario = true,
  emoji = true,
  guildId,
}: TextToolsProps) {
  const apply: ApplyEdit = (edit) => applyToField(id, value, onValueChange, edit);

  if (!placeholders && !emoji && format === "none") return <>{children}</>;

  if (multiline) {
    return (
      <Column fillWidth minWidth={0} gap="4">
        <TextToolbar
          apply={apply}
          format={format}
          placeholders={placeholders}
          scenario={scenario}
          emoji={emoji}
          guildId={guildId}
        />
        {children}
      </Column>
    );
  }

  // A one-line input keeps its character count on the right, so the tools sit beside it.
  return (
    <Row fillWidth minWidth={0} gap="4" vertical="start">
      <Column flex="1" minWidth={0}>
        {children}
      </Column>
      {/* The field is 56px tall, the buttons 32px. */}
      <Flex marginTop="8" gap="2" style={{ flexShrink: 0 }}>
        {placeholders ? (
          <PlaceholderMenu apply={apply} scenario={scenario} urlOnly={placeholders === "url"} size="m" />
        ) : null}
        {emoji ? <EmojiMenu apply={apply} guildId={guildId} unicodeOnly={emoji === "unicode"} size="m" /> : null}
      </Flex>
    </Row>
  );
}
