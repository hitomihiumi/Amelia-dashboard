import "server-only";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/db";
import { verifyUserIsGuildAdministrator } from "@/lib/discord/guilds-api";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { processImage } from "@/lib/images/process";
import { BANNER_HEIGHT, BANNER_WIDTH } from "@/lib/db/types";
import { BANNER_IMAGE_LIMITS, type BannerImageInfo, type BannerImagePurpose } from "./images";

/** Turns the caller away unless they administer the server. Returns null when they may go on. */
export async function requireGuildAdminResponse(guildId: string): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ ok: false, error: "Authorization required" }, { status: 401 });
  }
  try {
    if (!(await verifyUserIsGuildAdministrator(session.accessToken, guildId))) {
      return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Cannot verify permissions" }, { status: 502 });
  }
  return null;
}

const SELECT = {
  id: true,
  name: true,
  size: true,
  width: true,
  height: true,
  purpose: true,
} as const;

export async function listBannerImages(
  guildId: string,
  purpose?: BannerImagePurpose,
): Promise<BannerImageInfo[]> {
  const rows = await prisma.bannerImage.findMany({
    where: { guildId, ...(purpose ? { purpose } : {}) },
    select: SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    ...row,
    purpose: row.purpose === "background" ? "background" : "layer",
  }));
}

export type StoreResult =
  | { ok: true; image: BannerImageInfo }
  | { ok: false; error: "tooBig" | "tooMany" | "notAPicture" };

/**
 * Checks and stores an uploaded picture, made to fit the banner: a background is cut to exactly
 * the size of the banner (the part that hangs over is cropped around the centre), a picture
 * element is scaled down to fit inside the banner.
 */
export async function storeBannerImage(
  guildId: string,
  fileName: string,
  bytes: Buffer,
  purpose: BannerImagePurpose,
): Promise<StoreResult> {
  if ((await prisma.bannerImage.count({ where: { guildId } })) >= BANNER_IMAGE_LIMITS.maxCount) {
    return { ok: false, error: "tooMany" };
  }

  const picture = await processImage(bytes, {
    kind: purpose === "background" ? "cover" : "inside",
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
  });
  if (!picture.ok) return picture;

  // The row belongs to the server, which exists in the database as soon as the bot has seen it.
  await prisma.guild.upsert({ where: { id: guildId }, update: {}, create: { id: guildId } });

  const image = await prisma.bannerImage.create({
    data: {
      guildId,
      name:
        fileName
          .replace(/[\u0000-\u001f]/g, "")
          .trim()
          .slice(0, 100) || "image",
      mime: "image/webp",
      size: picture.size,
      width: picture.width,
      height: picture.height,
      purpose,
      data: new Uint8Array(picture.data),
    },
    select: SELECT,
  });
  return { ok: true, image: { ...image, purpose } };
}
