"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/db";
import { generateBalanceNumber } from "@/lib/db/wrappers/DBUser";
import { fetchDiscordUserGuilds } from "@/lib/discord/guilds-api";
import { getT } from "@/i18n/server";
import {
  BIO_MAX_LENGTH,
  CARD_KINDS,
  COLOR_KEYS,
  clampIconsPadding,
  isHexColor,
} from "@/lib/profile/appearance";
import type { CardColors, CardKind } from "@/components/profile/cards/types";
import { type CardBackground, cardBackgroundId, clampDim } from "@/lib/profile/cardBackground";
import { pruneCardBackgrounds } from "@/lib/profile/cardBackgroundStore";

/** One card of one server, as it is sent from the editor. */
export type CardPatch =
  | { kind: "rank"; solid: CardColors; background: CardBackground }
  | { kind: "level_up"; solid: CardColors; background: CardBackground }
  | {
      kind: "profile";
      solid: CardColors;
      background: CardBackground;
      bio: string;
      iconsPadding: number;
    };

export type SaveAppearanceResult = { ok: true; servers: number } | { ok: false; error: string };

const SNOWFLAKE = /^\d{17,20}$/;

function readColors(raw: unknown): CardColors | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const out: Partial<CardColors> = {};
  for (const key of COLOR_KEYS) {
    const value = source[key];
    if (!isHexColor(value)) return null;
    out[key] = value;
  }
  return out as CardColors;
}

/**
 * Saves the look of the member's own cards. `guildId` is one server, or `"all"` to copy the
 * cards to every server the member shares with the bot. Everything is checked again here: the
 * editor is only a convenience, a request can say anything.
 */
export async function saveAppearance(
  guildId: string,
  patches: CardPatch[],
): Promise<SaveAppearanceResult> {
  const t = await getT();
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!session?.accessToken || !userId) {
      return { ok: false, error: t("profile.errors.notSignedIn") };
    }

    if (guildId !== "all" && !SNOWFLAKE.test(guildId)) {
      return { ok: false, error: t("profile.errors.invalidServer") };
    }
    if (!Array.isArray(patches) || patches.length === 0 || patches.length > CARD_KINDS.length) {
      return { ok: false, error: t("profile.errors.nothingToSave") };
    }

    // Validate every patch and turn it into the columns it changes.
    const data: {
      rankSolid?: Prisma.InputJsonObject;
      rankUrl?: string | null;
      rankMode?: boolean;
      rankDim?: number;
      levelupSolid?: Prisma.InputJsonObject;
      levelupUrl?: string | null;
      levelupMode?: boolean;
      levelupDim?: number;
      profileSolid?: Prisma.InputJsonObject;
      profileUrl?: string | null;
      profileMode?: boolean;
      profileDim?: number;
      profileBio?: string;
      profileIconsPadding?: number;
    } = {};
    const seen = new Set<CardKind>();
    for (const patch of patches) {
      if (!patch || !CARD_KINDS.includes(patch.kind) || seen.has(patch.kind)) {
        return { ok: false, error: t("profile.errors.invalidCard") };
      }
      seen.add(patch.kind);

      const solid = readColors(patch.solid);
      if (!solid) return { ok: false, error: t("profile.errors.invalidColor") };

      // The colours are plain JSON in the database.
      const json: Prisma.InputJsonObject = { ...solid };

      // The picture must be one of the member's own for this very card.
      const image = patch.background?.image ?? null;
      if (image !== null) {
        const id = cardBackgroundId(image);
        const owned = id
          ? await prisma.cardBackground.findFirst({
              where: { id, userId, kind: patch.kind },
              select: { id: true },
            })
          : null;
        if (!owned) return { ok: false, error: t("profile.errors.invalidBackground") };
      }
      const background = {
        url: image,
        mode: image !== null,
        dim: clampDim(patch.background?.dim),
      };

      if (patch.kind === "rank") {
        data.rankSolid = json;
        data.rankUrl = background.url;
        data.rankMode = background.mode;
        data.rankDim = background.dim;
      } else if (patch.kind === "level_up") {
        data.levelupSolid = json;
        data.levelupUrl = background.url;
        data.levelupMode = background.mode;
        data.levelupDim = background.dim;
      } else {
        data.profileUrl = background.url;
        data.profileMode = background.mode;
        data.profileDim = background.dim;
        if (typeof patch.bio !== "string" || patch.bio.length > BIO_MAX_LENGTH) {
          return { ok: false, error: t("profile.errors.bioTooLong", { max: BIO_MAX_LENGTH }) };
        }
        if (
          typeof patch.iconsPadding !== "number" ||
          clampIconsPadding(patch.iconsPadding) !== patch.iconsPadding
        ) {
          return { ok: false, error: t("profile.errors.invalidPadding") };
        }
        data.profileSolid = json;
        data.profileBio = patch.bio;
        data.profileIconsPadding = patch.iconsPadding;
      }
    }

    // Only servers the member is really on and the bot is on, so a request cannot make rows
    // up for servers it has nothing to do with.
    const discordGuilds = await fetchDiscordUserGuilds(session.accessToken);
    const known = await prisma.guild.findMany({
      where: { id: { in: discordGuilds.map((g) => g.id) } },
      select: { id: true },
    });
    const allowed = known.map((g) => g.id);

    const targets = guildId === "all" ? allowed : allowed.filter((id) => id === guildId);
    if (targets.length === 0) return { ok: false, error: t("profile.errors.invalidServer") };

    await prisma.$transaction(
      targets.map((target) =>
        prisma.user.upsert({
          where: { userId_guildId: { userId, guildId: target } },
          update: data,
          create: {
            userId,
            guildId: target,
            balanceNumber: generateBalanceNumber(userId, target),
            ...data,
          },
        }),
      ),
    );

    // Pictures that no card uses any more are not kept.
    for (const kind of seen) await pruneCardBackgrounds(userId, kind);

    revalidatePath("/profile");
    revalidatePath("/profile/appearance");
    return { ok: true, servers: targets.length };
  } catch (error) {
    console.error("[Profile Appearance Action Error]:", error);
    return { ok: false, error: t("profile.errors.internal") };
  }
}
