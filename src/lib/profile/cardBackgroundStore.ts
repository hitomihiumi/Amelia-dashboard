import "server-only";

import type { CardKind } from "@/components/profile/cards/types";
import { prisma } from "@/lib/db/db";
import { processImage } from "@/lib/images/process";
import { CARD_BACKGROUND_SIZES, cardBackgroundId, cardBackgroundRef } from "./cardBackground";

/** Pictures a member uploaded but has not saved onto a card yet; the oldest ones are dropped. */
const UNUSED_KEPT = 3;

export type StoreCardBackgroundResult =
  | { ok: true; image: string }
  | { ok: false; error: "tooBig" | "notAPicture" };

/**
 * Stores a picture for one card of a member, cut to exactly the size of that card: scaled until it
 * covers the card, with what hangs over cropped around the centre.
 */
export async function storeCardBackground(
  userId: string,
  kind: CardKind,
  bytes: Buffer,
): Promise<StoreCardBackgroundResult> {
  const size = CARD_BACKGROUND_SIZES[kind];
  const picture = await processImage(bytes, { kind: "cover", ...size });
  if (!picture.ok) return picture;

  const row = await prisma.cardBackground.create({
    data: {
      userId,
      kind,
      mime: "image/webp",
      size: picture.size,
      width: picture.width,
      height: picture.height,
      data: new Uint8Array(picture.data),
    },
    select: { id: true },
  });

  await pruneCardBackgrounds(userId, kind);
  return { ok: true, image: cardBackgroundRef(row.id) };
}

/**
 * Deletes the member's pictures of a card that no card of theirs uses, except the newest few
 * (they may be waiting in an editor to be saved).
 */
export async function pruneCardBackgrounds(userId: string, kind: CardKind): Promise<void> {
  const [rows, used] = await Promise.all([
    prisma.cardBackground.findMany({
      where: { userId, kind },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { userId },
      select: { rankUrl: true, profileUrl: true, levelupUrl: true },
    }),
  ]);

  const referenced = new Set(
    used.flatMap((row) => [row.rankUrl, row.profileUrl, row.levelupUrl]).map(cardBackgroundId),
  );
  const unused = rows.filter((row) => !referenced.has(row.id));
  const drop = unused.slice(UNUSED_KEPT).map((row) => row.id);
  if (drop.length > 0) {
    await prisma.cardBackground.deleteMany({ where: { id: { in: drop }, userId } });
  }
}
