import "server-only";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/db";
import { verifyUserIsGuildAdministrator } from "@/lib/discord/guilds-api";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { BANNER_IMAGE_LIMITS, type BannerImageInfo } from "./images";

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

const SELECT = { id: true, name: true, size: true, width: true, height: true } as const;

export async function listBannerImages(guildId: string): Promise<BannerImageInfo[]> {
  return prisma.bannerImage.findMany({
    where: { guildId },
    select: SELECT,
    orderBy: { createdAt: "desc" },
  });
}

export type StoreResult =
  | { ok: true; image: BannerImageInfo }
  | { ok: false; error: "tooBig" | "tooMany" | "notAPicture" };

/**
 * Checks and stores an uploaded picture. It is decoded and written again as WebP no larger than
 * `maxSide` pixels, so only real pictures are kept (a file that merely claims to be one is
 * refused) and nothing but pixels survives: no scripts, no metadata.
 */
export async function storeBannerImage(
  guildId: string,
  fileName: string,
  bytes: Buffer,
): Promise<StoreResult> {
  if (bytes.byteLength > BANNER_IMAGE_LIMITS.maxBytes) return { ok: false, error: "tooBig" };

  if ((await prisma.bannerImage.count({ where: { guildId } })) >= BANNER_IMAGE_LIMITS.maxCount) {
    return { ok: false, error: "tooMany" };
  }

  let output: { data: Buffer; info: sharp.OutputInfo };
  try {
    const source = sharp(bytes, { limitInputPixels: 50_000_000 });
    const meta = await source.metadata();
    if (!meta.format || !["png", "jpeg", "webp", "gif"].includes(meta.format)) {
      return { ok: false, error: "notAPicture" };
    }
    output = await source
      .rotate()
      .resize({
        width: BANNER_IMAGE_LIMITS.maxSide,
        height: BANNER_IMAGE_LIMITS.maxSide,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { ok: false, error: "notAPicture" };
  }

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
      size: output.info.size,
      width: output.info.width,
      height: output.info.height,
      data: new Uint8Array(output.data),
    },
    select: SELECT,
  });
  return { ok: true, image };
}
