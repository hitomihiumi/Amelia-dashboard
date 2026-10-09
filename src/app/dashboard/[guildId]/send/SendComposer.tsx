"use client";

import { TextTools } from "@/components/dashboard/text/TextTools";
import { LabelSelect } from "@/components/dashboard/discord/LabelSelect";
import {
  DiscordPreview,
  type PreviewMessage,
} from "@/components/dashboard/discord/preview/DiscordPreview";
import { useT } from "@/i18n/client";
import type { ButtonCustom, EmbedCustom, SelectMenuCustom } from "@/lib/db/types";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import { CLASSIC_LIMITS } from "@/lib/discord/message-payload";
import { INTERACTIVE_PLACEHOLDER } from "@/lib/discord/substitute";
import {
  Button,
  Column,
  Feedback,
  Grid,
  RevealFx,
  Row,
  SegmentedControl,
  Switch,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { type CSSProperties, useDeferredValue, useMemo, useState, useTransition } from "react";
import { PreviewPane, Workspace, WorkspaceCard } from "../components/Workspace";
import { LayoutPicker, MultiReferences } from "../scenarios/ActionNodeForm";
import type { ComponentsLibrary } from "../scenarios/scenariosTypes";
import styles from "./SendComposer.module.scss";
import { type SendMessageResult, sendDashboardMessage } from "./actions";

const EXAMPLE_TOKENS = "{user.name}, {user.mention}, {channel.mention}, {guild.name}, {date}";
const INTERACTIVE_TOKENS = "{input.0}, {selected.value}, {var.name}";

type Mode = "classic" | "layout";

// Composer fields flow into columns by the room the editor pane has (it varies with the preview
// pane next to it), so the grids size themselves instead of following the viewport.
const FIELDS_GRID: CSSProperties = {
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  alignItems: "start",
};
// Channel and message type need more room than a plain field (the type switch has long labels).
const PAIR_GRID: CSSProperties = {
  gridColumn: "1 / -1",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
  alignItems: "start",
};
const FULL_ROW: CSSProperties = { gridColumn: "1 / -1" };

interface SendComposerProps {
  guildId: string;
  library: ComponentsLibrary;
  channels: GuildChannelOption[];
}

/** Rows the buttons and menus need, laid out like the bot does: five buttons a row, one menu a row. */
function rowsNeeded(buttons: number, menus: number): number {
  return Math.ceil(buttons / CLASSIC_LIMITS.BUTTONS_PER_ROW) + menus;
}

export function SendComposer({ guildId, library, channels }: SendComposerProps) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  const [channelId, setChannelId] = useState("");
  const [mode, setMode] = useState<Mode>("classic");
  const [content, setContent] = useState("");
  const [embedIds, setEmbedIds] = useState<string[]>([]);
  const [buttonIds, setButtonIds] = useState<string[]>([]);
  const [selectMenuIds, setSelectMenuIds] = useState<string[]>([]);
  const [layoutId, setLayoutId] = useState("");
  const [allowEveryone, setAllowEveryone] = useState(false);
  const [result, setResult] = useState<SendMessageResult | null>(null);

  const rows = rowsNeeded(buttonIds.length, selectMenuIds.length);
  const tooManyRows = mode === "classic" && rows > CLASSIC_LIMITS.ROWS;

  const layout = library.layouts.find((candidate) => candidate.id === layoutId) ?? null;
  const hasInteractiveTokens = useMemo(() => {
    const parts: string[] = [];
    if (mode === "layout") {
      if (layout) parts.push(JSON.stringify(layout));
    } else {
      parts.push(content);
      for (const id of embedIds) {
        const embed = library.embed.find((candidate) => candidate.id === id);
        if (embed) parts.push(JSON.stringify(embed));
      }
    }
    return INTERACTIVE_PLACEHOLDER.test(parts.join("\n"));
  }, [content, embedIds, layout, library.embed, mode]);

  const previewMessage = useMemo<PreviewMessage | null>(() => {
    if (mode === "layout") {
      if (!layout) return { content: t("send.preview.pickLayout") };
      return {
        layout,
        layoutLibrary: { buttons: library.buttons, selectMenus: library.selectMenus },
      };
    }

    const embeds = embedIds
      .map((id) => library.embed.find((embed) => embed.id === id))
      .filter(Boolean) as EmbedCustom[];
    const buttons = buttonIds
      .map((id) => library.buttons.find((button) => button.id === id))
      .filter(Boolean) as ButtonCustom[];
    const selectMenus = selectMenuIds
      .map((id) => library.selectMenus.find((menu) => menu.id === id))
      .filter(Boolean) as SelectMenuCustom[];

    const empty =
      !content.trim() && embeds.length === 0 && buttons.length === 0 && selectMenus.length === 0;
    return {
      content: empty ? t("send.preview.empty") : content || undefined,
      embeds,
      buttons,
      selectMenus,
    };
  }, [mode, layout, library, embedIds, buttonIds, selectMenuIds, content, t]);
  const deferredPreview = useDeferredValue(previewMessage);

  const hasMessage =
    mode === "layout" ? Boolean(layout) : Boolean(content.trim()) || embedIds.length > 0;
  const canSend = Boolean(channelId) && hasMessage && !tooManyRows && !pending;

  const submit = () => {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(
          await sendDashboardMessage(guildId, {
            channelId,
            mode,
            content,
            embedIds,
            buttonIds,
            selectMenuIds,
            layoutId,
            allowEveryone,
          }),
        );
      } catch {
        setResult({ ok: false, error: t("send.errors.unexpected") });
      }
    });
  };

  const reset = () => {
    setContent("");
    setEmbedIds([]);
    setButtonIds([]);
    setSelectMenuIds([]);
    setLayoutId("");
    setResult(null);
  };

  const channelName = channels.find((channel) => channel.id === channelId)?.name;

  const previewPane = (
    <PreviewPane
      title={t("send.preview.title")}
      meta={
        channelName ? (
          <Text variant="body-default-s" onBackground="neutral-medium" truncate>
            #{channelName}
          </Text>
        ) : undefined
      }
    >
      <DiscordPreview message={deferredPreview} channelName={channelName} />
    </PreviewPane>
  );

  return (
    <RevealFx delay={300} translateY={-0.5} fillWidth>
      <Workspace aside={previewPane}>
        <WorkspaceCard>
          <Grid fillWidth minWidth={0} gap="16" style={FIELDS_GRID}>
            <Grid minWidth={0} gap="16" style={PAIR_GRID}>
              <Column gap="8" minWidth={0} center fill>
                {channels.length === 0 ? (
                  <Column gap="4">
                    <Text variant="label-default-s">{t("send.channel.label")}</Text>
                    <Text variant="body-default-s" onBackground="danger-medium">
                      {t("send.channel.none")}
                    </Text>
                  </Column>
                ) : (
                  <LabelSelect
                    id={`${guildId}-send-channel`}
                    label={t("send.channel.label")}
                    selectedValue={channelId}
                    setSelectedValue={(value) => setChannelId((value as string) ?? "")}
                    options={channels.map((channel) => ({
                      value: channel.id,
                      label: `#${channel.name}`,
                    }))}
                  />
                )}
              </Column>

              <Column gap="8" minWidth={0}>
                <Text variant="label-default-s">{t("send.mode.label")}</Text>
                <SegmentedControl
                  fillWidth
                  value={mode}
                  onChange={(value) => {
                    setMode(value as Mode);
                    setResult(null);
                  }}
                  buttons={[
                    { label: t("send.mode.classic"), value: "classic" },
                    { label: t("send.mode.layout"), value: "layout" },
                  ]}
                />
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  {t(mode === "layout" ? "send.mode.layoutHint" : "send.mode.classicHint")}
                </Text>
              </Column>
            </Grid>

            {mode === "layout" ? (
              <Column minWidth={0} style={FULL_ROW}>
                <LayoutPicker
                  guildId={guildId}
                  layoutId={layoutId}
                  library={library}
                  onChange={(id) => {
                    setLayoutId(id);
                    setResult(null);
                  }}
                />
              </Column>
            ) : (
              <>
                <Column minWidth={0} style={FULL_ROW}>
                  <TextTools
                    id={`${guildId}-send-content`}
                    value={content}
                    onValueChange={setContent}
                    guildId={guildId}
                    scenario={false}
                    multiline
                  >
                    <Textarea
                      id={`${guildId}-send-content`}
                      label={t("send.classic.content")}
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      lines={4}
                      maxLength={CLASSIC_LIMITS.CONTENT}
                      characterCount
                      resize="vertical"
                      description={t("send.classic.contentHint")}
                    />
                  </TextTools>
                </Column>
                <Grid minWidth={0} gap="16" className={styles.pickers} style={FULL_ROW}>
                  <Column gap="8" minWidth={0}>
                    <MultiReferences
                      label={t("send.classic.embeds")}
                      options={library.embed.map((embed) => ({
                        value: embed.id,
                        label: embed.name || embed.title || t("builder.fallback.embed"),
                      }))}
                      selected={embedIds}
                      onToggle={setEmbedIds}
                    />
                  </Column>
                  <Column gap="8" minWidth={0}>
                    <MultiReferences
                      label={t("send.classic.buttons")}
                      options={library.buttons.map((button) => ({
                        value: button.id,
                        label: button.name || button.label,
                      }))}
                      selected={buttonIds}
                      onToggle={setButtonIds}
                    />
                  </Column>
                  <Column gap="8" minWidth={0}>
                    <MultiReferences
                      label={t("send.classic.selectMenus")}
                      options={library.selectMenus.map((menu) => ({
                        value: menu.id,
                        label: menu.name || menu.placeholder || t("builder.fallback.menu"),
                      }))}
                      selected={selectMenuIds}
                      onToggle={setSelectMenuIds}
                    />
                  </Column>
                </Grid>
                {(buttonIds.length > 0 || selectMenuIds.length > 0) && (
                  <Column minWidth={0} style={FULL_ROW}>
                    <Text
                      variant="body-default-xs"
                      onBackground={tooManyRows ? "danger-medium" : "neutral-weak"}
                    >
                      {t("send.classic.rowsUsed", { used: rows, max: CLASSIC_LIMITS.ROWS })}
                      {" · "}
                      {t("send.classic.rowsHint", { max: CLASSIC_LIMITS.ROWS })}
                    </Text>
                  </Column>
                )}
              </>
            )}

            <Column minWidth={0} style={FULL_ROW}>
              <Switch
                label={t("send.mentions.label")}
                description={t("send.mentions.description")}
                checked={allowEveryone}
                onToggle={() => setAllowEveryone((value) => !value)}
              />
            </Column>

            <Column gap="8" minWidth={0} style={FULL_ROW}>
              <Text variant="label-default-s">{t("send.placeholders.title")}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("send.placeholders.text", { tokens: EXAMPLE_TOKENS })}
              </Text>
              {hasInteractiveTokens && (
                <Text variant="body-default-xs" onBackground="warning-medium">
                  {t("send.placeholders.interactive", { tokens: INTERACTIVE_TOKENS })}
                </Text>
              )}
            </Column>
          </Grid>

          <Column fillWidth gap="12" paddingTop="16" borderTop="neutral-weak">
            {result?.ok === false && <Feedback variant="danger" description={result.error} />}
            {result?.ok === true && (
              <Feedback
                variant={result.warnings.length > 0 ? "warning" : "success"}
                title={t(
                  result.warnings.length > 0
                    ? "send.result.warningsTitle"
                    : "send.result.sentTitle",
                )}
                description={
                  result.warnings.length > 0
                    ? t("send.result.warningsText")
                    : t("send.result.sentText")
                }
              >
                <Column gap="8" paddingTop="8">
                  {result.warnings.length > 0 && (
                    <Column as="ul" gap="4" paddingLeft="16" margin="0">
                      {result.warnings.map((warning) => (
                        <Text
                          as="li"
                          key={warning}
                          variant="body-default-xs"
                          style={{ wordBreak: "break-word" }}
                        >
                          {warning}
                        </Text>
                      ))}
                    </Column>
                  )}
                  <Row>
                    <Button
                      size="s"
                      variant="secondary"
                      suffixIcon="arrowUpRight"
                      href={result.messageUrl}
                      target="_blank"
                    >
                      {t("send.result.open")}
                    </Button>
                  </Row>
                </Column>
              </Feedback>
            )}

            <Row wrap horizontal="end" gap="8" className={styles.actions}>
              <Button variant="tertiary" onClick={reset} disabled={pending}>
                {t("send.action.reset")}
              </Button>
              <Button
                variant="primary"
                prefixIcon="navSend"
                onClick={submit}
                disabled={!canSend}
                loading={pending}
              >
                {pending ? t("send.action.sending") : t("send.action.send")}
              </Button>
            </Row>
            {!channelId && channels.length > 0 && hasMessage && (
              <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
                {t("send.channel.required")}
              </Text>
            )}
          </Column>
        </WorkspaceCard>
      </Workspace>
    </RevealFx>
  );
}
