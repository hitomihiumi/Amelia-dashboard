"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/db";
import { getT } from "@/i18n/server";
import { INT32_MAX, resolveSpin, type SlotOutcome, type SlotSymbol } from "@/lib/slots/config";
import { drawReels } from "@/lib/slots/engine";
import { SNOWFLAKE, findMemberGuild } from "@/lib/slots/access";

export type SpinErrorCode =
  | "notSignedIn"
  | "sessionExpired"
  | "invalidServer"
  | "notMember"
  | "disabled"
  | "invalidBet"
  | "betRange"
  | "insufficient"
  | "cooldown"
  | "balanceTooHigh"
  | "generic";

export type SpinResponse =
  | {
      ok: true;
      reels: SlotSymbol[];
      outcome: SlotOutcome;
      multiplier: number;
      /** Coins paid out in total. The bet is already spent, so the net is `payout - bet`. */
      payout: number;
      bet: number;
      /** The balance after the spin. */
      wallet: number;
      /** Reel indexes that make up the win. */
      winning: number[];
    }
  | {
      ok: false;
      code: SpinErrorCode;
      error: string;
      /** For `cooldown`: milliseconds until the next spin is allowed. */
      retryAfterMs?: number;
      /** The balance at the time of the refusal, when it is known. */
      wallet?: number;
    };

/**
 * One spin of the slot machine, played with the member's own balance on one server.
 *
 * Everything that matters happens here: the browser only asks for a spin and plays an animation
 * of the answer. The reels are drawn with a secure random generator, and the bet, the payout and
 * the pause between spins are applied in a single conditional UPDATE, so two spins sent at the
 * same moment cannot spend the same coins or skip the pause.
 *
 * Virtual server currency only. Nothing here touches real money.
 */
export async function spinSlots(guildId: string, bet: number): Promise<SpinResponse> {
  const t = await getT();
  const fail = (
    code: SpinErrorCode,
    params?: Record<string, string | number>,
    extra?: { retryAfterMs?: number; wallet?: number },
  ): SpinResponse => ({
    ok: false,
    code,
    error: t(`slots.errors.${code}`, params),
    ...extra,
  });

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return fail("notSignedIn");
    if (!session.accessToken || session.error === "RefreshAccessTokenError") {
      return fail("sessionExpired");
    }

    if (typeof guildId !== "string" || !SNOWFLAKE.test(guildId)) return fail("invalidServer");
    if (typeof bet !== "number" || !Number.isSafeInteger(bet)) return fail("invalidBet");

    // Only servers the member really is on.
    const member = await findMemberGuild(session.accessToken, guildId);
    if (!member) return fail("notMember");

    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: {
        slotsEnabled: true,
        slotsMinBet: true,
        slotsMaxBet: true,
        slotsCooldown: true,
      },
    });
    if (!guild) return fail("invalidServer");
    if (!guild.slotsEnabled) return fail("disabled");

    if (bet < guild.slotsMinBet || bet > guild.slotsMaxBet) {
      return fail("betRange", { min: guild.slotsMinBet, max: guild.slotsMaxBet });
    }

    // The draw does not depend on anything the member sends, only the bet scales the payout.
    const reels = drawReels();
    const result = resolveSpin(reels, bet);
    const net = result.payout - bet;

    const now = new Date();
    const cooldownMs = guild.slotsCooldown * 1000;
    const cutoff = new Date(now.getTime() - cooldownMs);
    // The balance is a 32-bit integer: refuse a spin whose payout would not fit.
    const headroom = net > 0 ? INT32_MAX - net : INT32_MAX;

    const wallet = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          userId,
          guildId,
          wallet: { gte: bet, lte: headroom },
          OR: [{ slotsTimeout: null }, { slotsTimeout: { lte: cutoff } }],
        },
        data: { wallet: { increment: net }, slotsTimeout: now },
      });

      const row = await tx.user.findUnique({
        where: { userId_guildId: { userId, guildId } },
        select: { wallet: true, slotsTimeout: true },
      });
      return { applied: updated.count === 1, row };
    });

    if (!wallet.applied) {
      const row = wallet.row;
      if (!row || row.wallet < bet) {
        return fail("insufficient", undefined, { wallet: row?.wallet ?? 0 });
      }
      if (row.wallet > headroom) {
        return fail("balanceTooHigh", undefined, { wallet: row.wallet });
      }
      const retryAfterMs = Math.max(
        1000,
        (row.slotsTimeout?.getTime() ?? now.getTime()) + cooldownMs - now.getTime(),
      );
      return fail(
        "cooldown",
        { seconds: Math.ceil(retryAfterMs / 1000) },
        {
          retryAfterMs,
          wallet: row.wallet,
        },
      );
    }

    return {
      ok: true,
      reels,
      outcome: result.outcome,
      multiplier: result.multiplier,
      payout: result.payout,
      bet,
      wallet: wallet.row?.wallet ?? 0,
      winning: result.winning,
    };
  } catch (error) {
    console.error("[Slots Spin Error]:", error);
    return fail("generic");
  }
}
