import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserDashboardGuilds } from "@/lib/discord/bot";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ ok: false, error: "Unknown DISCORD_CLIENT_ID" }, { status: 500 });
  }

  try {
    const guilds = await getUserDashboardGuilds(session.accessToken);

    return NextResponse.json({ ok: true, guilds });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
