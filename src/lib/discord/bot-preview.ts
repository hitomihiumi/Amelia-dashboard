/** Bot identity (name + avatar) for the dashboard's Discord message preview.
 * Server-only: reads DISCORD_BOT_TOKEN. Falls back to placeholders when the
 * token is absent or the API call fails. */

export type BotPreviewIdentity = {
  botName: string;
  /** `null` — the preview shows Discord's default avatar. */
  botAvatarUrl: string | null;
};

const FALLBACK: BotPreviewIdentity = { botName: "Amelia", botAvatarUrl: null };

function defaultAvatarUrl(userId: string): string {
  const idx = Number((BigInt(userId) >> BigInt(22)) % BigInt(6));
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

function avatarUrlFromUser(userId: string, avatarHash: string | null): string {
  if (!avatarHash) return defaultAvatarUrl(userId);
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}`;
}

type DiscordApiUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
};

/** Loads the bot's profile via `GET /users/@me` (cached for an hour). */
export async function getBotPreviewIdentity(): Promise<BotPreviewIdentity> {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) return FALLBACK;

  try {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return FALLBACK;
    const u = (await res.json()) as DiscordApiUser;
    const botName =
      (typeof u.global_name === "string" && u.global_name.trim()
        ? u.global_name.trim()
        : u.username) || FALLBACK.botName;
    return { botName, botAvatarUrl: avatarUrlFromUser(u.id, u.avatar) };
  } catch {
    return FALLBACK;
  }
}
