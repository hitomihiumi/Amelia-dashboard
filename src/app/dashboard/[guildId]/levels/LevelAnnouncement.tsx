"use client";

import { PreviewPane, Workspace } from "@/app/dashboard/[guildId]/components/Workspace";
import {
  BasicEmbedEditor,
  hasBasicEmbed,
  toPreviewEmbed,
} from "@/components/dashboard/BasicEmbedEditor";
import { ChannelSelect } from "@/components/dashboard/discord/ChannelSelect";
import { DiscordPreview } from "@/components/dashboard/discord/preview/DiscordPreview";
import { TextTools } from "@/components/dashboard/text/TextTools";
import { CardPreview } from "@/components/profile/cards/CardPreview";
import {
  DiscordPreviewProvider,
  useDiscordPreviewOptional,
} from "@/contexts/DiscordPreviewContext";
import { useT } from "@/i18n/client";
import type { Levels } from "@/lib/db/types";
import { PREVIEW_USER_AVATAR } from "@/lib/discord/preview-tags";
import { LEVEL_MESSAGE_LIMITS, normalizeLevelMessage } from "@/lib/levels/message";
import { defaultColors } from "@/lib/profile/appearance";
import {
  Column,
  Feedback,
  Line,
  NumberInput,
  Row,
  Switch,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { type ReactNode, useMemo, useState } from "react";

type LevelMessage = Levels["message"];

const CARD_UNITS = { day: "d", hour: "h", minute: "m", second: "s" };
const CARD_IDENTITY = {
  avatar: PREVIEW_USER_AVATAR,
  username: "preview_user",
  globalName: "User",
};
const CARD_COLORS = defaultColors("level_up");

export interface LevelAnnouncementProps {
  guildId: string;
  value: LevelMessage;
  onChange: (next: LevelMessage) => void;
  channelOptions: { label: ReactNode; value: string }[];
  /** A role given for some level, so the preview can show `{reward.role}`. */
  rewardRoleId?: string;
}

function Heading({ title, hint }: { title: string; hint?: string }) {
  return (
    <Column gap="4" fillWidth>
      <Text variant="label-strong-m">{title}</Text>
      {hint ? (
        <Text variant="body-default-s" onBackground="neutral-weak">
          {hint}
        </Text>
      ) : null}
    </Column>
  );
}

/**
 * The editor of the level-up announcement: a text, an embed and the card, with the placeholder
 * tools on every field and a live preview of the message the bot will post.
 */
export function LevelAnnouncement({
  guildId,
  value,
  onChange,
  channelOptions,
  rewardRoleId,
}: LevelAnnouncementProps) {
  const t = useT();
  const base = useDiscordPreviewOptional();
  const [previewLevel, setPreviewLevel] = useState(10);

  const content = useMemo(() => normalizeLevelMessage(value.content), [value.content]);
  const setContent = (patch: Partial<typeof content>) =>
    onChange({ ...value, content: { ...content, ...patch } });

  const hasEmbed = hasBasicEmbed(content.embed);
  const hasText = Boolean(content.text);

  const previewContext = useMemo(
    () => ({
      botName: base?.botName ?? "Amelia",
      botAvatarUrl: base?.botAvatarUrl ?? null,
      guildId: base?.guildId ?? guildId,
      guildName: base?.guildName ?? null,
      guildIconUrl: base?.guildIconUrl ?? null,
      level: {
        level: previewLevel,
        totalXp: previewLevel * 250,
        messages: previewLevel * 40,
        rewardRole: rewardRoleId ? `<@&${rewardRoleId}>` : "",
      },
    }),
    [base, guildId, previewLevel, rewardRoleId],
  );

  const card = content.card ? (
    <CardPreview
      kind="level_up"
      identity={CARD_IDENTITY}
      stats={{ level: previewLevel - 1, xp: 0, voice_time: 0 }}
      colors={CARD_COLORS}
      units={CARD_UNITS}
      levelUpTo={previewLevel}
      maxWidth={400}
    />
  ) : null;

  // The card is drawn inside the embed unless the embed has a picture of its own.
  const cardInEmbed = hasEmbed && !content.embed.image;

  return (
    <Workspace
      aside={
        <PreviewPane title={t("levelAnnounce.preview.title")}>
          <DiscordPreviewProvider value={previewContext}>
            <DiscordPreview
              message={{
                content: hasText
                  ? (content.text ?? "")
                  : hasEmbed
                    ? undefined
                    : t("levelAnnounce.defaultText"),
                embeds: hasEmbed ? [toPreviewEmbed(content.embed)] : [],
                embedImage: cardInEmbed ? card : undefined,
                attachment: cardInEmbed ? undefined : card,
              }}
            />
          </DiscordPreviewProvider>
          <Row fillWidth vertical="center" gap="12" wrap>
            <NumberInput
              id="level-preview-level"
              label={t("levelAnnounce.preview.level")}
              value={previewLevel}
              min={1}
              max={1000}
              onChange={(next) => setPreviewLevel(Math.max(1, Math.round(Number(next) || 1)))}
              style={{ minWidth: 200, maxWidth: 240 }}
            />
            {content.card ? (
              <Text
                variant="body-default-xs"
                onBackground="neutral-weak"
                style={{ flex: "1 1 180px" }}
              >
                {t("levelAnnounce.preview.cardNote")}
              </Text>
            ) : null}
          </Row>
        </PreviewPane>
      }
    >
      <Column fillWidth gap="16">
        {!value.enabled ? (
          <Feedback variant="warning" description={t("levelAnnounce.disabledNote")} />
        ) : null}

        <Heading title={t("levelAnnounce.text.title")} hint={t("levelAnnounce.text.hint")} />
        <TextTools
          id="level-text"
          multiline
          value={content.text ?? ""}
          onValueChange={(text) => setContent({ text: text || null })}
          placeholderSet="levelUp"
          scenario={false}
          guildId={guildId}
        >
          <Textarea
            id="level-text"
            label={t("levelAnnounce.text.label")}
            value={content.text ?? ""}
            onChange={(e) => setContent({ text: e.target.value || null })}
            maxLength={LEVEL_MESSAGE_LIMITS.text}
            lines={3}
            characterCount
            resize="vertical"
          />
        </TextTools>

        <Line />
        <Heading title={t("levelAnnounce.embed.title")} hint={t("levelAnnounce.embed.hint")} />
        <BasicEmbedEditor
          idPrefix="level-embed"
          value={content.embed}
          onChange={(embed) => setContent({ embed })}
          guildId={guildId}
          placeholderSet="levelUp"
        />

        <Line />
        <Heading title={t("levelAnnounce.card.title")} hint={t("levelAnnounce.card.hint")} />
        <Switch
          label={t("levelAnnounce.card.switch")}
          description={t("levelAnnounce.card.switchHint")}
          checked={content.card}
          onToggle={() => setContent({ card: !content.card })}
        />

        <Line />
        <Heading title={t("levelAnnounce.delivery.title")} />
        <ChannelSelect
          label={t("settings.levels.announcementChannel")}
          id="level-up-channel"
          options={[
            { label: t("levelAnnounce.delivery.sameChannel"), value: "" },
            ...channelOptions,
          ]}
          selectedChannel={value.channel || ""}
          setSelectedChannel={(val) => onChange({ ...value, channel: (val as string) || null })}
        />
        <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="4">
          {t("levelAnnounce.delivery.channelHint")}
        </Text>
        <Switch
          label={t("levelAnnounce.delivery.reply")}
          description={t("levelAnnounce.delivery.replyHint")}
          checked={content.reply}
          onToggle={() => setContent({ reply: !content.reply })}
        />
        <NumberInput
          id="msg-delete-delay"
          label={t("settings.levels.deleteDelay")}
          value={value.delete}
          min={0}
          max={LEVEL_MESSAGE_LIMITS.deleteMax}
          onChange={(next) => onChange({ ...value, delete: Number(next) })}
        />
      </Column>
    </Workspace>
  );
}
