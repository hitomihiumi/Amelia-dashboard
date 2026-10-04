/* eslint-disable @next/next/no-img-element */
"use client";

import { useDiscordPreviewOptional } from "@/contexts/DiscordPreviewContext";
import { useT } from "@/i18n/client";
import type {
  ButtonCustom,
  EmbedCustom,
  LayoutCustom,
  LayoutLibrary,
  ModalCustom,
  SelectMenuCustom,
} from "@/lib/db/types";
import { DiscordMessageRow } from "./DiscordMessageRow";
import { DiscordModal } from "./DiscordModal";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

/** A simulated message rendered as a "Bot response": content + embeds + component action-rows. */
export interface PreviewMessage {
  /** Optional override; the guild's real bot identity from context is used when unset. */
  author?: string;
  avatarUrl?: string | null;
  content?: string;
  embeds?: EmbedCustom[];
  buttons?: ButtonCustom[];
  selectMenus?: SelectMenuCustom[];
  /** A Components V2 layout. Replaces content/embeds/buttons/selectMenus when set. */
  layout?: LayoutCustom | null;
  /** The stored buttons and select menus the layout references. */
  layoutLibrary?: LayoutLibrary;
  /** If set, renders a Discord modal overlay on top of the channel frame instead of a message. */
  modal?: ModalCustom | null;
  /** If true, renders as a private DM card instead of the guild channel. */
  asDm?: boolean;
}

export interface DiscordPreviewProps {
  message: PreviewMessage | null;
  channelName?: string;
}

/** Discord's own default avatar (blurple Clyde), shown when the bot has no custom avatar. */
const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

function PreviewChrome({
  botName,
  botAvatarUrl,
  className,
  children,
}: {
  botName: string | null | undefined;
  botAvatarUrl: string | null | undefined;
  className?: string;
  children: ReactNode;
}) {
  const t = useT();
  const ctx = useDiscordPreviewOptional();
  const name = botName || ctx?.botName || "Amelia";
  const avatarUrl = botAvatarUrl ?? ctx?.botAvatarUrl ?? DEFAULT_AVATAR;

  return (
    <div className={cn("rounded-lg bg-[#313338] p-3 text-[15px] leading-snug w-full", className)}>
      <div className="flex gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div
            className="size-10 shrink-0 rounded-full bg-gradient-to-br from-[#5865F2] to-[#7289da]"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-medium text-[#f2f3f5]">{name}</span>
            <span className="rounded bg-[#5865F2] px-2 py-px text-[10px] font-semibold uppercase leading-none text-white">
              {t("builder.preview.botBadge")}
            </span>
            <span className="text-xs font-medium text-[#949ba4]">{t("builder.preview.timeToday")}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function DiscordPreview({ message }: DiscordPreviewProps) {
  const t = useT();
  if (!message) {
    return (
      <div className="flex items-center justify-center h-full text-discord-text-muted text-sm text-center p-6">
        {t("builder.preview.nothingToPreview")}
      </div>
    );
  }

  if (message.modal) {
    return (
      <div className="inset-0 w-full h-full">
        <DiscordModal modal={message.modal} />
      </div>
    );
  }

  if (message.asDm) {
    return (
      <DiscordDMFrame
        botName={message.author}
        botAvatarUrl={message.avatarUrl}
        content={message.content}
        embeds={message.embeds}
        buttons={message.buttons}
        selectMenus={message.selectMenus}
        layout={message.layout}
        layoutLibrary={message.layoutLibrary}
      />
    );
  }

  return (
    <PreviewChrome botName={message.author} botAvatarUrl={message.avatarUrl}>
      <DiscordMessageRow
        content={message.content}
        embeds={message.embeds}
        buttons={message.buttons}
        selectMenus={message.selectMenus}
        layout={message.layout}
        layoutLibrary={message.layoutLibrary}
        hoverable
        showEmptyHint
        className="bg-discord-bg-primary"
      />
    </PreviewChrome>
  );
}

function DiscordDMFrame({
  botName,
  botAvatarUrl,
  content,
  embeds,
  buttons,
  selectMenus,
  layout,
  layoutLibrary,
}: {
  botName?: string;
  botAvatarUrl?: string | null;
  content?: string;
  embeds?: EmbedCustom[];
  buttons?: ButtonCustom[];
  selectMenus?: SelectMenuCustom[];
  layout?: LayoutCustom | null;
  layoutLibrary?: LayoutLibrary;
}) {
  const t = useT();
  const ctx = useDiscordPreviewOptional();
  const name = botName || ctx?.botName || "Amelia";
  const avatarUrl = botAvatarUrl ?? ctx?.botAvatarUrl ?? null;

  return (
    <div className="w-full h-full flex flex-col bg-discord-bg-primary rounded-[8px] overflow-hidden font-discord antialiased">
      <div className="flex items-center gap-2 px-4 h-12 border-b border-discord-bg-tertiary flex-shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <img
            src="https://cdn.discordapp.com/embed/avatars/0.png"
            alt=""
            className="w-6 h-6 rounded-full object-cover"
          />
        )}
        <span className="text-white font-semibold text-[15px]">{name}</span>
        <span className="text-discord-text-muted text-xs">{t("builder.preview.directMessage")}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <DiscordMessageRow
          botName={botName}
          botAvatarUrl={botAvatarUrl}
          content={content}
          embeds={embeds}
          buttons={buttons}
          selectMenus={selectMenus}
          layout={layout}
          layoutLibrary={layoutLibrary}
          buttonSize="sm"
          showEmptyHint
          className="p-0 -mx-0 px-0"
        />
      </div>
    </div>
  );
}
