"use client";

import { ColorInput } from "@/components/dashboard/ColorInput";
import { TextTools } from "@/components/dashboard/text/TextTools";
import { useT } from "@/i18n/client";
import type { EmbedCustom } from "@/lib/db/types";
import { resolveDiscordColor } from "@/lib/discord/discord-style";
import type { PlaceholderSet } from "@/lib/discord/placeholders";
import { Column, Input, Textarea } from "@once-ui-system/core";

/** The six parts of an embed the bot builds for the announcements and panels it posts itself. */
export interface BasicEmbed {
  title: string | null;
  description: string | null;
  color: string | null;
  thumbnail: string | null;
  image: string | null;
  footer: string | null;
}

export const EMPTY_BASIC_EMBED: BasicEmbed = {
  title: null,
  description: null,
  color: null,
  thumbnail: null,
  image: null,
  footer: null,
};

export const EMBED_COLOR_PRESETS = [
  "#5865f2",
  "#248046",
  "#da373c",
  "#f1c40f",
  "#11806a",
  "#e91e63",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#71368a",
  "#1e1f22",
  "#ffffff",
];

/** Whether the embed has anything the bot would post. */
export function hasBasicEmbed(embed: BasicEmbed): boolean {
  return Boolean(
    embed.title || embed.description || embed.footer || embed.thumbnail || embed.image,
  );
}

/** The embed in the shape the Discord preview draws. */
export function toPreviewEmbed(embed: BasicEmbed): EmbedCustom {
  return {
    id: "preview",
    name: "preview",
    title: embed.title || undefined,
    description: embed.description || undefined,
    color: (embed.color || undefined) as EmbedCustom["color"],
    thumbnail: embed.thumbnail || undefined,
    image: embed.image || undefined,
    footer: embed.footer ? { text: embed.footer } : undefined,
  };
}

export interface BasicEmbedEditorProps {
  /** Prefix of the field ids; two editors on one page need different ones. */
  idPrefix: string;
  value: BasicEmbed;
  onChange: (next: BasicEmbed) => void;
  guildId: string;
  /** Which placeholders the text tools offer. */
  placeholderSet?: PlaceholderSet;
  /** Limit of the description; the bot cuts anything longer. */
  descriptionMax?: number;
  /** Offer the placeholder menu. Off where the bot posts the text as it is stored. */
  placeholders?: boolean;
  /** A picture the bot adds itself (the level-up card) replaces the image field's job. */
  hideImage?: boolean;
}

/**
 * Edits an embed: title, description, colour, thumbnail, picture and footer, each with the
 * placeholder and emoji tools. Used where the bot builds the embed itself (level-up
 * announcements, the teammate search panel).
 */
export function BasicEmbedEditor({
  idPrefix,
  value,
  onChange,
  guildId,
  placeholderSet = "default",
  descriptionMax = 4096,
  placeholders = true,
  hideImage = false,
}: BasicEmbedEditorProps) {
  const t = useT();
  const set = (patch: Partial<BasicEmbed>) => onChange({ ...value, ...patch });
  const text = (v: string) => v || null;

  return (
    <Column fillWidth gap="8">
      <TextTools
        id={`${idPrefix}-title`}
        value={value.title ?? ""}
        onValueChange={(title) => set({ title: text(title) })}
        placeholders={placeholders}
        placeholderSet={placeholderSet}
        scenario={false}
        guildId={guildId}
      >
        <Input
          id={`${idPrefix}-title`}
          label={t("builder.embeds.title")}
          value={value.title ?? ""}
          onChange={(e) => set({ title: text(e.target.value) })}
          maxLength={256}
          characterCount
        />
      </TextTools>

      <TextTools
        id={`${idPrefix}-description`}
        value={value.description ?? ""}
        onValueChange={(description) => set({ description: text(description) })}
        placeholders={placeholders}
        placeholderSet={placeholderSet}
        scenario={false}
        guildId={guildId}
        multiline
      >
        <Textarea
          id={`${idPrefix}-description`}
          label={t("builder.embeds.description")}
          value={value.description ?? ""}
          onChange={(e) => set({ description: text(e.target.value) })}
          maxLength={descriptionMax}
          lines={4}
          characterCount
          resize="vertical"
        />
      </TextTools>

      <ColorInput
        id={`${idPrefix}-color`}
        label={t("builder.embeds.color")}
        value={value.color ? resolveDiscordColor(value.color) : ""}
        onChange={(e) => set({ color: text(e.target.value) })}
        presets={EMBED_COLOR_PRESETS}
      />

      <TextTools
        id={`${idPrefix}-thumbnail`}
        placeholders={placeholders ? "url" : false}
        placeholderSet={placeholderSet}
        scenario={false}
        emoji={false}
        value={value.thumbnail ?? ""}
        onValueChange={(thumbnail) => set({ thumbnail: text(thumbnail) })}
      >
        <Input
          id={`${idPrefix}-thumbnail`}
          label={t("builder.embeds.thumbnail")}
          value={value.thumbnail ?? ""}
          onChange={(e) => set({ thumbnail: text(e.target.value) })}
        />
      </TextTools>

      {hideImage ? null : (
        <TextTools
          id={`${idPrefix}-image`}
          placeholders={placeholders ? "url" : false}
          placeholderSet={placeholderSet}
          scenario={false}
          emoji={false}
          value={value.image ?? ""}
          onValueChange={(image) => set({ image: text(image) })}
        >
          <Input
            id={`${idPrefix}-image`}
            label={t("builder.embeds.image")}
            value={value.image ?? ""}
            onChange={(e) => set({ image: text(e.target.value) })}
          />
        </TextTools>
      )}

      <TextTools
        id={`${idPrefix}-footer`}
        emoji="unicode"
        placeholders={placeholders}
        placeholderSet={placeholderSet}
        scenario={false}
        value={value.footer ?? ""}
        onValueChange={(footer) => set({ footer: text(footer) })}
      >
        <Input
          id={`${idPrefix}-footer`}
          label={t("builder.embeds.footerText")}
          value={value.footer ?? ""}
          onChange={(e) => set({ footer: text(e.target.value) })}
          maxLength={2048}
        />
      </TextTools>
    </Column>
  );
}
