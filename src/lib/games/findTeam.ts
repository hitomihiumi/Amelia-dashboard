import type { FindTeamGame, GuildSchema, IModalField } from "@/lib/db/types";
import { isLinkOrPlaceholder } from "@/lib/levels/message";

export type FindTeamSettings = GuildSchema["utils"]["find_team"];

/** What Discord accepts for the select menu, the modal and its inputs. */
export const FIND_TEAM_LIMITS = {
  games: 25,
  gameName: 100,
  modalTitle: 45,
  fields: 5,
  fieldName: 45,
  fieldPlaceholder: 100,
  fieldLength: 4000,
  selectPlaceholder: 150,
  embedTitle: 256,
  embedDescription: 4096,
  embedFooter: 2048,
  url: 2048,
} as const;

const SNOWFLAKE = /^\d{17,20}$/;

export interface FindTeamProblem {
  key: string;
  params?: Record<string, string | number>;
}

/** The settings as stored by the bot or the dashboard, with every key present. */
export function normalizeFindTeam(
  raw: Partial<FindTeamSettings> | null | undefined,
): FindTeamSettings {
  const embed: Partial<FindTeamSettings["embed"]> = raw?.embed ?? {};
  return {
    enabled: raw?.enabled === true,
    channel: raw?.channel ?? null,
    send_channel: raw?.send_channel ?? null,
    select_placeholder: raw?.select_placeholder ?? null,
    embed: {
      title: embed.title ?? null,
      description: embed.description ?? null,
      color: embed.color ?? null,
      thumbnail: embed.thumbnail ?? null,
      image: embed.image ?? null,
      footer: embed.footer ?? null,
    },
    games: Array.isArray(raw?.games) ? raw.games : [],
  };
}

function fieldProblem(
  game: FindTeamGame,
  field: IModalField,
  index: number,
): FindTeamProblem | null {
  const L = FIND_TEAM_LIMITS;
  const where = { game: game.name, field: index + 1 };

  if (typeof field.id !== "string" || !field.id || field.id.length > 90) {
    return { key: "fieldId", params: where };
  }
  if (typeof field.name !== "string" || !field.name.trim() || field.name.length > L.fieldName) {
    return { key: "fieldName", params: { ...where, max: L.fieldName } };
  }
  if (field.placeholder && field.placeholder.length > L.fieldPlaceholder) {
    return { key: "fieldPlaceholder", params: { ...where, max: L.fieldPlaceholder } };
  }
  if (field.type !== "short" && field.type !== "long") return { key: "fieldType", params: where };

  for (const bound of [field.min, field.max]) {
    if (bound !== undefined && (!Number.isInteger(bound) || bound < 0 || bound > L.fieldLength)) {
      return { key: "fieldLength", params: { ...where, max: L.fieldLength } };
    }
  }
  if (field.min && field.max && field.min > field.max) {
    return { key: "fieldMinMax", params: where };
  }
  return null;
}

/** Why the settings cannot be saved, or null when they are fine. Same rules as the bot's modal. */
export function findTeamProblem(settings: FindTeamSettings): FindTeamProblem | null {
  const L = FIND_TEAM_LIMITS;

  for (const channel of [settings.channel, settings.send_channel]) {
    if (channel !== null && !SNOWFLAKE.test(channel)) return { key: "invalidChannel" };
  }
  if (settings.enabled && !settings.send_channel) return { key: "sendChannelRequired" };

  if (settings.select_placeholder && settings.select_placeholder.length > L.selectPlaceholder) {
    return { key: "selectPlaceholder", params: { max: L.selectPlaceholder } };
  }

  const { embed } = settings;
  if (embed.title && embed.title.length > L.embedTitle)
    return { key: "embedTitle", params: { max: L.embedTitle } };
  if (embed.description && embed.description.length > L.embedDescription) {
    return { key: "embedDescription", params: { max: L.embedDescription } };
  }
  if (embed.footer && embed.footer.length > L.embedFooter) {
    return { key: "embedFooter", params: { max: L.embedFooter } };
  }
  if (embed.color && !/^#[0-9a-f]{6}$/i.test(embed.color)) return { key: "embedColor" };
  for (const link of [embed.thumbnail, embed.image]) {
    if (link && (link.length > L.url || !isLinkOrPlaceholder(link.trim())))
      return { key: "embedLink" };
  }

  if (settings.games.length > L.games) return { key: "tooManyGames", params: { max: L.games } };

  const ids = new Set<string>();
  for (const game of settings.games) {
    if (typeof game.id !== "string" || !game.id || game.id.length > 90 || ids.has(game.id)) {
      return { key: "gameId" };
    }
    ids.add(game.id);

    if (typeof game.name !== "string" || !game.name.trim() || game.name.length > L.gameName) {
      return { key: "gameName", params: { max: L.gameName } };
    }
    if (game.role !== null && !SNOWFLAKE.test(game.role)) {
      return { key: "gameRole", params: { game: game.name } };
    }
    if (typeof game.emoji !== "string" || game.emoji.length > 64) {
      return { key: "gameEmoji", params: { game: game.name } };
    }
    const title = game.modal?.title;
    if (typeof title !== "string" || !title.trim() || title.length > L.modalTitle) {
      return { key: "modalTitle", params: { game: game.name, max: L.modalTitle } };
    }
    const fields = game.modal.fields ?? [];
    if (fields.length > L.fields)
      return { key: "tooManyFields", params: { game: game.name, max: L.fields } };

    const fieldIds = new Set<string>();
    for (const [index, field] of fields.entries()) {
      const problem = fieldProblem(game, field, index);
      if (problem) return problem;
      if (fieldIds.has(field.id))
        return { key: "fieldId", params: { game: game.name, field: index + 1 } };
      fieldIds.add(field.id);
    }
  }
  return null;
}

/** Keeps only the known keys of what a client sent. */
export function cleanFindTeam(raw: unknown): FindTeamSettings {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<FindTeamSettings>;
  const settings = normalizeFindTeam(source);

  return {
    ...settings,
    select_placeholder: settings.select_placeholder?.trim() || null,
    games: settings.games.map((game) => ({
      id: String(game.id ?? ""),
      name: String(game.name ?? ""),
      emoji: typeof game.emoji === "string" ? game.emoji : "",
      role: game.role ?? null,
      modal: {
        title: String(game.modal?.title ?? ""),
        fields: (Array.isArray(game.modal?.fields) ? game.modal.fields : []).map((field) => ({
          id: String(field.id ?? ""),
          name: String(field.name ?? ""),
          ...(field.placeholder ? { placeholder: String(field.placeholder) } : {}),
          type: field.type,
          ...(field.min ? { min: field.min } : {}),
          ...(field.max ? { max: field.max } : {}),
          required: field.required === true,
        })),
      },
    })),
  };
}
