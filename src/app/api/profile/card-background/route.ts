import { authOptions } from "@/lib/auth";
import { CARD_KINDS } from "@/lib/profile/appearance";
import { CARD_BACKGROUND_MAX_BYTES } from "@/lib/profile/cardBackground";
import { storeCardBackground } from "@/lib/profile/cardBackgroundStore";
import type { CardKind } from "@/components/profile/cards/types";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Stores a picture for one card of the signed-in member (`file` and `kind` of a multipart form). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Authorization required" }, { status: 401 });
  }

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > CARD_BACKGROUND_MAX_BYTES + 100_000) {
    return NextResponse.json({ ok: false, error: "tooBig" }, { status: 413 });
  }

  let file: FormDataEntryValue | null;
  let kind: FormDataEntryValue | null;
  try {
    const form = await req.formData();
    file = form.get("file");
    kind = form.get("kind");
  } catch {
    return NextResponse.json({ ok: false, error: "notAPicture" }, { status: 400 });
  }
  if (
    !(file instanceof File) ||
    typeof kind !== "string" ||
    !CARD_KINDS.includes(kind as CardKind)
  ) {
    return NextResponse.json({ ok: false, error: "notAPicture" }, { status: 400 });
  }

  const result = await storeCardBackground(
    userId,
    kind as CardKind,
    Buffer.from(await file.arrayBuffer()),
  );
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.error === "tooBig" ? 413 : 415 },
    );
  }
  return NextResponse.json({ ok: true, image: result.image });
}
