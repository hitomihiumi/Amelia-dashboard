import type {
  ButtonCustom,
  EmbedCustom,
  EmbedField,
  IModalField,
  SelectMenuCustom,
  SelectMenuOptionCustom,
} from "@/lib/db/types";

/** Standard Discord embed colors (mirrors discord.js's resolved palette). */
export const DISCORD_DEFAULT_EMBED_COLOR = "#1e1f22";

export const DISCORD_BUTTON_COLORS: Record<
  ButtonCustom["style"],
  { bg: string; color: string; outline?: boolean }
> = {
  PRIMARY: { bg: "#5865F2", color: "#ffffff" },
  SECONDARY: { bg: "#4e5058", color: "#ffffff" },
  SUCCESS: { bg: "#248046", color: "#ffffff" },
  DANGER: { bg: "#da373c", color: "#ffffff" },
  LINK: { bg: "#4e5058", color: "#ffffff" },
};

/**
 * Resolve a ColorResolvable-like value to a CSS-hex string.
 * Accepts hex strings ("#fff", "#ffffff", "ffffff", "fff"), decimal ints, RGB arrays,
 * and one of the discord.js named presets. Falls back to a neutral embed color.
 */
export function resolveDiscordColor(color?: unknown): string {
  if (color == null) return DISCORD_DEFAULT_EMBED_COLOR;
  if (typeof color === "number") {
    if (!Number.isFinite(color) || color < 0) return DISCORD_DEFAULT_EMBED_COLOR;
    const hex = color.toString(16).padStart(6, "0").slice(-6);
    return "#" + hex;
  }
  if (typeof color === "string") {
    const named = NAMED_DISCORD_COLORS[color.toUpperCase()];
    if (named) return named;
    let hex = color.replace(/^#/, "").trim();
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) return "#" + hex.toLowerCase();
    return DISCORD_DEFAULT_EMBED_COLOR;
  }
  if (Array.isArray(color) && color.length >= 3) {
    const [r, g, b] = color;
    return (
      "#" +
      [r, g, b]
        .map((v) => Number(v).toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 6)
    );
  }
  return DISCORD_DEFAULT_EMBED_COLOR;
}

const NAMED_DISCORD_COLORS: Record<string, string> = {
  DEFAULT: "#1e1f22",
  WHITE: "#ffffff",
  AQUA: "#1abc9c",
  GREEN: "#1abc9c",
  BLUE: "#3498db",
  YELLOW: "#f1c40f",
  PURPLE: "#9b59b6",
  LUMINOUS_VIVID_PINK: "#e91e63",
  FUCHSIA: "#e91e63",
  GOLD: "#f1c40f",
  ORANGE: "#e67e22",
  RED: "#e74c3c",
  GREY: "#95a5a6",
  NAVY: "#34495e",
  DARK_AQUA: "#11806a",
  DARK_GREEN: "#1f8b4c",
  DARK_BLUE: "#206694",
  DARK_PURPLE: "#71368a",
  DARK_VIVID_PINK: "#ad1457",
  DARK_GOLD: "#c27c0e",
  DARK_ORANGE: "#a84300",
  DARK_RED: "#992d22",
  DARK_GREY: "#979c9f",
  DARKER_GREY: "#7f8c8d",
  LIGHT_GREY: "#bccbfc",
  DARK_NAVY: "#2c3e50",
  BLURPLE: "#5865f2",
  GREYPLE: "#99aab5",
  DARK_BUT_NOT_BLACK: "#2c2f33",
  NOT_QUITE_BLACK: "#23272a",
};

export function slicesToActionRows<T>(items: T[], perRow = 5): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow));
  return rows;
}

export type {
  ButtonCustom,
  EmbedCustom,
  EmbedField,
  IModalField,
  SelectMenuCustom,
  SelectMenuOptionCustom,
};
