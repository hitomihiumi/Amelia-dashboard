"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/db";
import { getT } from "@/i18n/server";
import {
  INT32_MAX,
  evaluateGrid,
  isLineMode,
  isReelCount,
  type ReelCount,
  type LineWin,
  type SlotGrid,
} from "@/lib/slots/config";
import { drawGrid } from "@/lib/slots/engine";
import { SNOWFLAKE, findMemberGuild } from "@/lib/slots/access";

export type SpinErrorCode =
  | "notSignedIn"
  | "sessionExpired"
  | "invalidServer"
  | "notMember"
  | "disabled"
  | "invalidBet"
  | "invalidLines"
  | "invalidReels"
  | "betRange"
  | "insufficient"
  | "cooldown"
  | "balanceTooHigh"
  | "busy"
  | "generic";

/** Free spins a member has won and still has to play. */
export interface FreeSpinState {
  left: number;
  /** Bet on one line, the same for the whole round. */
  perLine: number;
  lines: number;
  reels: ReelCount;
  /** What the round has paid so far. */
  won: number;
}

export type SpinResponse =
  | {
      ok: true;
      /** The symbols the reels stop on, `grid[reel][row]`. */
      grid: SlotGrid;
      wins: LineWin[];
      /** Cells that are part of a win, `[reel, row]`. */
      cells: [number, number][];
      /** Coins paid out by the lines in total. */
      payout: number;
      /** Coins taken for this spin, 0 for a free spin. */
      bet: number;
      perLine: number;
      lines: number;
      reels: ReelCount;
      /** The balance after the spin. */
      wallet: number;
      /** This spin was a free one. */
      free: boolean;
      /** Free spins this spin has won. */
      freeAwarded: number;
      /** Free spins that are left after this spin, `null` when there are none. */
      freeState: FreeSpinState | null;
      /** A free spin round ended with this spin and paid this much in total. */
      freeRoundTotal: number | null;
      scatters: number;
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
 * of the answer. The cells are drawn with a secure random generator, and the bet, the payout, the
 * free spins and the pause between spins are applied in a single conditional UPDATE, so two spins
 * sent at the same moment cannot spend the same coins, play the same free spin or skip the pause.
 *
 * While the member has free spins left, every call plays one of them at the bet and lines the round
 * started with, whatever the browser sends.
 *
 * Virtual server currency only. Nothing here touches real money.
 */
export async function spinSlots(
  guildId: string,
  perLine: number,
  lines: number,
  reels: number,
): Promise<SpinResponse> {
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

    // Only servers the member really is on.
    const member = await findMemberGuild(session.accessToken, guildId);
    if (!member) return fail("notMember");

    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { slotsEnabled: true, slotsMinBet: true, slotsMaxBet: true, slotsCooldown: true },
    });
    if (!guild) return fail("invalidServer");
    if (!guild.slotsEnabled) return fail("disabled");

    const current = await prisma.user.findUnique({
      where: { userId_guildId: { userId, guildId } },
      select: {
        wallet: true,
        slotsTimeout: true,
        slotsFreeSpins: true,
        slotsFreeBet: true,
        slotsFreeLines: true,
        slotsFreeReels: true,
        slotsFreeWon: true,
      },
    });

    const free = (current?.slotsFreeSpins ?? 0) > 0;
    const playPerLine = free ? (current?.slotsFreeBet ?? 0) : perLine;
    const playLines = free ? (current?.slotsFreeLines ?? 1) : lines;
    const playReels = free ? (current?.slotsFreeReels ?? 3) : reels;

    if (!free) {
      if (typeof perLine !== "number" || !Number.isSafeInteger(perLine) || perLine < 1) {
        return fail("invalidBet");
      }
      if (!isLineMode(lines)) return fail("invalidLines");
      if (!isReelCount(reels)) return fail("invalidReels");
      const total = perLine * lines;
      if (total < guild.slotsMinBet || total > guild.slotsMaxBet) {
        return fail("betRange", { min: guild.slotsMinBet, max: guild.slotsMaxBet });
      }
    }

    const total = playPerLine * playLines;
    const bet = free ? 0 : total;

    // The draw does not depend on anything the member sends, only the bet scales the payout.
    const grid = drawGrid(playReels as ReelCount);
    const result = evaluateGrid(grid, playPerLine, playLines, free);
    const net = result.payout - bet;

    const now = new Date();
    const cooldownMs = guild.slotsCooldown * 1000;
    const cutoff = new Date(now.getTime() - cooldownMs);
    // The balance is a 32-bit integer: refuse a spin whose payout would not fit.
    const headroom = net > 0 ? INT32_MAX - net : INT32_MAX;

    const left = free
      ? (current?.slotsFreeSpins ?? 0) - 1 + result.freeSpinsAwarded
      : result.freeSpinsAwarded;
    const roundWon = free ? (current?.slotsFreeWon ?? 0) + result.payout : 0;

    const outcome = await prisma.$transaction(async (tx) => {
      const updated = free
        ? // A free spin: only if the round is exactly where it was read, so one call plays it once.
          await tx.user.updateMany({
            where: {
              userId,
              guildId,
              slotsFreeSpins: current?.slotsFreeSpins,
              slotsFreeWon: current?.slotsFreeWon,
              wallet: { lte: headroom },
            },
            data: {
              wallet: { increment: net },
              slotsFreeSpins: left,
              slotsFreeWon: left > 0 ? roundWon : 0,
            },
          })
        : await tx.user.updateMany({
            where: {
              userId,
              guildId,
              slotsFreeSpins: 0,
              wallet: { gte: bet, lte: headroom },
              OR: [{ slotsTimeout: null }, { slotsTimeout: { lte: cutoff } }],
            },
            data: {
              wallet: { increment: net },
              slotsTimeout: now,
              ...(left > 0
                ? {
                    slotsFreeSpins: left,
                    slotsFreeBet: playPerLine,
                    slotsFreeLines: playLines,
                    slotsFreeReels: playReels,
                    slotsFreeWon: 0,
                  }
                : {}),
            },
          });

      const row = await tx.user.findUnique({
        where: { userId_guildId: { userId, guildId } },
        select: { wallet: true, slotsTimeout: true, slotsFreeSpins: true },
      });
      return { applied: updated.count === 1, row };
    });

    if (!outcome.applied) {
      const row = outcome.row;
      if (free || (row?.slotsFreeSpins ?? 0) > 0)
        return fail("busy", undefined, { wallet: row?.wallet });
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
        { retryAfterMs, wallet: row.wallet },
      );
    }

    return {
      ok: true,
      grid,
      wins: result.wins,
      cells: result.cells,
      payout: result.payout,
      bet,
      perLine: playPerLine,
      lines: playLines,
      reels: playReels as ReelCount,
      wallet: outcome.row?.wallet ?? 0,
      free,
      freeAwarded: result.freeSpinsAwarded,
      freeState:
        left > 0
          ? {
              left,
              perLine: playPerLine,
              lines: playLines,
              reels: playReels as ReelCount,
              won: roundWon,
            }
          : null,
      freeRoundTotal: free && left === 0 ? roundWon : null,
      scatters: result.scatters,
    };
  } catch (error) {
    console.error("[Slots Spin Error]:", error);
    return fail("generic");
  }
}
