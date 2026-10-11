import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/db";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

const ID = /^[A-Za-z0-9_-]{10,40}$/;

/** The picture itself, for the editor's preview. Only its owner gets it. */
export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Authorization required" }, { status: 401 });
  }
  if (!ID.test(id)) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const row = await prisma.cardBackground.findFirst({
    where: { id, userId },
    select: { data: true, mime: true },
  });
  if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime,
      // A picture never changes under its id.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
