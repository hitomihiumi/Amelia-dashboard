export function discordRoleRgb(color: number): { r: number; g: number; b: number } | null {
  if (!Number.isFinite(color) || color === 0) return null;
  return {
    r: (color >> 16) & 255,
    g: (color >> 8) & 255,
    b: color & 255,
  };
}

type Rgb = { r: number; g: number; b: number };

/** WCAG relative luminance of an sRGB colour. */
function luminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Roughly a 4.5:1 contrast ratio against the dark dashboard surface. */
const MIN_TEXT_LUMINANCE = 0.22;

/** Below this a colour disappears into the background, so its dot gets an outline. */
const MIN_VISIBLE_LUMINANCE = 0.04;

/**
 * Discord lets roles have colours like #0b3d0b, which are invisible on a dark
 * surface. Mix the colour towards white until the text is readable, keeping
 * the hue so the role is still recognisable.
 */
export function readableRoleRgb(rgb: Rgb): Rgb {
  let current = rgb;

  for (let mix = 0.05; luminance(current) < MIN_TEXT_LUMINANCE && mix <= 1; mix += 0.05) {
    current = {
      r: Math.round(rgb.r + (255 - rgb.r) * mix),
      g: Math.round(rgb.g + (255 - rgb.g) * mix),
      b: Math.round(rgb.b + (255 - rgb.b) * mix),
    };
  }

  return current;
}

export interface RolePillStyle {
  /** Text colour, always readable. */
  color: string;
  /** Soft tint of the readable colour, for the standalone badge. */
  backgroundColor: string;
  /** The role's real colour; `null` for roles without one. */
  dotColor: string | null;
  /** The real colour is too dark to see, so the dot needs an outline. */
  dotOutline: boolean;
}

export function discordRolePillStyle(color: number): RolePillStyle {
  const rgb = discordRoleRgb(color);

  if (!rgb) {
    // "No colour" roles render as plain light text with a hollow dot.
    return {
      color: "rgb(244 244 245)",
      backgroundColor: "rgba(63, 63, 70, 0.35)",
      dotColor: null,
      dotOutline: true,
    };
  }

  const readable = readableRoleRgb(rgb);

  return {
    color: `rgb(${readable.r}, ${readable.g}, ${readable.b})`,
    backgroundColor: `rgba(${readable.r}, ${readable.g}, ${readable.b}, 0.16)`,
    dotColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    dotOutline: luminance(rgb) < MIN_VISIBLE_LUMINANCE,
  };
}

export type DiscordRole = {
  id: string;
  name: string;
  color: number;
};

export const permissionType = {
  Administrator: BigInt(8),
  ManageGuild: BigInt(32),
  ManageRoles: BigInt(268435456),
  ManageChannels: BigInt(16),
  KickMembers: BigInt(2),
  BanMembers: BigInt(4),
  ManageMessages: BigInt(8192),
  ModerateMembers: BigInt(40),
};

export const defaultPermissions = [
  { name: "Administrator", bigint: permissionType.Administrator },
  { name: "Manage Guild", bigint: permissionType.ManageGuild },
  { name: "Manage Roles", bigint: permissionType.ManageRoles },
  { name: "Manage Channels", bigint: permissionType.ManageChannels },
  { name: "Kick Members", bigint: permissionType.KickMembers },
  { name: "Ban Members", bigint: permissionType.BanMembers },
  { name: "Manage Messages", bigint: permissionType.ManageMessages },
  { name: "Moderate Members", bigint: permissionType.ModerateMembers },
];
