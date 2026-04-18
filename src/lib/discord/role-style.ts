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
