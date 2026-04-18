import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { verifyUserIsGuildAdministrator } from "@/lib/discord/guilds-api";
import { fetchGuildTextVoiceAndCategories } from "@/lib/discord/channels-api";

type RouteCtx = { params: Promise<{ guildId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { guildId } = await ctx.params;
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ ok: false, error: "Authentication failed" }, { status: 401 });
  }

  const allowed = await verifyUserIsGuildAdministrator(session.accessToken, guildId);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
  }

  try {
    const { textChannels, voiceChannels, categories } = await fetchGuildTextVoiceAndCategories(
      session.accessToken,
      guildId,
    );
    return NextResponse.json({
      ok: true,
      channels: textChannels,
      textChannels,
      voiceChannels,
      categories,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
