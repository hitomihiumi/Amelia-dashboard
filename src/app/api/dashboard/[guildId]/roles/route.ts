import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import { verifyUserIsGuildAdministrator } from "@/lib/discord/guilds-api";

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
    const roles = await fetchGuildRoles(session.accessToken, guildId);
    return NextResponse.json({ ok: true, roles });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
