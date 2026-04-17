const DISCORD_API = "https://discord.com/api/v10";

export type DiscordGuildEmoji = {
  id: string;
  name: string;
  animated: boolean;
};

export function isUnicodeEmoji(emoji: string) {
  return !emoji.includes(":");
}

export function formatCustomEmojiString(e: DiscordGuildEmoji): string {
  return `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`;
}

export function emojiFromString(e: string): DiscordGuildEmoji {
  return {
    id: e.split(":")[2].slice(0, -1),
    name: e.split(":")[1],
    animated: e.startsWith("<a:"),
  };
}

export function emojiCdnUrl(e: DiscordGuildEmoji, size = 48): string {
  const ext = e.animated ? "gif" : "webp";
  return `https://cdn.discordapp.com/emojis/${e.id}.${ext}?size=${size}&quality=lossless`;
}

export async function fetchGuildEmojisWithBotToken(
  botToken: string,
  guildId: string,
): Promise<DiscordGuildEmoji[]> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/emojis`, {
    headers: {
      Authorization: `Bot ${botToken}`,
      "User-Agent": "AmeliaDashboard/1.0",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Discord ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  const out: DiscordGuildEmoji[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = String(o.id ?? "");
    const name = String(o.name ?? "");
    if (!id || !name) continue;
    out.push({
      id,
      name,
      animated: Boolean(o.animated),
    });
  }
  return out;
}
