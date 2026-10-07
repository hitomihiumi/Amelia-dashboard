import "server-only";

import { prisma } from "@/lib/db/db";

/** The statistics window shown in the admin panel. */
export const STATS_DAYS = 30;

export type ServerStatus = "active" | "left" | "all";
export type ServerSort = "members" | "commands" | "messages" | "joined" | "name";

export interface ServerTotals {
  commands: number;
  components: number;
  messages: number;
  joins: number;
  leaves: number;
}

export interface DailyPoint extends ServerTotals {
  /** UTC midnight, ISO. */
  day: string;
}

export interface ServerRow {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  joinedAt: string | null;
  leftAt: string | null;
  totals: ServerTotals;
  /** Commands + messages per day, oldest first: the trend in the list. */
  trend: number[];
}

export interface ServersOverview {
  rows: ServerRow[];
  /** Matches before pagination. */
  total: number;
  page: number;
  pages: number;
  summary: {
    active: number;
    left: number;
    members: number;
    joined30: number;
    left30: number;
    totals: ServerTotals;
  };
  daily: DailyPoint[];
}

export interface ServersQuery {
  search?: string;
  status: ServerStatus;
  sort: ServerSort;
  page: number;
}

export const PAGE_SIZE = 20;

const EMPTY: ServerTotals = { commands: 0, components: 0, messages: 0, joins: 0, leaves: 0 };

/** UTC midnight, `daysAgo` days back. */
function dayStart(daysAgo: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
}

/** Every day of the window, oldest first, zero where nothing was recorded. */
function fillDays<T extends ServerTotals>(rows: (T & { day: Date })[]): DailyPoint[] {
  const byDay = new Map(rows.map((row) => [row.day.getTime(), row]));

  return Array.from({ length: STATS_DAYS }, (_, index) => {
    const day = dayStart(STATS_DAYS - 1 - index);
    const row = byDay.get(day.getTime());
    return {
      day: day.toISOString(),
      commands: row?.commands ?? 0,
      components: row?.components ?? 0,
      messages: row?.messages ?? 0,
      joins: row?.joins ?? 0,
      leaves: row?.leaves ?? 0,
    };
  });
}

const sum = (values: ServerTotals[]): ServerTotals =>
  values.reduce(
    (total, value) => ({
      commands: total.commands + value.commands,
      components: total.components + value.components,
      messages: total.messages + value.messages,
      joins: total.joins + value.joins,
      leaves: total.leaves + value.leaves,
    }),
    { ...EMPTY },
  );

export async function getServersOverview(query: ServersQuery): Promise<ServersOverview> {
  const since = dayStart(STATS_DAYS - 1);
  const needle = query.search?.trim().toLowerCase();

  const [presences, perGuild, perDay] = await Promise.all([
    prisma.guildPresence.findMany(),
    prisma.guildStat.groupBy({
      by: ["guildId"],
      where: { day: { gte: since } },
      _sum: { commands: true, components: true, messages: true, joins: true, leaves: true },
    }),
    prisma.guildStat.groupBy({
      by: ["day"],
      where: { day: { gte: since } },
      _sum: { commands: true, components: true, messages: true, joins: true, leaves: true },
    }),
  ]);

  const toTotals = (value: {
    commands: number | null;
    components: number | null;
    messages: number | null;
    joins: number | null;
    leaves: number | null;
  }): ServerTotals => ({
    commands: value.commands ?? 0,
    components: value.components ?? 0,
    messages: value.messages ?? 0,
    joins: value.joins ?? 0,
    leaves: value.leaves ?? 0,
  });

  const totalsByGuild = new Map(perGuild.map((row) => [row.guildId, toTotals(row._sum)]));

  const active = presences.filter((presence) => !presence.leftAt);
  const sinceMs = since.getTime();

  const matching = presences
    .filter((presence) => {
      if (query.status === "active" && presence.leftAt) return false;
      if (query.status === "left" && !presence.leftAt) return false;
      if (!needle) return true;
      return presence.name.toLowerCase().includes(needle) || presence.id.includes(needle);
    })
    .map((presence) => ({ presence, totals: totalsByGuild.get(presence.id) ?? EMPTY }));

  const ordered = matching.sort((a, b) => {
    switch (query.sort) {
      case "commands":
        return b.totals.commands - a.totals.commands;
      case "messages":
        return b.totals.messages - a.totals.messages;
      case "joined":
        return (b.presence.joinedAt?.getTime() ?? 0) - (a.presence.joinedAt?.getTime() ?? 0);
      case "name":
        return a.presence.name.localeCompare(b.presence.name);
      default:
        return b.presence.memberCount - a.presence.memberCount;
    }
  });

  const pages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page), pages);
  const slice = ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Trends are only needed for the rows that are on screen.
  const trendRows = slice.length
    ? await prisma.guildStat.findMany({
        where: { guildId: { in: slice.map((item) => item.presence.id) }, day: { gte: since } },
        select: { guildId: true, day: true, commands: true, messages: true },
      })
    : [];

  const trends = new Map<string, number[]>();
  for (const { presence } of slice) trends.set(presence.id, Array(STATS_DAYS).fill(0));
  for (const row of trendRows) {
    const index = Math.round((row.day.getTime() - sinceMs) / 86_400_000);
    const series = trends.get(row.guildId);
    if (series && index >= 0 && index < STATS_DAYS) series[index] += row.commands + row.messages;
  }

  const daily = fillDays(perDay.map((row) => ({ day: row.day, ...toTotals(row._sum) })));

  return {
    rows: slice.map(({ presence, totals }) => ({
      id: presence.id,
      name: presence.name,
      icon: presence.icon,
      memberCount: presence.memberCount,
      joinedAt: presence.joinedAt?.toISOString() ?? null,
      leftAt: presence.leftAt?.toISOString() ?? null,
      totals,
      trend: trends.get(presence.id) ?? [],
    })),
    total: ordered.length,
    page,
    pages,
    summary: {
      active: active.length,
      left: presences.length - active.length,
      members: active.reduce((total, presence) => total + presence.memberCount, 0),
      joined30: presences.filter((presence) => (presence.joinedAt?.getTime() ?? 0) >= sinceMs)
        .length,
      left30: presences.filter((presence) => (presence.leftAt?.getTime() ?? 0) >= sinceMs).length,
      totals: sum(daily),
    },
    daily,
  };
}

