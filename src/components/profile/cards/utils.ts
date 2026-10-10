import type { CardTimeUnits } from "./types";

/** XP needed to leave `level`; the same curve as the bot (`getNextLevelXP`). */
export function getNextLevelXP(level: number): number {
  return 5 * level ** 2 + 50 * level + 100;
}

/** Voice time as the biggest whole unit, e.g. "3h". Mirrors the bot's `formatTime` with `short`. */
export function formatVoiceTime(ms: number, units: CardTimeUnits): string {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const days = Math.floor(safe / 86_400_000);
  const hours = Math.floor((safe % 86_400_000) / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  if (days > 0) return `${days}${units.day}`;
  if (hours > 0) return `${hours}${units.hour}`;
  if (minutes > 0) return `${minutes}${units.minute}`;
  return `${seconds}${units.second}`;
}
