/* eslint-disable @next/next/no-img-element */
"use client";

import { useT } from "@/i18n/client";
import type {
  ButtonCustom,
  EmbedCustom,
  LayoutCustom,
  LayoutLibrary,
  SelectMenuCustom,
} from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { DiscordButton } from "./DiscordButton";
import { DiscordEmbed } from "./DiscordEmbed";
import { DiscordLayout } from "./DiscordLayout";
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
  /** A Components V2 message: replaces content, embeds and the classic component rows. */
  layout?: LayoutCustom | null;
  /** The buttons and select menus the layout points at. */
  layoutLibrary?: LayoutLibrary;
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
  layout,
  layoutLibrary,
  buttonSize = "md",
  hoverable = false,
  showEmptyHint = false,
  className,
}: DiscordMessageRowProps) {
  const t = useT();
  const text = (content ?? "").trim();
  const visibleEmbeds = embeds.slice(0, 10);
  const hasComponents = buttons.length > 0 || selectMenus.length > 0;
  const isEmpty = !text && visibleEmbeds.length === 0 && !hasComponents;

  if (layout) {
    return (
      <div>
        <DiscordLayout
          layout={layout}
          library={layoutLibrary ?? { buttons: [], selectMenus: [] }}
          buttonSize={buttonSize}
        />
      </div>
    );
  }

  return (
    <div>
      {text ? (
        <div className="mt-[4px] text-discord-text-normal">
          <DiscordText text={content ?? ""} />
        </div>
      ) : null}

      {visibleEmbeds.length > 0 ? (
        <div className="mt-[4px] space-y-2">
          {visibleEmbeds.map((embed, i) => (
            <DiscordEmbed key={i} embed={embed} />
          ))}
        </div>
      ) : null}

      {hasComponents ? (
        <div className="mt-[4px] flex flex-col gap-2">
          {selectMenus.map((menu, i) => (
            <DiscordSelectMenu key={i} menu={menu} />
          ))}
          {renderActionRows(buttons, buttonSize)}
        </div>
      ) : null}

      {isEmpty && showEmptyHint ? (
        <p className="mt-[4px] text-sm italic text-discord-text-muted">
          {t("builder.preview.emptyMessage")}
        </p>
      ) : null}
    </div>
  );
}

function renderActionRows(buttons: ButtonCustom[], size: "sm" | "md") {
  const rows: ButtonCustom[][] = [];
  for (let i = 0; i < buttons.length; i += 5) rows.push(buttons.slice(i, i + 5));
  return rows.map((row, i) => (
    <div key={i} className="mt-[4px] flex flex-wrap items-center gap-2">
      {row.map((b, j) => (
        <DiscordButton key={j} button={b} size={size} />
      ))}
    </div>
  ));
}
