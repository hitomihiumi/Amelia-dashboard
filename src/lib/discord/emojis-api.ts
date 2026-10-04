const DISCORD_API = "https://discord.com/api/v10";

export type DiscordGuildEmoji = {
  id: string;
  name: string;
  animated: boolean;
};

/** What the pickers hand back: a unicode emoji or a custom emoji of the server. */
export type PickedEmoji =
  | { type: "unicode"; unicode: string; name: string }
  | { type: "custom"; id: string; name: string; animated: boolean };

/** The text Discord expects: the character itself, or `<:name:id>` / `<a:name:id>`. */
export function emojiToText(emoji: PickedEmoji): string {
  return emoji.type === "unicode"
    ? emoji.unicode
    : `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
}

/**
 * Reads the stored form of a single emoji (`😀`, `<:name:id>`, `<a:name:id>` or a bare id) back
 * into something that can be drawn. Returns `null` for empty or unrecognisable values.
 */
export function parseEmojiText(value: unknown): PickedEmoji | null {
  if (typeof value === "object" && value) {
    const o = value as { id?: unknown; name?: unknown; animated?: unknown };
    if (typeof o.id === "string") {
      return { type: "custom", id: o.id, name: String(o.name ?? "emoji"), animated: o.animated === true };
    }
    if (typeof o.name === "string" && o.name) return { type: "unicode", unicode: o.name, name: o.name };
    return null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  const custom = text.match(/^<(a?):(\w{2,32}):(\d{15,25})>$/);
  if (custom) {
    return { type: "custom", id: custom[3], name: custom[2], animated: custom[1] === "a" };
  }
  if (/^\d{15,25}$/.test(text)) return { type: "custom", id: text, name: "emoji", animated: false };
  if (text.includes(":")) return null;
  return { type: "unicode", unicode: text, name: text };
}

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
