"use client";

import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
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
export const BUTTON_STYLE_LABEL_KEY: Record<ButtonCustom["style"], MessageKey> = {
  PRIMARY: "builder.buttons.styles.PRIMARY",
  SECONDARY: "builder.buttons.styles.SECONDARY",
  SUCCESS: "builder.buttons.styles.SUCCESS",
  DANGER: "builder.buttons.styles.DANGER",
  LINK: "builder.buttons.styles.LINK",
};

export function ButtonEditor({ value, onChange }: ButtonEditorProps) {
  const t = useT();
  const update = (patch: Partial<ButtonCustom>) => {
    const next = { ...value, ...patch };
    if (patch.style && patch.style !== "LINK") next.url = undefined;
    onChange(next);
  };

  return (
    <Column fillWidth gap="16">
      <Input
        id="btn-name"
        label={t("builder.buttons.nameLabel")}
        placeholder={t("builder.buttons.namePlaceholder")}
        value={value.name}
        onChange={(e) => update({ name: e.target.value })}
        characterCount
        maxLength={100}
      />
      <Input
        id="btn-label"
        label={t("builder.buttons.label")}
        placeholder={t("builder.buttons.labelPlaceholder")}
        value={value.label}
        onChange={(e) => update({ label: e.target.value })}
        characterCount
        maxLength={80}
      />
      <Column gap="8">
        <Text variant="label-default-s">{t("builder.buttons.style")}</Text>
        <SegmentedControl
          fillWidth
          value={value.style}
          onChange={(v) => update({ style: v as ButtonCustom["style"] })}
          buttons={STYLES.map((s) => ({ label: t(BUTTON_STYLE_LABEL_KEY[s]), value: s }))}
        />
      </Column>
      <Input
        id="btn-emoji"
        label={t("builder.shared.emoji")}
        placeholder="🎮"
        value={emojiToString(value.emoji)}
        onChange={(e) => update({ emoji: e.target.value || undefined })}
      />
      {value.style === "LINK" ? (
        <Input
          id="btn-url"
          label={t("builder.buttons.url")}
          placeholder="https://example.com"
          value={value.url ?? ""}
          onChange={(e) => update({ url: e.target.value })}
          error={!!value.url && !/^https?:\/\//i.test(value.url)}
          errorMessage={t("builder.buttons.urlError")}
        />
      ) : (
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("builder.shared.customId")} <InlineCode>{value.id}</InlineCode>{" "}
          {t("builder.buttons.customIdHint")}
        </Text>
      )}
      <Row gap="12" horizontal="start" vertical="center">
        <Switch
          label={t("builder.buttons.disabled")}
          description={t("builder.buttons.disabledHint")}
          checked={!!value.disabled}
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
