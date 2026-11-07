import "server-only";
import { botFetch } from "./rest";

export interface MemberIdentity {
  /** Server nickname, else the global display name, else the username; `null` when unknown. */
  name: string | null;
  avatarUrl: string | null;
}

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
}

interface DiscordMember {
  nick?: string | null;
  avatar?: string | null;
  user?: DiscordUser;
}

const TTL_MS = 10 * 60_000;
const MISS_TTL_MS = 60_000;

type CacheEntry = { expires: number; value: MemberIdentity };
const globalForMembers = globalThis as unknown as { memberIdentityCache?: Map<string, CacheEntry> };
const cache =
  globalForMembers.memberIdentityCache ??
  (globalForMembers.memberIdentityCache = new Map<string, CacheEntry>());

const UNKNOWN: MemberIdentity = { name: null, avatarUrl: null };

function avatarUrl(userId: string, hash: string | null | undefined): string {
  if (!hash) {
    const index = Number((BigInt(userId) >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const ext = hash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${ext}?size=64`;
}

async function fetchIdentity(guildId: string, userId: string): Promise<MemberIdentity> {
  const memberRes = await botFetch(`/guilds/${guildId}/members/${userId}`);
  if (memberRes?.ok) {
    const member = (await memberRes.json()) as DiscordMember;
    const user = member.user;
    const name = member.nick?.trim() || user?.global_name?.trim() || user?.username || null;
    const avatar = member.avatar
      ? `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${member.avatar}.${
          member.avatar.startsWith("a_") ? "gif" : "png"
        }?size=64`
      : avatarUrl(userId, user?.avatar);
    return { name, avatarUrl: avatar };
  }

  // Someone who has left the server is not a member any more, but is still a Discord user.
  const userRes = await botFetch(`/users/${userId}`);
  if (userRes?.ok) {
    const user = (await userRes.json()) as DiscordUser;
    return {
      name: user.global_name?.trim() || user.username || null,
      avatarUrl: avatarUrl(userId, user.avatar),
    };
  }
  return UNKNOWN;
}

/**
 * Names and avatars of the given members, looked up with the bot token and kept in memory for a
 * few minutes. A member Discord does not know (or a missing token) maps to an empty identity,
 * so the page can still show the row.
 */
export async function getMemberIdentities(
  guildId: string,
  userIds: string[],
): Promise<Map<string, MemberIdentity>> {
  const now = Date.now();
  const result = new Map<string, MemberIdentity>();

  await Promise.all(
    [...new Set(userIds)].map(async (userId) => {
      const key = `${guildId}:${userId}`;
      const hit = cache.get(key);
      if (hit && hit.expires > now) {
        result.set(userId, hit.value);
        return;
      }

      let value = UNKNOWN;
      try {
        value = await fetchIdentity(guildId, userId);
      } catch (error) {
        console.error("[Leaderboard] Could not load a member:", error);
      }
      cache.set(key, { expires: now + (value.name ? TTL_MS : MISS_TTL_MS), value });
      result.set(userId, value);
    }),
  );

  return result;
}
