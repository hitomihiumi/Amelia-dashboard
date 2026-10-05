export type GuildActionState = {
  ok: boolean;
  error?: string;
  roleId?: string;
  /** Notes about the Discord AutoMod rules after a save: what Discord refused or shortened. */
  automod?: { messages: string[] };
} | null;
