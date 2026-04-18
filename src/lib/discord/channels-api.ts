import "server-only";

const DISCORD_API = "https://discord.com/api/v10";

const TEXT_LIKE_TYPES = new Set([0, 5]);

const VOICE_LIKE_TYPES = new Set([2, 13]);

const CATEGORY_TYPE = 4;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function channelsAuthHeader(userAccessToken: string): { Authorization: string } {
  const bot = process.env.DISCORD_BOT_TOKEN?.trim();
  if (bot) {
    return { Authorization: `Bot ${bot}` };
  }
  return { Authorization: `Bearer ${userAccessToken}` };
}

async function fetchGuildChannelsOnce(accessToken: string, guildId: string): Promise<Response> {
  return fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: {
      ...channelsAuthHeader(accessToken),
      "User-Agent": "AmeliaDashboard/1.0",
    },
    cache: "no-store",
  });
}

type RawChannel = {
  id: string;
  name: string;
  type: number;
  position?: number;
  parent_id?: string | null;
  permission_overwrites?: Array<{
    id: string;
    type: 0 | 1; // 0 for role, 1 for member
    allow: string;
    deny: string;
  }>;
};

type RawRole = {
  id: string;
  permissions: string;
};

type RawMember = {
  user: { id: string };
  roles: string[];
};

async function fetchBotMember(
  guildId: string,
  botToken: string,
  clientId: string,
): Promise<RawMember | null> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${clientId}`, {
    headers: { Authorization: `Bot ${botToken}`, "User-Agent": "AmeliaDashboard/1.0" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<RawMember>;
}

async function fetchGuildRoles(guildId: string, botToken: string): Promise<RawRole[]> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}`, "User-Agent": "AmeliaDashboard/1.0" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json() as Promise<RawRole[]>;
}

async function fetchGuildChannelsRawWithRetry(
  accessToken: string,
  guildId: string,
): Promise<RawChannel[]> {
  const maxRetries = 8;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetchGuildChannelsOnce(accessToken, guildId);

    if (res.status === 429) {
      let waitMs = 1000;
      const header = res.headers.get("retry-after");
      if (header) {
        waitMs = Math.max(Number(header) * 1000, 100);
      } else {
        try {
          const j = (await res.json()) as { retry_after?: number };
          if (typeof j.retry_after === "number") {
            waitMs = Math.ceil(j.retry_after * 1000) + 150;
          }
        } catch {
          waitMs = 500;
        }
      }
      if (attempt >= maxRetries) {
        throw new Error("Discord API: too many retries");
      }
      await sleep(waitMs);
      continue;
    }

    if (res.status === 403) {
      throw new Error(
        "Access denied for guild channels. Bot token with proper permissions is required to calculate channel permissions. Please check your DISCORD_BOT_TOKEN and its permissions in the guild.",
      );
    }

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Discord API ${res.status}: ${t.slice(0, 160)}`);
    }

    const channels = (await res.json()) as RawChannel[];

    // Calculate permissions if bot token is available
    const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
    const clientId = process.env.DISCORD_CLIENT_ID?.trim();
    if (botToken && clientId) {
      const [botMember, guildRoles] = await Promise.all([
        fetchBotMember(guildId, botToken, clientId),
        fetchGuildRoles(guildId, botToken),
      ]);

      if (botMember && guildRoles.length > 0) {
        const ADMINISTRATOR = BigInt(8);
        const VIEW_CHANNEL = BigInt(1024);

        // Base permissions
        const everyoneRole = guildRoles.find((r) => r.id === guildId);
        let basePerms = BigInt(everyoneRole?.permissions || 0);

        for (const roleId of botMember.roles) {
          const role = guildRoles.find((r) => r.id === roleId);
          if (role) {
            basePerms |= BigInt(role.permissions);
          }
        }

        const isAdmin = (basePerms & ADMINISTRATOR) === ADMINISTRATOR;

        return channels.filter((channel) => {
          if (isAdmin) return true;

          let perms = basePerms;
          const overwrites = channel.permission_overwrites || [];

          // 1. @everyone overwrite
          const everyoneOverwrite = overwrites.find((o) => o.id === guildId);
          if (everyoneOverwrite) {
            perms &= ~BigInt(everyoneOverwrite.deny);
            perms |= BigInt(everyoneOverwrite.allow);
          }

          // 2. Role overwrites
          let roleAllow = BigInt(0);
          let roleDeny = BigInt(0);
          for (const roleId of botMember.roles) {
            const roleOverwrite = overwrites.find((o) => o.id === roleId && o.type === 0);
            if (roleOverwrite) {
              roleAllow |= BigInt(roleOverwrite.allow);
              roleDeny |= BigInt(roleOverwrite.deny);
            }
          }
          perms &= ~roleDeny;
          perms |= roleAllow;

          // 3. Member overwrite
          const memberOverwrite = overwrites.find((o) => o.id === clientId && o.type === 1);
          if (memberOverwrite) {
            perms &= ~BigInt(memberOverwrite.deny);
            perms |= BigInt(memberOverwrite.allow);
          }

          return (perms & VIEW_CHANNEL) === VIEW_CHANNEL;
        });
      }
    }

    return channels;
  }

  throw new Error("Failed to fetch guild channels after retries");
}

export type GuildChannelOption = {
  id: string;
  name: string;
  type: number;
  parentId?: string | null;
};

export async function fetchGuildTextChannels(
  accessToken: string,
  guildId: string,
): Promise<GuildChannelOption[]> {
  const raw = await fetchGuildChannelsRawWithRetry(accessToken, guildId);
  return raw
    .filter((c) => TEXT_LIKE_TYPES.has(c.type))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parent_id ?? null,
    }));
}

export async function fetchGuildTextChannelsAndCategories(
  accessToken: string,
  guildId: string,
): Promise<{
  textChannels: GuildChannelOption[];
  categories: GuildChannelOption[];
}> {
  const raw = await fetchGuildChannelsRawWithRetry(accessToken, guildId);
  const textChannels = raw
    .filter((c) => TEXT_LIKE_TYPES.has(c.type))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parent_id ?? null,
    }));
  const categories = raw
    .filter((c) => c.type === CATEGORY_TYPE)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parent_id ?? null,
    }));
  return { textChannels, categories };
}

export async function fetchGuildTextVoiceAndCategories(
  accessToken: string,
  guildId: string,
): Promise<{
  textChannels: GuildChannelOption[];
  voiceChannels: GuildChannelOption[];
  categories: GuildChannelOption[];
}> {
  const raw = await fetchGuildChannelsRawWithRetry(accessToken, guildId);
  const byPos = (a: RawChannel, b: RawChannel) => (a.position ?? 0) - (b.position ?? 0);
  const map = (c: RawChannel): GuildChannelOption => ({
    id: c.id,
    name: c.name,
    type: c.type,
    parentId: c.parent_id ?? null,
  });
  return {
    textChannels: raw
      .filter((c) => TEXT_LIKE_TYPES.has(c.type))
      .sort(byPos)
      .map(map),
    voiceChannels: raw
      .filter((c) => VOICE_LIKE_TYPES.has(c.type))
      .sort(byPos)
      .map(map),
    categories: raw
      .filter((c) => c.type === CATEGORY_TYPE)
      .sort(byPos)
      .map(map),
  };
}
