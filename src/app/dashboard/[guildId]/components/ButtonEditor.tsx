"use client";

import type { ButtonCustom } from "@/lib/db/types";
import {
  Column,
  InlineCode,
  Input,
  Row,
  SegmentedControl,
  Switch,
  Text,
} from "@once-ui-system/core";

export interface ButtonEditorProps {
  guildId: string;
  value: ButtonCustom;
  onChange: (next: ButtonCustom) => void;
}

const STYLES: ButtonCustom["style"][] = ["PRIMARY", "SECONDARY", "SUCCESS", "DANGER", "LINK"];
const STYLE_LABEL: Record<ButtonCustom["style"], string> = {
  PRIMARY: "Primary",
  SECONDARY: "Secondary",
  SUCCESS: "Success",
  DANGER: "Danger",
  LINK: "Link",
};

export function ButtonEditor({ value, onChange }: ButtonEditorProps) {
  const update = (patch: Partial<ButtonCustom>) => {
    const next = { ...value, ...patch };
    if (patch.style && patch.style !== "LINK") next.url = undefined;
    onChange(next);
  };

  return (
    <Column fillWidth gap="16">
      <Input
        id="btn-name"
        label="Name (internal)"
        placeholder="My button"
        value={value.name}
        onChange={(e) => update({ name: e.target.value })}
        characterCount
        maxLength={100}
      />
      <Input
        id="btn-label"
        label="Label"
        placeholder="Click me"
        value={value.label}
        onChange={(e) => update({ label: e.target.value })}
        characterCount
        maxLength={80}
      />
      <Column gap="8">
        <Text variant="label-default-s">Style</Text>
        <SegmentedControl
          fillWidth
          selected={value.style}
          onToggle={(v) => update({ style: v as ButtonCustom["style"] })}
          buttons={STYLES.map((s) => ({ label: STYLE_LABEL[s], value: s }))}
        />
      </Column>
      <Input
        id="btn-emoji"
        label="Emoji (unicode or <name:id>)"
        placeholder="🎮"
        value={emojiToString(value.emoji)}
        onChange={(e) => update({ emoji: e.target.value || undefined })}
      />
      {value.style === "LINK" ? (
        <Input
          id="btn-url"
          label="URL"
          placeholder="https://example.com"
          value={value.url ?? ""}
          onChange={(e) => update({ url: e.target.value })}
          error={!!value.url && !/^https?:\/\//i.test(value.url)}
          errorMessage="Must be an http(s) URL"
        />
      ) : (
        <Text variant="body-default-s" onBackground="neutral-weak">
          Custom id: <InlineCode>{value.id}</InlineCode> — the bot matches this id when a user
          clicks.
        </Text>
      )}
      <Row gap="12" horizontal="start" vertical="center">
        <Switch
          label="Disabled"
          description="Render the button as disabled"
          isChecked={!!value.disabled}
          onToggle={() => update({ disabled: !value.disabled })}
        />
      </Row>
    </Column>
  );
}

function emojiToString(emoji: ButtonCustom["emoji"]): string {
  if (!emoji) return "";
  if (typeof emoji === "string") return emoji;
  return emoji.id ? `<:${emoji.name || "emoji"}:${emoji.id}>` : emoji.name || "";
}
