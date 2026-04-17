export type DiscordPartialGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
};

export type UserGuildCard = {
  id: string;
  name: string;
  iconUrl: string | null;
  botPresent: boolean;
  inviteUrl: string | null;
};
