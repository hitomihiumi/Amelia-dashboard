import "server-only";

const DISCORD_API = "https://discord.com/api/v10";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function rolesAuthHeader(userAccessToken: string): { Authorization: string } {
  const bot = process.env.DISCORD_BOT_TOKEN?.trim();
  if (bot) {
    return { Authorization: `Bot ${bot}` };
  }
  return { Authorization: `Bearer ${userAccessToken}` };
}

async function fetchGuildRolesOnce(accessToken: string, guildId: string): Promise<Response> {
  return fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: {
      ...rolesAuthHeader(accessToken),
      "User-Agent": "AmeliaDashboard/1.0",
    },
    cache: "no-store",
  });
}

export type GuildRoleOption = {
  id: string;
  name: string;
  color: number;
  position: number;
};

export async function fetchGuildRoles(
  accessToken: string,
  guildId: string,
): Promise<GuildRoleOption[]> {
  const maxRetries = 8;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetchGuildRolesOnce(accessToken, guildId);

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
      throw new Error("Access denied for guild role");
    }

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Discord API ${res.status}: ${t.slice(0, 160)}`);
    }

    const raw = (await res.json()) as Array<{
      id: string;
      name: string;
      color: number;
      position: number;
      managed: boolean;
    }>;

    return raw
      .filter((r) => r.id !== guildId && !r.managed)
      .sort((a, b) => b.position - a.position)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
      }));
  }

  throw new Error("Failed to fetch guild roles after retries");
}

export type PatchGuildRoleResult = { ok: true } | { ok: false; error: string };

export async function patchGuildRole(
  guildId: string,
  roleId: string,
  patch: { name: string; color: number },
): Promise<PatchGuildRoleResult> {
  const bot = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!bot) {
    return {
      ok: false,
      error: "DISCORD_BOT_TOKEN is undefined",
    };
  }

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles/${roleId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${bot}`,
      "Content-Type": "application/json",
      "User-Agent": "AmeliaDashboard/1.0",
    },
    body: JSON.stringify({ name: patch.name, color: patch.color }),
  });

  if (res.ok) {
    return { ok: true };
  }

  const body = await res.text();

  if (res.status === 403) {
    return {
      ok: false,
      error:
        'Bot can\'t patch guild role. Make sure the bot has "Manage Roles" permission and its role is above the role you want to edit.',
    };
  }
  if (res.status === 404) {
    return { ok: false, error: "Role not found" };
  }

  return {
    ok: false,
    error: `Discord API ${res.status}: ${body.slice(0, 180)}`,
  };
}
