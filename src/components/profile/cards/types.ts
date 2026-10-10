/** The four colours every card of the bot is painted with (`/appearance`). */
export interface CardColors {
  bg_color: string;
  first_component: string;
  second_component: string;
  third_component: string;
}

export type CardKind = "rank" | "profile" | "level_up";

/** Who the card is about. */
export interface CardIdentity {
  /** Absolute URL of the avatar picture. */
  avatar: string;
  username: string;
  globalName: string;
}

/** The numbers shown on the rank and profile cards. */
export interface CardStats {
  level: number;
  /** XP inside the current level. */
  xp: number;
  /** Voice time in milliseconds. */
  voice_time: number;
}

/** Short unit suffixes of the voice time chip ("d", "h", "m", "s"). */
export interface CardTimeUnits {
  day: string;
  hour: string;
  minute: string;
  second: string;
}

export interface ProfileIcon {
  name: string;
  pos: [number, number];
}

export const CARD_FONT = "WDXL Lubrifont";
export const CARD_MONO_FONT = "Geist Mono";
