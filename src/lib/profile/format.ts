import type { CardTimeUnits } from "@/components/profile/cards/types";

/** "2h 14m": the two biggest non-zero units of a duration. */
export function formatDuration(ms: number, units: CardTimeUnits): string {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const parts: [number, string][] = [
    [Math.floor(safe / 86_400_000), units.day],
    [Math.floor((safe % 86_400_000) / 3_600_000), units.hour],
    [Math.floor((safe % 3_600_000) / 60_000), units.minute],
    [Math.floor((safe % 60_000) / 1000), units.second],
  ];
  const start = parts.findIndex(([value]) => value > 0);
  if (start === -1) return `0${units.second}`;
  return parts
    .slice(start, start + 2)
    .filter(([value]) => value > 0)
    .map(([value, unit]) => `${value}${unit}`)
    .join(" ");
}
