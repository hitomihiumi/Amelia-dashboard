import {
  listBannerImages,
  requireGuildAdminResponse,
  storeBannerImage,
} from "@/lib/banners/imageStore";
import { BANNER_IMAGE_LIMITS } from "@/lib/banners/images";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ guildId: string }> };

/** The pictures this server uploaded for its banners. */
export async function GET(_req: Request, ctx: RouteCtx) {
  const { guildId } = await ctx.params;
  const denied = await requireGuildAdminResponse(guildId);
  if (denied) return denied;

  return NextResponse.json({ ok: true, images: await listBannerImages(guildId) });
}

/** Stores a picture sent as the `file` field of a multipart form. */
export async function POST(req: Request, ctx: RouteCtx) {
  const { guildId } = await ctx.params;
  const denied = await requireGuildAdminResponse(guildId);
  if (denied) return denied;

  // Refuse a body that is far too big before reading it.
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > BANNER_IMAGE_LIMITS.maxBytes + 100_000) {
    return NextResponse.json({ ok: false, error: "tooBig" }, { status: 413 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return NextResponse.json({ ok: false, error: "notAPicture" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "notAPicture" }, { status: 400 });
  }

  const result = await storeBannerImage(guildId, file.name, Buffer.from(await file.arrayBuffer()));
  if (!result.ok) {
    const status = result.error === "tooBig" ? 413 : result.error === "tooMany" ? 409 : 415;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, image: result.image });
}
