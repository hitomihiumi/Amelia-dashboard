import {
  listBannerImages,
  requireGuildAdminResponse,
  storeBannerImage,
} from "@/lib/banners/imageStore";
import { BANNER_IMAGE_LIMITS, type BannerImagePurpose } from "@/lib/banners/images";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ guildId: string }> };

/** The pictures this server uploaded for its banners. */
export async function GET(req: Request, ctx: RouteCtx) {
  const { guildId } = await ctx.params;
  const denied = await requireGuildAdminResponse(guildId);
  if (denied) return denied;

  const purpose = new URL(req.url).searchParams.get("purpose");
  return NextResponse.json({
    ok: true,
    images: await listBannerImages(
      guildId,
      purpose === "background" || purpose === "layer" ? purpose : undefined,
    ),
  });
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
  let purpose: BannerImagePurpose = "layer";
  try {
    const form = await req.formData();
    file = form.get("file");
    if (form.get("purpose") === "background") purpose = "background";
  } catch {
    return NextResponse.json({ ok: false, error: "notAPicture" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "notAPicture" }, { status: 400 });
  }

  const result = await storeBannerImage(
    guildId,
    file.name,
    Buffer.from(await file.arrayBuffer()),
    purpose,
  );
  if (!result.ok) {
    const status = result.error === "tooBig" ? 413 : result.error === "tooMany" ? 409 : 415;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, image: result.image });
}
