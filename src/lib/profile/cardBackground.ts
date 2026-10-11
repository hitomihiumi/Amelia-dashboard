import type { CardKind } from "@/components/profile/cards/types";

/**
 * The picture behind a card. It is cut to the size of the card when it is uploaded, so the card can
 * draw it as it is. A card refers to it as `upload:<id>` (the `*Url` column of the bot).
 */
export const CARD_BACKGROUND_SIZES: Record<CardKind, { width: number; height: number }> = {
  rank: { width: 736, height: 260 },
  profile: { width: 736, height: 736 },
  level_up: { width: 400, height: 120 },
};

export const CARD_BACKGROUND_MAX_BYTES = 4_200_000;
export const CARD_BACKGROUND_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/** The picture of a card and how much it is darkened (0-100). */
export interface CardBackground {
  /** `upload:<id>`, or null for no picture. */
  image: string | null;
  dim: number;
}

export const DEFAULT_CARD_BACKGROUND: CardBackground = { image: null, dim: 30 };

const UPLOAD = /^upload:([A-Za-z0-9_-]{10,40})$/;

export const cardBackgroundRef = (id: string) => `upload:${id}`;

export function cardBackgroundId(image: string | null | undefined): string | null {
  const match = image ? UPLOAD.exec(image) : null;
  return match ? match[1] : null;
}

/** Where the editor loads the picture from. */
export function cardBackgroundUrl(image: string | null): string | null {
  const id = cardBackgroundId(image);
  return id ? `/api/profile/card-background/${id}` : null;
}

export function clampDim(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return DEFAULT_CARD_BACKGROUND.dim;
  return Math.min(100, Math.max(0, Math.round(n)));
}
