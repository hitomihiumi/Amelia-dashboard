"use server";

import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { postFindTeamPanel, setupFindTeamChannels } from "@/lib/discord/find-team";
import { cleanFindTeam, findTeamProblem, normalizeFindTeam } from "@/lib/games/findTeam";
import type { GuildActionState } from "@/types/dashboard";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export interface SetupChannelsState {
  ok: boolean;
  error?: string;
  channel?: string;
  sendChannel?: string;
}

async function authorize(guildId: string): Promise<string | null> {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session) return t("settings.errors.notAuthorized");
  const gate = await requireGuildAdmin(guildId);
  return gate.error;
}

export async function updateGamesSettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const t = await getT();
  try {
    const denied = await authorize(guildId);
    if (denied) return { ok: false, error: denied };

    const raw = formData.get("settings");
    if (typeof raw !== "string") return { ok: false, error: t("settings.errors.missingData") };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: t("settings.errors.dataFormat") };
    }

    // Only the known keys are kept, so nothing else a client sends reaches the database.
    const settings = cleanFindTeam(parsed);
    const problem = findTeamProblem(settings);
    if (problem) {
      return { ok: false, error: t(`games.errors.${problem.key}` as MessageKey, problem.params) };
    }

    await new Guild(guildId).set("utils.find_team", settings);

    revalidatePath(`/dashboard/${guildId}/games`);
    return { ok: true };
  } catch (error) {
    console.error("[Games Update Error]:", error);
    return { ok: false, error: t("settings.errors.internalSave") };
  }
}

/** Creates the category and the two channels and stores them in the settings. */
export async function setupGamesChannels(guildId: string): Promise<SetupChannelsState> {
  const t = await getT();
  try {
    const denied = await authorize(guildId);
    if (denied) return { ok: false, error: denied };

    const created = await setupFindTeamChannels(guildId);
    if (!created.ok) return { ok: false, error: created.error };

    const guild = new Guild(guildId);
    await guild.set("utils.find_team.channel", created.channel);
    await guild.set("utils.find_team.send_channel", created.sendChannel);

    revalidatePath(`/dashboard/${guildId}/games`);
    return { ok: true, channel: created.channel, sendChannel: created.sendChannel };
  } catch (error) {
    console.error("[Games Setup Error]:", error);
    return { ok: false, error: t("games.errors.setupFailed") };
  }
}

/** Posts the saved panel in its channel. */
export async function sendGamesPanel(guildId: string): Promise<GuildActionState> {
  const t = await getT();
  try {
    const denied = await authorize(guildId);
    if (denied) return { ok: false, error: denied };

    const guild = new Guild(guildId);
    const settings = normalizeFindTeam(await guild.get("utils.find_team"));
    if (!settings.channel) return { ok: false, error: t("games.errors.panelChannelRequired") };

    const language = (await guild.get("settings.language")) as string;
    const sent = await postFindTeamPanel(settings, language);
    if (!sent.ok) return { ok: false, error: sent.error };

    return { ok: true };
  } catch (error) {
    console.error("[Games Panel Error]:", error);
    return { ok: false, error: t("games.errors.sendFailed") };
  }
}
