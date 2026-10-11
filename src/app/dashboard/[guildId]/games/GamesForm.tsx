"use client";

import { ModalEditor } from "@/app/dashboard/[guildId]/components/ModalEditor";
import { PreviewPane, Workspace } from "@/app/dashboard/[guildId]/components/Workspace";
import { BasicEmbedEditor, toPreviewEmbed } from "@/components/dashboard/BasicEmbedEditor";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { DashIcon } from "@/components/dashboard/DashIcon";
import { Section } from "@/components/dashboard/Section";
import { ChannelPill } from "@/components/dashboard/discord/ChannelPill";
import { ChannelSelect } from "@/components/dashboard/discord/ChannelSelect";
import { EmojiGlyph } from "@/components/dashboard/discord/EmojiPicker";
import { EmojiValueField } from "@/components/dashboard/discord/EmojiField";
import { RolePill } from "@/components/dashboard/discord/RolePill";
import { RoleSelect } from "@/components/dashboard/discord/RoleSelect";
import { DiscordPreview } from "@/components/dashboard/discord/preview/DiscordPreview";
import { TextTools } from "@/components/dashboard/text/TextTools";
import { SectionGrid } from "@/components/layout/SectionGrid";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { useT } from "@/i18n/client";
import { generateID } from "@/lib/db/generateID";
import type { EmbedCustom, FindTeamGame, IModalField, ModalCustom } from "@/lib/db/types";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import type { DiscordRole } from "@/lib/discord/role-style";
import { FIND_TEAM_LIMITS, type FindTeamSettings } from "@/lib/games/findTeam";
import type { GuildActionState } from "@/types/dashboard";
import {
  Accordion,
  Button,
  Column,
  Feedback,
  Flex,
  IconButton,
  Input,
  RevealFx,
  Row,
  SegmentedControl,
  Switch,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sendGamesPanel, setupGamesChannels, updateGamesSettings } from "./actions";

type PreviewTab = "request" | "form";

const PREVIEW_USER = "123456789012345678";

/** Games store the emoji as text (`🎮` or `<:name:id>`); the type says it could be an object. */
const emojiText = (emoji: FindTeamGame["emoji"]): string =>
  typeof emoji === "string" ? emoji : "";

export interface GamesFormProps {
  guildId: string;
  defaultSettings: FindTeamSettings;
  textChannels: ChannelPickOption[];
  roles: DiscordRole[];
}

