import "server-only";
import type { Session } from "next-auth";
import { prisma } from "@/lib/db/db";
import { guildIconUrl } from "@/lib/discord/guilds-api";
import { SNOWFLAKE, findMemberGuild } from "@/lib/slots/access";

export type ServerAccess =
  | { status: "ok"; id: string; name: string; iconUrl: string | null }
  | { status: "session" | "error" | "notFound" };

/**
 * Whether the signed in member may open the pages of a server: they are on it AND Amelia is on it.
 * Everything under `/profile/[guildId]` goes through this.
 */
export async function getServerAccess(session: Session, guildId: string): Promise<ServerAccess> {
  if (!SNOWFLAKE.test(guildId)) return { status: "notFound" };
  if (!session.accessToken || session.error === "RefreshAccessTokenError") {
    return { status: "session" };
  }

  try {
    const member = await findMemberGuild(session.accessToken, guildId);
    if (!member) return { status: "notFound" };

    const guild = await prisma.guild.findUnique({ where: { id: guildId }, select: { id: true } });
    if (!guild) return { status: "notFound" };

    return {
      status: "ok",
      id: member.id,
      name: member.name,
      iconUrl: guildIconUrl(member.id, member.icon),
    };
  } catch (error) {
    console.error("[Profile] Could not check the server:", error);
    return { status: "error" };
  }
}
