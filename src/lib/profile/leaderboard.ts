import "server-only";
import { prisma } from "@/lib/db/db";

/** The three boards of the bot's `/leaderboard` command. */
export const LEADERBOARD_SORTS = ["level", "voice", "coins"] as const;
export type LeaderboardSort = (typeof LEADERBOARD_SORTS)[number];

/** Rows per page, the same as in the bot. */
export const LEADERBOARD_PAGE_SIZE = 10;

export function parseSort(value: string | string[] | undefined): LeaderboardSort {
  const raw = Array.isArray(value) ? value[0] : value;
  return LEADERBOARD_SORTS.find((sort) => sort === raw) ?? "level";
}

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export interface LeaderboardEntry {
  userId: string;
  /** 1-based place on this board. */
  position: number;
  level: number;
  xp: number;
  totalXp: number;
  voiceTime: number;
  wallet: number;
  bank: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  pages: number;
  /** Place of the viewer on this board, `null` while they have no row on the server. */
  viewerPosition: number | null;
}

const SELECT = {
  userId: true,
  level: true,
  xp: true,
  totalXp: true,
  voiceTime: true,
  wallet: true,
  bank: true,
} as const;

/**
 * One page of a server's leaderboard, ordered like the bot orders it: by total XP, by voice time
 * or by wallet + bank. Ties are broken by member id so pages never shuffle between requests.
 */
export async function getLeaderboard(
  guildId: string,
  sort: LeaderboardSort,
  requestedPage: number,
  viewerId: string,
): Promise<Leaderboard> {
  const where = { guildId };
  const total = await prisma.user.count({ where });
  const pages = Math.max(1, Math.ceil(total / LEADERBOARD_PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  const skip = (page - 1) * LEADERBOARD_PAGE_SIZE;

  const withPosition = (rows: Omit<LeaderboardEntry, "position">[]): LeaderboardEntry[] =>
    rows.map((row, index) => ({ ...row, position: skip + index + 1 }));

  if (sort === "coins") {
    // wallet + bank is not a column, so the guild is ranked in memory, like in the bot.
    const rows = await prisma.user.findMany({ where, select: SELECT });
    rows.sort(
      (a, b) =>
        b.wallet + b.bank - (a.wallet + a.bank) ||
        (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0),
    );
    const viewerIndex = rows.findIndex((row) => row.userId === viewerId);
    return {
      entries: withPosition(rows.slice(skip, skip + LEADERBOARD_PAGE_SIZE)),
      total,
      page,
      pages,
      viewerPosition: viewerIndex === -1 ? null : viewerIndex + 1,
    };
  }

  const column = sort === "voice" ? "voiceTime" : "totalXp";
  const [rows, viewer] = await Promise.all([
    prisma.user.findMany({
      where,
      select: SELECT,
      orderBy: [{ [column]: "desc" }, { userId: "asc" }],
      skip,
      take: LEADERBOARD_PAGE_SIZE,
    }),
    prisma.user.findFirst({ where: { guildId, userId: viewerId }, select: SELECT }),
  ]);

  let viewerPosition: number | null = null;
  if (viewer) {
    const ahead = await prisma.user.count({
      where: {
        guildId,
        OR: [
          { [column]: { gt: viewer[column] } },
          { [column]: viewer[column], userId: { lt: viewer.userId } },
        ],
      },
    });
    viewerPosition = ahead + 1;
  }

  return { entries: withPosition(rows), total, page, pages, viewerPosition };
}