export function GamesForm({ guildId, defaultSettings, textChannels, roles }: GamesFormProps) {
  const t = useT();
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [settings, setSettings] = useState(defaultSettings);
  const [baseline, setBaseline] = useState(defaultSettings);
  const [openId, setOpenId] = useState<string | null>(defaultSettings.games[0]?.id ?? null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("request");
  const [working, setWorking] = useState<"setup" | "send" | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(baseline),
    [settings, baseline],
  );

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  useEffect(() => () => setIsDirty(false), [setIsDirty]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("settings", JSON.stringify(settings));

    const result: GuildActionState = await updateGamesSettings(guildId, fd);
    if (!result) {
      addToast({ variant: "danger", message: t("settings.shared.noResponse") });
      return;
    }
    if (result.ok) {
      setBaseline(settings);
      addToast({ variant: "success", message: t("settings.shared.saveSuccess") });
      router.refresh();
    } else {
      addToast({ variant: "danger", message: result.error ?? t("settings.shared.saveFailed") });
    }
  }, [guildId, settings, router, addToast, t]);

  const handleCancel = useCallback(() => setSettings(baseline), [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  const update = (patch: Partial<FindTeamSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  // ---------- channels ----------
  const channelOptions = useMemo(
    () => textChannels.map((c) => ({ label: <ChannelPill channel={c} />, value: c.id })),
    [textChannels],
  );
  const roleOptions = useMemo(
    () => [
      { label: t("games.game.noRole"), value: "" },
      ...roles.map((r) => ({
        label: <RolePill roleColor={r.color} label={r.name} />,
        value: r.id,
      })),
    ],
    [roles, t],
  );

  const setupChannels = async () => {
    setWorking("setup");
    const result = await setupGamesChannels(guildId);
    setWorking(null);
    if (!result?.ok || !result.channel || !result.sendChannel) {
      addToast({ variant: "danger", message: result?.error ?? t("games.errors.setupFailed") });
      return;
    }
    // The channels are already stored; unsaved edits stay unsaved.
    const channels = { channel: result.channel, send_channel: result.sendChannel };
    setSettings((prev) => ({ ...prev, ...channels }));
    setBaseline((prev) => ({ ...prev, ...channels }));
    addToast({ variant: "success", message: t("games.channels.setupDone") });
    router.refresh();
  };

  const sendPanel = async () => {
    setWorking("send");
    const result = await sendGamesPanel(guildId);
    setWorking(null);
    addToast(
      result?.ok
        ? { variant: "success", message: t("games.panel.sent") }
        : { variant: "danger", message: result?.error ?? t("games.errors.sendFailed") },
    );
  };

  // ---------- games ----------
  const setGames = (games: FindTeamGame[]) => update({ games });
  const updateGame = (id: string, patch: Partial<FindTeamGame>) =>
    setGames(settings.games.map((game) => (game.id === id ? { ...game, ...patch } : game)));

  const addGame = () => {
    if (settings.games.length >= FIND_TEAM_LIMITS.games) return;
    const name = t("games.game.newName", { n: settings.games.length + 1 });
    const game: FindTeamGame = {
      id: generateID(guildId, "game"),
      name,
      emoji: "🎮",
      role: null,
      modal: { title: name.slice(0, FIND_TEAM_LIMITS.modalTitle), fields: [] },
    };
    setGames([...settings.games, game]);
    setOpenId(game.id);
  };
  const duplicateGame = (id: string) => {
    const index = settings.games.findIndex((game) => game.id === id);
    if (index < 0 || settings.games.length >= FIND_TEAM_LIMITS.games) return;
    const source = settings.games[index];
    const copy: FindTeamGame = {
      ...source,
      id: generateID(guildId, "game"),
      name: source.name.slice(0, FIND_TEAM_LIMITS.gameName - 7) + " (copy)",
      modal: {
        ...source.modal,
        fields: source.modal.fields.map((field) => ({
          ...field,
          id: generateID(guildId, "field"),
        })),
      },
    };
    setGames([...settings.games.slice(0, index + 1), copy, ...settings.games.slice(index + 1)]);
    setOpenId(copy.id);
  };
  const removeGame = (id: string) => {
    setGames(settings.games.filter((game) => game.id !== id));
    if (openId === id) setOpenId(null);
  };
  const moveGame = (id: string, direction: number) => {
    const index = settings.games.findIndex((game) => game.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= settings.games.length) return;
    const next = [...settings.games];
    [next[index], next[target]] = [next[target], next[index]];
    setGames(next);
  };

  const previewGame =
    settings.games.find((game) => game.id === openId) ?? settings.games[0] ?? null;

  const panelEmbed = toPreviewEmbed(settings.embed);
  const hasPanelEmbed = Boolean(
    settings.embed.title ||
      settings.embed.description ||
      settings.embed.footer ||
      settings.embed.thumbnail ||
      settings.embed.image,
  );

  return (
    <SectionGrid>
      <SectionGrid.Full>
        <RevealFx translateY={-0.5} fillWidth>
          <Flex
            direction="column"
            padding="20"
            border="neutral-medium"
            radius="l"
            background="surface"
            fillWidth
          >
            <Row horizontal="between" vertical="center" gap="16">
              <Row vertical="center" gap="16" style={{ minWidth: 0 }}>
                <DashIcon name="gamepad" />
                <Column gap="4">
                  <Text variant="body-strong-l">{t("games.enable.title")}</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {t("games.enable.description")}
                  </Text>
                </Column>
              </Row>
              <Switch
                checked={settings.enabled}
                onToggle={() => update({ enabled: !settings.enabled })}
              />
            </Row>
          </Flex>
        </RevealFx>
      </SectionGrid.Full>

      <Section
        title={t("games.channels.title")}
        description={t("games.channels.description")}
        num={2}
        icon="send"
        span="full"
      >
        <Row fillWidth wrap gap="12" vertical="start">
          <Column flex="1" gap="4" minWidth={16} style={{ flexBasis: 240 }}>
            <ChannelSelect
              label={t("games.channels.panel")}
              id="games-panel-channel"
              options={channelOptions}
              selectedChannel={settings.channel ?? ""}
              setSelectedChannel={(value) => update({ channel: (value as string) || null })}
            />
            <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="4">
              {t("games.channels.panelHint")}
            </Text>
          </Column>
          <Column flex="1" gap="4" minWidth={16} style={{ flexBasis: 240 }}>
            <ChannelSelect
              label={t("games.channels.requests")}
              id="games-requests-channel"
              options={channelOptions}
              selectedChannel={settings.send_channel ?? ""}
              setSelectedChannel={(value) => update({ send_channel: (value as string) || null })}
              error={settings.enabled && !settings.send_channel}
            />
            <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="4">
              {t("games.channels.requestsHint")}
            </Text>
          </Column>
        </Row>
        <Row fillWidth vertical="center" gap="12" wrap>
          <Button
            variant="secondary"
            prefixIcon="plus"
            onClick={setupChannels}
            loading={working === "setup"}
            disabled={working !== null}
          >
            {t("games.channels.setup")}
          </Button>
          <Text variant="body-default-xs" onBackground="neutral-weak" style={{ flex: "1 1 220px" }}>
            {t("games.channels.setupHint")}
          </Text>
        </Row>
      </Section>

      <Section
        title={t("games.panel.title")}
        description={t("games.panel.description")}
        num={3}
        icon="send"
        span="full"
      >
        <Workspace
          aside={
            <PreviewPane title={t("games.panel.preview")}>
              <DiscordPreview
                message={{
                  embeds: hasPanelEmbed ? [panelEmbed] : [],
                  selectMenus: [
                    {
                      id: "panel",
                      name: "panel",
                      placeholder:
                        settings.select_placeholder || t("games.panel.defaultPlaceholder"),
                      disabled: settings.games.length === 0,
                      options:
                        settings.games.length > 0
                          ? settings.games.map((game) => ({
                              label: game.name,
                              value: game.id,
                              emoji: emojiText(game.emoji) || undefined,
                            }))
                          : [{ label: t("games.panel.noGames"), value: "none" }],
                    },
                  ],
                }}
              />
            </PreviewPane>
          }
        >
          <Column fillWidth gap="16">
            <BasicEmbedEditor
              idPrefix="games-panel"
              value={settings.embed}
              onChange={(embed) => update({ embed })}
              guildId={guildId}
              placeholders={false}
            />
            <TextTools
              id="games-select-placeholder"
              value={settings.select_placeholder ?? ""}
              onValueChange={(value) => update({ select_placeholder: value || null })}
              placeholders={false}
              emoji="unicode"
            >
              <Input
                id="games-select-placeholder"
                label={t("games.panel.placeholderLabel")}
                value={settings.select_placeholder ?? ""}
                onChange={(e) => update({ select_placeholder: e.target.value || null })}
                maxLength={FIND_TEAM_LIMITS.selectPlaceholder}
                characterCount
              />
            </TextTools>
            <Row fillWidth vertical="center" gap="12" wrap>
              <Button
                variant="secondary"
                prefixIcon="send"
                onClick={sendPanel}
                loading={working === "send"}
                disabled={working !== null || isDirty || !baseline.channel}
              >
                {t("games.panel.send")}
              </Button>
              <Text
                variant="body-default-xs"
                onBackground="neutral-weak"
                style={{ flex: "1 1 220px" }}
              >
                {isDirty || !baseline.channel
                  ? t("games.panel.sendNeedsSave")
                  : t("games.panel.sendHint")}
              </Text>
            </Row>
          </Column>
        </Workspace>
      </Section>

      <Section
        title={t("games.list.title")}
        description={t("games.list.description")}
        num={4}
        icon="gamepad"
        span="full"
      >
        <Workspace
          aside={
            <PreviewPane
              title={t("games.preview.title")}
              meta={
                previewGame ? (
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    {previewGame.name}
                  </Text>
                ) : null
              }
              toolbar={
                <SegmentedControl
                  fillWidth
                  value={previewTab}
                  onChange={(value) => setPreviewTab(value as PreviewTab)}
                  buttons={[
                    { label: t("games.preview.request"), value: "request" },
                    { label: t("games.preview.form"), value: "form" },
                  ]}
                />
              }
            >
              {previewGame ? (
                previewTab === "request" ? (
                  <RequestPreview game={previewGame} />
                ) : (
                  <FormPreview game={previewGame} />
                )
              ) : (
                <Text variant="body-default-s" onBackground="neutral-weak" align="center">
                  {t("games.preview.empty")}
                </Text>
              )}
            </PreviewPane>
          }
        >
          <Column fillWidth gap="12">
            <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
              <Text variant="label-default-s">
                {t("games.list.count", {
                  count: settings.games.length,
                  max: FIND_TEAM_LIMITS.games,
                })}
              </Text>
              <Button
                prefixIcon="plus"
                onClick={addGame}
                disabled={settings.games.length >= FIND_TEAM_LIMITS.games}
              >
                {t("games.list.add")}
              </Button>
            </Row>

            {settings.games.length === 0 ? (
              <Feedback variant="info" description={t("games.list.empty")} />
            ) : (
              settings.games.map((game, index) => (
                <Accordion
                  key={game.id}
                  fillWidth
                  open={openId === game.id}
                  onToggle={() => setOpenId(openId === game.id ? null : game.id)}
                  title={
                    <Row vertical="center" gap="12" minWidth={0}>
                      <EmojiGlyph value={emojiText(game.emoji)} size={22} />
                      <Text variant="body-strong-s" style={{ wordBreak: "break-word" }}>
                        {game.name || t("games.game.unnamed")}
                      </Text>
                      <Tag size="s">
                        {t("games.game.fieldsCount", { count: game.modal.fields.length })}
                      </Tag>
                    </Row>
                  }
                >
                  <GameEditor
                    game={game}
                    guildId={guildId}
                    roleOptions={roleOptions}
                    canMoveUp={index > 0}
                    canMoveDown={index < settings.games.length - 1}
                    canDuplicate={settings.games.length < FIND_TEAM_LIMITS.games}
                    onChange={(patch) => updateGame(game.id, patch)}
                    onMove={(direction) => moveGame(game.id, direction)}
                    onDuplicate={() => duplicateGame(game.id)}
                    onDelete={() => removeGame(game.id)}
                  />
                </Accordion>
              ))
            )}
          </Column>
        </Workspace>
      </Section>
    </SectionGrid>
  );
}

function GameEditor({
  game,
  guildId,
  roleOptions,
  canMoveUp,
  canMoveDown,
  canDuplicate,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  game: FindTeamGame;
  guildId: string;
  roleOptions: { label: React.ReactNode; value: string }[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDuplicate: boolean;
  onChange: (patch: Partial<FindTeamGame>) => void;
  onMove: (direction: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const modal: ModalCustom = {
    id: game.id,
    title: game.modal.title,
    fields: game.modal.fields,
  };

  return (
    <Column fillWidth gap="16" paddingTop="8">
      <Row gap="4" horizontal="end" vertical="center">
        <IconButton
          icon="chevronUp"
          variant="secondary"
          tooltip={t("builder.shared.moveUp")}
          disabled={!canMoveUp}
          onClick={() => onMove(-1)}
        />
        <IconButton
          icon="chevronDown"
          variant="secondary"
          tooltip={t("builder.shared.moveDown")}
          disabled={!canMoveDown}
          onClick={() => onMove(1)}
        />
        <IconButton
          icon="copy"
          variant="secondary"
          tooltip={t("builder.shared.duplicate")}
          disabled={!canDuplicate}
          onClick={onDuplicate}
        />
        <ConfirmIconButton
          variant="confirm"
          tooltip={t("games.game.delete")}
          onConfirm={onDelete}
        />
      </Row>

      <Input
        id={`game-${game.id}-name`}
        label={t("games.game.name")}
        value={game.name}
        onChange={(e) => onChange({ name: e.target.value })}
        maxLength={FIND_TEAM_LIMITS.gameName}
        characterCount
      />
      <EmojiValueField
        id={`game-${game.id}-emoji`}
        label={t("games.game.emoji")}
        value={emojiText(game.emoji)}
        onChange={(emoji) => onChange({ emoji: emoji ?? "" })}
        guildId={guildId}
      />
      <Column fillWidth gap="4">
        <RoleSelect
          label={t("games.game.role")}
          id={`game-${game.id}-role`}
          options={roleOptions}
          selectedRole={game.role ?? ""}
          setSelectedRole={(value) => onChange({ role: (value as string) || null })}
        />
        <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="4">
          {t("games.game.roleHint")}
        </Text>
      </Column>

      <Text variant="label-strong-m">{t("games.game.form")}</Text>
      <ModalEditor
        value={modal}
        guildId={guildId}
        showCustomId={false}
        placeholders={false}
        onChange={(next) => onChange({ modal: { title: next.title, fields: next.fields } })}
      />
    </Column>
  );
}

/** What the bot posts in the requests channel when a member fills the form of the game. */
function RequestPreview({ game }: { game: FindTeamGame }) {
  const t = useT();
  const embed: EmbedCustom = {
    id: "request",
    name: "request",
    title: t("games.preview.requestTitle"),
    author: { name: t("games.preview.sampleUser") },
    fields: [
      { name: t("games.preview.organizer"), value: `<@${PREVIEW_USER}>`, inline: true },
      { name: t("games.preview.voice"), value: "<#123456789012345679>", inline: true },
      ...(game.modal.fields.length > 0
        ? game.modal.fields.map((field: IModalField) => ({
            name: field.name,
            value: field.placeholder || t("games.preview.sampleAnswer"),
            inline: false,
          }))
        : [
            {
              name: t("games.preview.defaultField"),
              value: t("games.preview.sampleAnswer"),
              inline: false,
            },
          ]),
    ],
    footer: { text: `${emojiText(game.emoji) || "🎮"} ${game.name}` },
    timestamp: true,
  };

  return (
    <Column fillWidth gap="8">
      <DiscordPreview
        message={{
          content: game.role ? `<@&${game.role}>` : undefined,
          embeds: [embed],
          buttons: [
            {
              id: "join",
              name: "join",
              label: t("games.preview.join"),
              style: "LINK",
              emoji: "🔊",
              url: "https://discord.com",
            },
          ],
        }}
      />
      <Text variant="body-default-xs" onBackground="neutral-weak">
        {t("games.preview.requestNote")}
      </Text>
    </Column>
  );
}

/** The form the member fills in. Without fields the bot asks for one description. */
function FormPreview({ game }: { game: FindTeamGame }) {
  const t = useT();
  const fields: IModalField[] =
    game.modal.fields.length > 0
      ? game.modal.fields
      : [
          {
            id: "default",
            name: t("games.preview.defaultField"),
            placeholder: t("games.preview.defaultFieldPlaceholder"),
            type: "long",
            min: 10,
            max: 1000,
            required: true,
          },
        ];

  return (
    <Flex fillWidth style={{ minHeight: 380 }}>
      <DiscordPreview
        message={{
          modal: { id: game.id, title: game.modal.title, fields },
        }}
      />
    </Flex>
  );
}