export interface ServerModule {
  key: "levels" | "jtc" | "counters" | "findTeam" | "audit" | "automod" | "economy";
  enabled: boolean;
}

export interface ServerDetail {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string | null;
  memberCount: number;
  locale: string | null;
  boostTier: number;
  joinedAt: string | null;
  leftAt: string | null;
  /** Settings of the server in the bot's database; null when it never configured anything. */
  config: { language: string; prefix: string; modules: ServerModule[] } | null;
  trackedUsers: number;
  moderationCases30: number;
  totals: ServerTotals;
  daily: DailyPoint[];
  topCommands: { name: string; count: number }[];
}

export async function getServerDetail(id: string): Promise<ServerDetail | null> {
  const presence = await prisma.guildPresence.findUnique({ where: { id } });
  if (!presence) return null;

  const since = dayStart(STATS_DAYS - 1);

  const [stats, commands, guild, trackedUsers, moderationCases30] = await Promise.all([
    prisma.guildStat.findMany({ where: { guildId: id, day: { gte: since } } }),
    prisma.commandStat.groupBy({
      by: ["name"],
      where: { guildId: id, day: { gte: since } },
      _sum: { count: true },
      orderBy: { _sum: { count: "desc" } },
      take: 10,
    }),
    prisma.guild.findUnique({
      where: { id },
      select: {
        language: true,
        prefix: true,
        levelsEnabled: true,
        jtcEnabled: true,
        counterEnabled: true,
        findTeamEnabled: true,
        auditEnabled: true,
        inviteEnabled: true,
        linksEnabled: true,
        workEnabled: true,
        timelyEnabled: true,
        dailyEnabled: true,
        weeklyEnabled: true,
      },
    }),
    prisma.user.count({ where: { guildId: id } }),
    prisma.moderationCase.count({ where: { guildId: id, createdAt: { gte: since } } }),
  ]);

  const daily = fillDays(stats);

  return {
    id: presence.id,
    name: presence.name,
    icon: presence.icon,
    ownerId: presence.ownerId,
    memberCount: presence.memberCount,
    locale: presence.locale,
    boostTier: presence.boostTier,
    joinedAt: presence.joinedAt?.toISOString() ?? null,
    leftAt: presence.leftAt?.toISOString() ?? null,
    config: guild
      ? {
          language: guild.language,
          prefix: guild.prefix,
          modules: [
            { key: "levels", enabled: guild.levelsEnabled },
            { key: "jtc", enabled: guild.jtcEnabled },
            { key: "counters", enabled: guild.counterEnabled },
            { key: "findTeam", enabled: guild.findTeamEnabled },
            { key: "audit", enabled: guild.auditEnabled },
            { key: "automod", enabled: guild.inviteEnabled || guild.linksEnabled },
            {
              key: "economy",
              enabled:
                guild.workEnabled ||
                guild.timelyEnabled ||
                guild.dailyEnabled ||
                guild.weeklyEnabled,
            },
          ],
        }
      : null,
    trackedUsers,
    moderationCases30,
    totals: sum(daily),
    daily,
    topCommands: commands.map((row) => ({ name: row.name, count: row._sum.count ?? 0 })),
  };
}

/** Icon URL of a server, or null when it has none. */
export function guildIconUrl(id: string, icon: string | null, size = 64): string | null {
  if (!icon) return null;
  const ext = icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${id}/${icon}.${ext}?size=${size}`;
}
