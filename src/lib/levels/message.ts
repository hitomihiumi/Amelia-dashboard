import type { LevelMessageContent } from "@/lib/db/types";

/** Discord's limits for the parts of an announcement; the bot cuts anything longer. */
export const LEVEL_MESSAGE_LIMITS = {
  text: 2000,
  title: 256,
  description: 4096,
  footer: 2048,
  url: 2048,
  /** Seconds until the announcement is deleted. */
  deleteMax: 60,
} as const;

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * The stored announcement as a complete object. Servers saved before the editor existed have
 * `{}` or only some of the keys; they keep the card and the reply they always got. This is the
 * same reading the bot does (`normalizeLevelMessage` in its `levelAnnouncement.ts`).
 */
export function normalizeLevelMessage(raw: unknown): LevelMessageContent {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<LevelMessageContent>;
  const embed = (source.embed && typeof source.embed === "object" ? source.embed : {}) as Partial<
    LevelMessageContent["embed"]
  >;

  return {
    text: str(source.text),
    embed: {
      title: str(embed.title),
      description: str(embed.description),
      color: str(embed.color),
      thumbnail: str(embed.thumbnail),
      image: str(embed.image),
      footer: str(embed.footer),
    },
    card: source.card !== false,
    reply: source.reply !== false,
  };
}

/** A link field: an absolute http(s) link, or a placeholder the bot fills with one. */
export function isLinkOrPlaceholder(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value) || /^\{[a-zA-Z][\w.]*\}$/.test(value);
}

/** Why an announcement cannot be saved, or null when it is fine. Returns a message key suffix. */
export function levelMessageProblem(content: LevelMessageContent): string | null {
  const { text, embed } = content;
  const L = LEVEL_MESSAGE_LIMITS;

  if (text && text.length > L.text) return "textTooLong";
  if (embed.title && embed.title.length > L.title) return "titleTooLong";
  if (embed.description && embed.description.length > L.description) return "descriptionTooLong";
  if (embed.footer && embed.footer.length > L.footer) return "footerTooLong";
  if (embed.color && !/^#[0-9a-f]{6}$/i.test(embed.color)) return "invalidColor";
  for (const link of [embed.thumbnail, embed.image]) {
    if (link && (link.length > L.url || !isLinkOrPlaceholder(link.trim()))) return "invalidLink";
  }
  return null;
}
