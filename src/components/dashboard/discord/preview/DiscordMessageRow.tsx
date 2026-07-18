/* eslint-disable @next/next/no-img-element */
"use client";

import type { ButtonCustom, EmbedCustom, SelectMenuCustom } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { DiscordButton } from "./DiscordButton";
import { DiscordEmbed } from "./DiscordEmbed";
import { DiscordSelectMenu } from "./DiscordSelectMenu";
import { DiscordText } from "./DiscordText";

export interface DiscordMessageRowProps {
  /** Overrides the context bot name; falls back to the guild's real bot identity, then "Amelia". */
  botName?: string;
  botAvatarUrl?: string | null;
  content?: string;
  embeds?: EmbedCustom[];
  buttons?: ButtonCustom[];
  selectMenus?: SelectMenuCustom[];
  buttonSize?: "sm" | "md";
  /** Highlight on hover, matching Discord's own message-row hover affordance. */
  hoverable?: boolean;
  /** Show the "nothing to render yet" hint when there's no content/embeds/components. */
  showEmptyHint?: boolean;
  className?: string;
}

/** One simulated Discord message row: avatar, name/badge/timestamp, content, embeds and components.
 * Shared by the guild-channel preview (`DiscordPreview`) and the DM preview so their markup can't drift. */
export function DiscordMessageRow({
  content,
  embeds = [],
  buttons = [],
  selectMenus = [],
  buttonSize = "md",
  hoverable = false,
  showEmptyHint = false,
  className,
}: DiscordMessageRowProps) {
  const text = (content ?? "").trim();
  const visibleEmbeds = embeds.slice(0, 10);
  const hasComponents = buttons.length > 0 || selectMenus.length > 0;
  const isEmpty = !text && visibleEmbeds.length === 0 && !hasComponents;

  return (
    <div>
        {text ? (
          <div className="mt-1 text-discord-text-normal">
            <DiscordText text={content ?? ""} />
          </div>
        ) : null}

        {visibleEmbeds.length > 0 ? (
          <div className="mt-1 space-y-2">
            {visibleEmbeds.map((embed, i) => (
              <DiscordEmbed key={i} embed={embed} />
            ))}
          </div>
        ) : null}

        {hasComponents ? (
          <div className="mt-1 flex flex-col gap-2">
            {selectMenus.map((menu, i) => (
              <DiscordSelectMenu key={i} menu={menu} />
            ))}
            {renderActionRows(buttons, buttonSize)}
          </div>
        ) : null}

        {isEmpty && showEmptyHint ? (
          <p className="mt-1 text-sm italic text-discord-text-muted">
            Empty message — add text or an embed.
          </p>
        ) : null}
      </div>
  );
}

function renderActionRows(buttons: ButtonCustom[], size: "sm" | "md") {
  const rows: ButtonCustom[][] = [];
  for (let i = 0; i < buttons.length; i += 5) rows.push(buttons.slice(i, i + 5));
  return rows.map((row, i) => (
    <div key={i} className="mt-1 flex flex-wrap items-center gap-2">
      {row.map((b, j) => (
        <DiscordButton key={j} button={b} size={size} />
      ))}
    </div>
  ));
}
