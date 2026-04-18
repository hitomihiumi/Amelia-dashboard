export const CHANNEL_TYPE_GUILD_TEXT = 0;
export const CHANNEL_TYPE_GUILD_VOICE = 2;
export const CHANNEL_TYPE_GUILD_CATEGORY = 4;
export const CHANNEL_TYPE_ANNOUNCEMENT = 5;
export const CHANNEL_TYPE_STAGE = 13;

export type ChannelPickOption = {
  id: string;
  name: string;
  type: number;
  parentId?: string | null;
};

export function isCategoryChannel(type: number): boolean {
  return type === CHANNEL_TYPE_GUILD_CATEGORY;
}

export function isVoiceLikeChannel(type: number): boolean {
  return type === CHANNEL_TYPE_GUILD_VOICE || type === CHANNEL_TYPE_STAGE;
}

export function isTextLikeChannel(type: number): boolean {
  return type === CHANNEL_TYPE_GUILD_TEXT || type === CHANNEL_TYPE_ANNOUNCEMENT;
}
