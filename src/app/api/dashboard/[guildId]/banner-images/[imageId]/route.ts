import { requireGuildAdminResponse } from "@/lib/banners/imageStore";
import { usedUploads } from "@/lib/banners/images";
import { normalizeBannerSettings } from "@/lib/banners/normalize";
import { prisma } from "@/lib/db/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ guildId: string; imageId: string }> };

const ID = /^[A-Za-z0-9_-]{10,40}$/;

/** The picture itself, for the editor's preview. Only administrators of the server get it. */
export async function GET(_req: Request, ctx: RouteCtx) {
  const { guildId, imageId } = await ctx.params;
  const denied = await requireGuildAdminResponse(guildId);
  if (denied) return denied;
  if (!ID.test(imageId))
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const image = await prisma.bannerImage.findFirst({
    where: { id: imageId, guildId },
    select: { data: true, mime: true },
  });
  if (!image) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mime,
      // A picture never changes under its id.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

/** Deletes a picture, unless a saved banner still uses it. */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { guildId, imageId } = await ctx.params;
  const denied = await requireGuildAdminResponse(guildId);
  if (denied) return denied;
  if (!ID.test(imageId))
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { bannerItems: true },
  });
  const banners = normalizeBannerSettings({ items: guild?.bannerItems }).items;
  if (usedUploads(banners).has(imageId)) {
    return NextResponse.json({ ok: false, error: "inUse" }, { status: 409 });
  }

  const { count } = await prisma.bannerImage.deleteMany({ where: { id: imageId, guildId } });
  if (count === 0) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
