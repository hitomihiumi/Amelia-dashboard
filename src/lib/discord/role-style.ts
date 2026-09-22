import type { CSSProperties } from "react";

export function discordRoleRgb(color: number): { r: number; g: number; b: number } | null {
  if (!Number.isFinite(color) || color === 0) return null;
  return {
    r: (color >> 16) & 255,
    g: (color >> 8) & 255,
    b: color & 255,
  };
}

export function discordRolePillStyle(color: number): CSSProperties {
  const rgb = discordRoleRgb(color);
  if (!rgb) {
    return {
      color: "rgb(244 244 245)",
      backgroundColor: "rgba(63, 63, 70, 0.35)",
    };
  }
  const { r, g, b } = rgb;
  return {
    color: `rgb(${r}, ${g}, ${b})`,
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.18)`,
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
