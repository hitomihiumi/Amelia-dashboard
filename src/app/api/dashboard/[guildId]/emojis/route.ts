import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { fetchGuildEmojisWithBotToken } from "@/lib/discord/emojis-api";
import { verifyUserIsGuildAdministrator } from "@/lib/discord/guilds-api";

type RouteCtx = { params: Promise<{ guildId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { guildId } = await ctx.params;
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ ok: false, error: "Authorization required" }, { status: 401 });
  }

  const allowed = await verifyUserIsGuildAdministrator(session.accessToken, guildId);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "DISCORD_BOT_TOKEN is not configured",
      },
      { status: 503 },
    );
  }

  try {
    const emojis = await fetchGuildEmojisWithBotToken(token.trim(), guildId);
    return NextResponse.json({ ok: true, emojis });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
