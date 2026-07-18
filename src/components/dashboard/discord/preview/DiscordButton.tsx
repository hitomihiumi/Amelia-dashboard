"use client";

import type { ButtonCustom } from "@/lib/db/types";
import { DISCORD_BUTTON_COLORS } from "@/lib/discord/discord-style";
import { cn } from "@/lib/utils";
import React from "react";

export interface DiscordButtonProps {
  button: ButtonCustom;
  size?: "sm" | "md";
}

export function DiscordButton({ button, size = "md" }: DiscordButtonProps) {
  const palette = DISCORD_BUTTON_COLORS[button.style] ?? DISCORD_BUTTON_COLORS.PRIMARY;

  return (
    <button
      type="button"
      disabled={button.disabled}
      className={cn(
        "inline-flex max-w-full  min-w-0 items-center gap-2 rounded-sm py-1.5 font-medium leading-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "h-8 text-[13px] px-4" : "h-10 text-sm px-[1.3rem]",
        palette.outline ? "border" : "hover:brightness-110",
      )}
      style={
        palette.outline
          ? { color: palette.color, borderColor: palette.color }
          : { backgroundColor: palette.bg, color: palette.color }
      }
    >
      {button.emoji && <DiscordEmoji value={button.emoji} />}
      {button.style === "LINK" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
          <path
            d="M5 3H3v6h6V7M5 3l5 0M9.5 1.5L11 3 9.5 4.5"
            stroke={palette.color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className="max-w-[280px] truncate">{button.label || "Button"}</span>
    </button>
  );
}

export function DiscordEmoji({ value }: { value: unknown }) {
  const v: string | { name?: string; id?: string; animated?: boolean } | null = value as any;
  if (!v) return null;
  if (typeof v === "string") {
    const custom = /^<a?:(\w+):(\d{17,20})>/.exec(v);
    if (custom) {
      const animated = v.startsWith("<a:");
      const [, name, id] = custom;
      const ext = animated ? "gif" : "webp";
      return (
        <img
          src={`https://cdn.discordapp.com/emojis/${id}.${ext}?size=44`}
          alt={`:${name}:`}
          className="inline-block h-[1.375em] w-[1.375em] align-bottom object-contain"
          loading="lazy"
        />
      );
    }
    return <span className="text-base leading-none">{v}</span>;
  }
  if (v.id) {
    return (
      <img
        src={`https://cdn.discordapp.com/emojis/${v.id}.${v.animated ? "gif" : "webp"}?size=44`}
        alt={`:${v.name || ""}:`}
        className="inline-block h-[1.375em] w-[1.375em] align-bottom object-contain"
        loading="lazy"
      />
    );
  }
  return <span className="text-base leading-none">{v.name || ""}</span>;
}
