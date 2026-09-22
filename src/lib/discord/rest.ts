import "server-only";

export const DISCORD_API = "https://discord.com/api/v10";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** The bot token, or `null` when the deployment has not configured one. */
export function botToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN?.trim() || null;
}

/**
 * `fetch` with Discord rate limit handling: a 429 is retried after the
 * `retry-after` delay until `maxRetries` is exhausted.
 */
export async function discordFetch(
  url: string,
  init: RequestInit,
  maxRetries = 6,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { ...init, cache: "no-store" });
    if (res.status !== 429) return res;

    let waitMs = 800;
    const header = res.headers.get("retry-after");
    if (header) {
      waitMs = Math.max(Number(header) * 1000, 100);
    } else {
      try {
        const body = (await res.json()) as { retry_after?: number };
        if (typeof body.retry_after === "number") {
          waitMs = Math.ceil(body.retry_after * 1000) + 100;
        }
      } catch {
        waitMs = 500;
      }
    }

    if (attempt >= maxRetries) return res;
    await sleep(waitMs);
  }

  return fetch(url, { ...init, cache: "no-store" });
}

/** Request the Discord API with the bot token. */
export async function botFetch(
  path: string,
  init: RequestInit = {},
  auditReason?: string,
): Promise<Response | null> {
  const token = botToken();
  if (!token) return null;

  const headers: Record<string, string> = {
    Authorization: `Bot ${token}`,
    "User-Agent": "AmeliaDashboard/1.0",
    ...((init.headers as Record<string, string>) ?? {}),
  };

  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (auditReason) {
    headers["X-Audit-Log-Reason"] = encodeURIComponent(auditReason).slice(0, 512);
  }

  return await discordFetch(`${DISCORD_API}${path}`, { ...init, headers });
}

export interface GuildBrief {
  id: string;
  name: string;
  iconUrl: string | null;
}

/**
 * Guild name and icon fetched with the bot token.
 *
 * The public submission pages cannot use the visitor's guild list: a banned
 * user is not a member any more and would never see the guild there.
 */
export async function fetchGuildBrief(guildId: string): Promise<GuildBrief | null> {
  const res = await botFetch(`/guilds/${guildId}`);
  if (!res?.ok) return null;

  const guild = (await res.json()) as { id: string; name: string; icon: string | null };

  return {
    id: guild.id,
    name: guild.name,
    iconUrl: guild.icon
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${
          guild.icon.startsWith("a_") ? "gif" : "png"
        }`
      : null,
  };
}

/** `true` when the user is a member of the guild. */
export async function isGuildMember(guildId: string, userId: string): Promise<boolean> {
  const res = await botFetch(`/guilds/${guildId}/members/${userId}`);
  return res?.ok ?? false;
}

/** `true` when the user is banned from the guild. */
export async function isGuildBanned(guildId: string, userId: string): Promise<boolean> {
  const res = await botFetch(`/guilds/${guildId}/bans/${userId}`);
  return res?.ok ?? false;
}

/** Remove a ban. Returns `false` when Discord rejected the request. */
export async function removeGuildBan(
  guildId: string,
  userId: string,
  auditReason: string,
): Promise<boolean> {
  const res = await botFetch(
    `/guilds/${guildId}/bans/${userId}`,
    { method: "DELETE" },
    auditReason,
  );
  return res?.ok ?? false;
}

/** Clear a member time out. Returns `false` when Discord rejected the request. */
export async function clearMemberTimeout(
  guildId: string,
  userId: string,
  auditReason: string,
): Promise<boolean> {
  const res = await botFetch(
    `/guilds/${guildId}/members/${userId}`,
    { method: "PATCH", body: JSON.stringify({ communication_disabled_until: null }) },
    auditReason,
  );
  return res?.ok ?? false;
}

export interface DiscordMessagePayload {
  content?: string;
  embeds?: unknown[];
  components?: unknown[];
  allowed_mentions?: { parse: string[] };
}

/** Post a message to a channel; returns the created message id. */
export async function postChannelMessage(
  channelId: string,
  payload: DiscordMessagePayload,
): Promise<string | null> {
  const res = await botFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ allowed_mentions: { parse: [] }, ...payload }),
  });

  if (!res?.ok) return null;

  const message = (await res.json()) as { id: string };
  return message.id;
}

/** Edit a message previously posted by the bot. */
export async function editChannelMessage(
  channelId: string,
  messageId: string,
  payload: DiscordMessagePayload,
): Promise<boolean> {
  const res = await botFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ allowed_mentions: { parse: [] }, ...payload }),
  });

  return res?.ok ?? false;
}

/** Send a direct message to a user. Failures are silent by design (closed DMs). */
export async function sendDirectMessage(
  userId: string,
  payload: DiscordMessagePayload,
): Promise<boolean> {
  const channelRes = await botFetch("/users/@me/channels", {
    method: "POST",
    body: JSON.stringify({ recipient_id: userId }),
  });

  if (!channelRes?.ok) return false;

  const channel = (await channelRes.json()) as { id: string };
  return (await postChannelMessage(channel.id, payload)) !== null;
}
