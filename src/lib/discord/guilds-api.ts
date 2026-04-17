import type { DiscordPartialGuild, UserGuildCard } from "@/types/discord";

const DISCORD_API = "https://discord.com/api/v10";

const GUILD_LIST_CACHE_TTL_MS = 45_000;
type GuildListCacheEntry = { expires: number; data: DiscordPartialGuild[] };
const globalForDiscord = globalThis as unknown as {
  guildListCache?: Map<string, GuildListCacheEntry>;
  inFlightGuilds?: Map<string, Promise<DiscordPartialGuild[]>>;
};

const guildListCache =
  globalForDiscord.guildListCache ??
  (globalForDiscord.guildListCache = new Map<string, GuildListCacheEntry>());

const inFlightGuilds =
  globalForDiscord.inFlightGuilds ??
  (globalForDiscord.inFlightGuilds = new Map<string, Promise<DiscordPartialGuild[]>>());

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchDiscordUserGuildsOnce(accessToken: string): Promise<Response> {
  return fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "AmeliaDashboard/1.0",
    },
    cache: "no-store",
  });
}

export async function fetchDiscordUserGuildsWithRetry(
  accessToken: string,
): Promise<DiscordPartialGuild[]> {
  const maxRetries = 3;
  const maxWaitSec = 5;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetchDiscordUserGuildsOnce(accessToken);

    if (res.status === 429) {
      let waitSec = 1;
      const header = res.headers.get("retry-after");
      if (header) {
        waitSec = Number(header);
      } else {
        try {
          const j = (await res.json()) as { retry_after?: number };
          if (typeof j.retry_after === "number") {
            waitSec = j.retry_after;
          }
        } catch {
          waitSec = 1;
        }
      }

      if (waitSec > maxWaitSec || attempt >= maxRetries) {
        throw new Error("discord_rate_limit");
      }

      await sleep(Math.ceil(waitSec * 1000) + 150);
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Discord API ${res.status}: ${body.slice(0, 200)}`);
    }

    return res.json() as Promise<DiscordPartialGuild[]>;
  }

  throw new Error("Discord API: max retries exceeded");
}

export async function fetchDiscordUserGuilds(accessToken: string): Promise<DiscordPartialGuild[]> {
  const now = Date.now();
  const hit = guildListCache.get(accessToken);
  if (hit && hit.expires > now) {
    return hit.data;
  }

  let p = inFlightGuilds.get(accessToken);
  if (p) return p;

  p = fetchDiscordUserGuildsWithRetry(accessToken)
    .then((data) => {
      guildListCache.set(accessToken, {
        expires: Date.now() + GUILD_LIST_CACHE_TTL_MS,
        data,
      });
      return data;
    })
    .finally(() => {
      inFlightGuilds.delete(accessToken);
    });
  inFlightGuilds.set(accessToken, p);
  return p;
}

export function guildIconUrl(guildId: string, iconHash: string | null): string | null {
  if (!iconHash) return null;
  const ext = iconHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}`;
}

export function buildBotInviteUrl(guildId: string, clientId: string, permissions: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    guild_id: guildId,
    permissions,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function mergeGuildsWithBotPresence(
  discordGuilds: DiscordPartialGuild[],
  botGuildIds: Set<string>,
  clientId: string,
  invitePermissions: string,
): UserGuildCard[] {
  return discordGuilds
    .filter((g) => hasGuildManageAccess(g.permissions, g.owner))
    .map((g) => {
      const botPresent = botGuildIds.has(g.id);
      return {
        id: g.id,
        name: g.name,
        iconUrl: guildIconUrl(g.id, g.icon),
        botPresent,
        inviteUrl: botPresent ? null : buildBotInviteUrl(g.id, clientId, invitePermissions),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

const ZERO = BigInt(0);

export const PERMISSION_ADMINISTRATOR = BigInt(8);
export const PERMISSION_MANAGE_GUILD = BigInt(32);

export function hasGuildManageAccess(permissions: string, isOwner: boolean): boolean {
  if (isOwner) return true;
  const p = BigInt(permissions);
  return (p & PERMISSION_ADMINISTRATOR) !== ZERO || (p & PERMISSION_MANAGE_GUILD) !== ZERO;
}

export function hasGuildAdministratorAccess(permissions: string, isOwner: boolean): boolean {
  if (isOwner) return true;
  const p = BigInt(permissions);
  return (p & PERMISSION_ADMINISTRATOR) !== ZERO;
}

function guildIconUrlFromGuild(id: string, icon: string | null): string | null {
  if (!icon) return null;
  const ext = icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${id}/${icon}.${ext}`;
}

export async function getGuildAccessForDashboard(
  accessToken: string,
  guildId: string,
): Promise<{
  allowed: boolean;
  guildName: string | null;
  guildIconUrl: string | null;
}> {
  const guilds = await fetchDiscordUserGuilds(accessToken);
  const g = guilds.find((x) => x.id === guildId);
  if (!g) return { allowed: false, guildName: null, guildIconUrl: null };
  return {
    allowed: hasGuildAdministratorAccess(g.permissions, g.owner),
    guildName: g.name,
    guildIconUrl: guildIconUrlFromGuild(g.id, g.icon),
  };
}

export async function verifyUserIsGuildAdministrator(
  accessToken: string,
  guildId: string,
): Promise<boolean> {
  const { allowed } = await getGuildAccessForDashboard(accessToken, guildId);
  return allowed;
}

export async function getDiscordGuildName(
  accessToken: string,
  guildId: string,
): Promise<string | null> {
  const { guildName } = await getGuildAccessForDashboard(accessToken, guildId);
  return guildName;
}
