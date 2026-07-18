/** Placeholder substitution for the Discord preview, mirroring the bot's
 * `VARIABLE_PLACEHOLDERS` syntax (src/lib/db/types/Action.ts) so text like
 * "Hello {user.mention}!" previews the way the bot will actually render it.
 *
 * Pure and client-safe. All time-derived values use a frozen timestamp so
 * SSR and hydration produce identical output. */

export type PreviewTagContext = {
  guildId?: string;
  guildName?: string | null;
  guildIconUrl?: string | null;
  botAvatarUrl?: string | null;
};

/** Sample snowflakes shown in previews (match Discord's id shape). */
export const PREVIEW_USER_ID = "123456789012345678";
export const PREVIEW_CHANNEL_ID = "123456789012345679";
export const PREVIEW_USER_NAME = "preview_user";
export const PREVIEW_USER_DISPLAY_NAME = "User";
export const PREVIEW_USER_AVATAR = "https://cdn.discordapp.com/embed/avatars/3.png";

/** Frozen "now" to keep server and client renders identical. */
export const PREVIEW_FROZEN_NOW = 1711462000;

const frozenDate = new Date(PREVIEW_FROZEN_NOW * 1000);

export function replacePreviewTags(text: string, ctx?: PreviewTagContext): string {
  if (!text) return text;
  let s = text;

  // User
  s = s.replace(/\{user\.id\}/gi, PREVIEW_USER_ID);
  s = s.replace(/\{user\.name\}/gi, PREVIEW_USER_NAME);
  s = s.replace(/\{user\.displayName\}/gi, PREVIEW_USER_DISPLAY_NAME);
  s = s.replace(/\{user\.mention\}/gi, `<@${PREVIEW_USER_ID}>`);
  s = s.replace(/\{user\.avatar\}/gi, PREVIEW_USER_AVATAR);

  // Channel
  s = s.replace(/\{channel\.id\}/gi, PREVIEW_CHANNEL_ID);
  s = s.replace(/\{channel\.name\}/gi, "channel");
  s = s.replace(/\{channel\.mention\}/gi, `<#${PREVIEW_CHANNEL_ID}>`);

  // Guild
  s = s.replace(/\{guild\.id\}/gi, ctx?.guildId ?? "0");
  s = s.replace(/\{guild\.name\}/gi, ctx?.guildName || "Server");
  s = s.replace(/\{guild\.icon\}/gi, ctx?.guildIconUrl || "");

  // Time (frozen for hydration safety; rendered through the same locale as DiscordText)
  s = s.replace(/\{date\}/gi, frozenDate.toLocaleDateString("en-US"));
  s = s.replace(
    /\{time\}/gi,
    frozenDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  );
  s = s.replace(/\{timestamp\}/gi, `<t:${PREVIEW_FROZEN_NOW}:f>`);

  return s;
}
