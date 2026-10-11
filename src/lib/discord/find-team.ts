import "server-only";

import type { FindTeamSettings } from "@/lib/games/findTeam";
import { parseEmojiText } from "./emojis-api";
import { botFetch } from "./rest";

const CHANNEL_TYPE_TEXT = 0;
const CHANNEL_TYPE_CATEGORY = 4;

/** Custom id of the select menu the bot answers (`src/components/selectMenus/find_team_select.ts`). */
const SELECT_CUSTOM_ID = "I_find_team:select";

const DEFAULT_PLACEHOLDER: Record<string, string> = {
  en: "Choose a game to find teammates",
  ru: "Выберите игру для поиска напарников",
  uk: "Виберіть гру для пошуку напарників",
};

type Failure = { ok: false; error: string };

async function discordError(res: Response | null, what: string): Promise<Failure> {
  if (!res) return { ok: false, error: "DISCORD_BOT_TOKEN is not configured." };
  const body = (await res.text()).slice(0, 200);
  return { ok: false, error: `${what} (${res.status}): ${body}` };
}

async function createChannel(guildId: string, body: Record<string, unknown>) {
  const res = await botFetch(
    `/guilds/${guildId}/channels`,
    { method: "POST", body: JSON.stringify(body) },
    "Teammate search setup (dashboard)",
  );
  if (!res?.ok) return discordError(res, "Cannot create the channel in Discord");
  return { ok: true as const, id: ((await res.json()) as { id: string }).id };
}

/**
 * Creates the category and the two channels `/setting games` creates with its setup button: one
 * for the panel with the game menu and one the requests are posted in.
 */
export async function setupFindTeamChannels(
  guildId: string,
): Promise<{ ok: true; channel: string; sendChannel: string } | Failure> {
  const category = await createChannel(guildId, { name: "Find Team", type: CHANNEL_TYPE_CATEGORY });
  if (!category.ok) return category;

  const panel = await createChannel(guildId, {
    name: "find-teammates",
    type: CHANNEL_TYPE_TEXT,
    parent_id: category.id,
  });
  if (!panel.ok) return panel;

  const requests = await createChannel(guildId, {
    name: "team-requests",
    type: CHANNEL_TYPE_TEXT,
    parent_id: category.id,
  });
  if (!requests.ok) return requests;

  return { ok: true, channel: panel.id, sendChannel: requests.id };
}

function apiEmoji(value: unknown) {
  const parsed = parseEmojiText(value);
  if (!parsed) return undefined;
  return parsed.type === "unicode"
    ? { name: parsed.unicode }
    : { id: parsed.id, name: parsed.name, animated: parsed.animated };
}

/** The panel message: the embed of the settings and the select menu with the games. */
export function findTeamPanelPayload(settings: FindTeamSettings, language: string) {
  const { embed } = settings;
  const color =
    embed.color && /^#[0-9a-f]{6}$/i.test(embed.color)
      ? parseInt(embed.color.slice(1), 16)
      : undefined;

  const options = settings.games.map((game) => ({
    label: game.name,
    value: game.id,
    ...(apiEmoji(game.emoji) ? { emoji: apiEmoji(game.emoji) } : {}),
  }));

  return {
    embeds: [
      {
        ...(embed.title ? { title: embed.title } : {}),
        ...(embed.description ? { description: embed.description } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(embed.thumbnail ? { thumbnail: { url: embed.thumbnail } } : {}),
        ...(embed.image ? { image: { url: embed.image } } : {}),
        ...(embed.footer ? { footer: { text: embed.footer } } : {}),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: SELECT_CUSTOM_ID,
            placeholder:
              settings.select_placeholder ||
              DEFAULT_PLACEHOLDER[language] ||
              DEFAULT_PLACEHOLDER.en,
            min_values: 1,
            max_values: 1,
            // Discord refuses a menu without options, so an empty list shows a disabled stand-in.
            options:
              options.length > 0 ? options : [{ label: "No games configured", value: "none" }],
            disabled: options.length === 0,
          },
        ],
      },
    ],
  };
}

/** Posts the panel in the channel of the settings. */
export async function postFindTeamPanel(
  settings: FindTeamSettings,
  language: string,
): Promise<{ ok: true } | Failure> {
  if (!settings.channel) return { ok: false, error: "No channel is set for the panel." };

  const res = await botFetch(`/channels/${settings.channel}/messages`, {
    method: "POST",
    body: JSON.stringify(findTeamPanelPayload(settings, language)),
  });
  if (!res?.ok) return discordError(res, "Cannot send the message to Discord");
  return { ok: true };
}
