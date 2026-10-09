"use client";

import { Scene } from "@nmmty/adapter-react";
import { Column } from "@once-ui-system/core";
import { useMemo } from "react";
import "./cardFonts.css";
import { levelUpCard, LEVEL_UP_CARD_SIZE } from "./levelUpCard";
import { PROFILE_CARD_SIZE, profileCard } from "./profileCard";
import { RANK_CARD_SIZE, rankCard } from "./rankCard";
import type {
  CardColors,
  CardIdentity,
  CardKind,
  CardStats,
  CardTimeUnits,
  ProfileIcon,
} from "./types";

const MIC_SRC = "/img/mic.png";

export const CARD_SIZES: Record<CardKind, { width: number; height: number }> = {
  rank: RANK_CARD_SIZE,
  profile: PROFILE_CARD_SIZE,
  level_up: LEVEL_UP_CARD_SIZE,
};

export interface CardPreviewProps {
  kind: CardKind;
  identity: CardIdentity;
  stats: CardStats;
  colors: CardColors;
  units: CardTimeUnits;
  /** Profile card only. */
  bio?: string | null;
  icons?: ProfileIcon[];
  iconsPadding?: number;
  /** Level the level-up card announces; defaults to one above the current level. */
  levelUpTo?: number;
  maxWidth?: number;
}

/**
 * A card of the bot drawn live in the browser with LazyCanvas. The scene is the same layer tree
 * the bot renders to a PNG, so what changes here is what `/rank`, `/profile` and the level-up
 * message will look like.
 */
export function CardPreview({
  kind,
  identity,
  stats,
  colors,
  units,
  bio = null,
  icons = [],
  iconsPadding = 10,
  levelUpTo,
  maxWidth,
}: CardPreviewProps) {
  const size = CARD_SIZES[kind];

  // `<Scene>` rebuilds its layers whenever the element it receives is a new object, so the
  // tree is memoised on the values it is made of and not re-created on every parent render.
  const { avatar, username, globalName } = identity;
  const { level, xp, voice_time } = stats;
  const { bg_color, first_component, second_component, third_component } = colors;
  const { day, hour, minute, second } = units;
  const iconsKey = JSON.stringify(icons);

  const tree = useMemo(() => {
    const palette = { bg_color, first_component, second_component, third_component };
    const who = { avatar, username, globalName };
    const numbers = { level, xp, voice_time };
    const timeUnits = { day, hour, minute, second };
    switch (kind) {
      case "rank":
        return rankCard(who, numbers, palette, timeUnits, MIC_SRC);
      case "profile":
        return profileCard(
          who,
          numbers,
          palette,
          { bio, icons: JSON.parse(iconsKey) as ProfileIcon[], iconsPadding },
          timeUnits,
          MIC_SRC,
        );
      case "level_up":
        return levelUpCard(avatar, levelUpTo ?? level + 1, palette);
    }
  }, [
    kind,
    avatar,
    username,
    globalName,
    level,
    xp,
    voice_time,
    bg_color,
    first_component,
    second_component,
    third_component,
    day,
    hour,
    minute,
    second,
    bio,
    iconsKey,
    iconsPadding,
    levelUpTo,
  ]);

  return (
    <Column fillWidth horizontal="center" style={{ maxWidth: maxWidth ?? size.width }}>
      <Scene
        width={size.width}
        height={size.height}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {tree}
      </Scene>
    </Column>
  );
}
