import "server-only";

import { prisma } from "@/lib/db/db";
import { isGuildBanned, isGuildMember } from "@/lib/discord/rest";
import type { ModerationSubmissionKind } from "@/lib/db/types";

export interface SubmissionAccess {
  allowed: boolean;
  isMember: boolean;
  isBanned: boolean;
  /** Present when access is denied; a key the page turns into a message. */
  reason: "not_member" | "not_related" | "bot_token_missing" | null;
}

/**
 * Decide whether a signed in user may open a submission form.
 *
 * Membership is resolved with the bot token instead of the visitor's OAuth
 * guild list on purpose: a banned user is no longer a member, and their guild
 * list would never contain the server they want to appeal to.
 */
export async function getSubmissionAccess(
  guildId: string,
  userId: string,
  kind: ModerationSubmissionKind,
): Promise<SubmissionAccess> {
  const [isMember, isBanned] = await Promise.all([
    isGuildMember(guildId, userId),
    // The ban check only matters for appeals, and it costs an extra request.
    kind === "appeal" ? isGuildBanned(guildId, userId) : Promise.resolve(false),
  ]);

  if (kind === "report") {
    return {
      allowed: isMember,
      isMember,
      isBanned: false,
      reason: isMember ? null : "not_member",
    };
  }

  if (isMember || isBanned) {
    return { allowed: true, isMember, isBanned, reason: null };
  }

  // Kicked or previously punished users keep the right to appeal.
  const relatedCases = await prisma.moderationCase.count({
    where: { guildId, targetId: userId },
  });

  return {
    allowed: relatedCases > 0,
    isMember,
    isBanned,
    reason: relatedCases > 0 ? null : "not_related",
  };
}
