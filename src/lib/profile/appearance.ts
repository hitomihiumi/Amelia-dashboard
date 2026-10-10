import type { CardColors, CardKind, ProfileIcon } from "@/components/profile/cards/types";
import { defaultDisplayOptions } from "@/lib/db/types/UserSchema";

/**
 * What a member can change about their cards with `/appearance` of the bot. It is kept per
 * server, so every server a member is on has its own copy.
 */
export interface Appearance {
  rank: { solid: CardColors };
  profile: {
    solid: CardColors;
    bio: string;
    iconsPadding: number;
    /** Not editable on the site (the bot has no icon pictures yet); kept as it was stored. */
    icons: ProfileIcon[];
  };
  level_up: { solid: CardColors };
}

export const CARD_KINDS: readonly CardKind[] = ["rank", "profile", "level_up"] as const;

export const COLOR_KEYS = [
  "bg_color",
  "first_component",
  "second_component",
  "third_component",
] as const satisfies readonly (keyof CardColors)[];

/** Longest biography the bot accepts. */
export const BIO_MAX_LENGTH = 400;
export const ICONS_PADDING_MIN = 0;
export const ICONS_PADDING_MAX = 10;

/** The same check the bot does on the colours typed into its modal. */
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9A-F]{3}){1,2}$/i.test(value);
}

export function defaultColors(kind: CardKind): CardColors {
  return { ...defaultDisplayOptions[kind].solid };
}

export function defaultAppearance(): Appearance {
  return {
    rank: { solid: defaultColors("rank") },
    profile: {
      solid: defaultColors("profile"),
      bio: "",
      iconsPadding: defaultDisplayOptions.profile.icons_padding,
      icons: [],
    },
    level_up: { solid: defaultColors("level_up") },
  };
}

/** Colours read from the database: anything that is not a valid colour falls back to the default. */
export function readColors(raw: unknown, fallback: CardColors): CardColors {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...fallback };
  for (const key of COLOR_KEYS) {
    const value = source[key];
    if (isHexColor(value)) out[key] = value;
  }
  return out;
}

export function clampIconsPadding(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return defaultDisplayOptions.profile.icons_padding;
  return Math.min(ICONS_PADDING_MAX, Math.max(ICONS_PADDING_MIN, Math.round(n)));
}

function readIcons(raw: unknown): ProfileIcon[] {
  if (!Array.isArray(raw)) return [];
  const icons: ProfileIcon[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { name, pos } = item as { name?: unknown; pos?: unknown };
    if (typeof name !== "string" || !Array.isArray(pos) || pos.length !== 2) continue;
    const [x, y] = pos;
    if (Number.isInteger(x) && Number.isInteger(y)) icons.push({ name, pos: [x, y] });
  }
  return icons;
}

/** The columns of a `User` row that hold the card settings. */
export interface AppearanceRow {
  rankSolid: unknown;
  profileSolid: unknown;
  profileBio: string;
  profileIcons: unknown;
  profileIconsPadding: number;
  levelupSolid: unknown;
}

export function appearanceFromRow(row: AppearanceRow | null | undefined): Appearance {
  const defaults = defaultAppearance();
  if (!row) return defaults;
  return {
    rank: { solid: readColors(row.rankSolid, defaults.rank.solid) },
    profile: {
      solid: readColors(row.profileSolid, defaults.profile.solid),
      bio: row.profileBio ?? "",
      iconsPadding: clampIconsPadding(row.profileIconsPadding),
      icons: readIcons(row.profileIcons),
    },
    level_up: { solid: readColors(row.levelupSolid, defaults.level_up.solid) },
  };
}

/** Whether two cards of one kind would be drawn the same. */
export function sameCard(kind: CardKind, a: Appearance, b: Appearance): boolean {
  if (JSON.stringify(a[kind].solid) !== JSON.stringify(b[kind].solid)) return false;
  if (kind !== "profile") return true;
  return a.profile.bio === b.profile.bio && a.profile.iconsPadding === b.profile.iconsPadding;
}
