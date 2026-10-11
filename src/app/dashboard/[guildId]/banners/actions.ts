"use server";

import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";
import { authOptions } from "@/lib/auth";
import { normalizeBannerSettings } from "@/lib/banners/normalize";
import { bannerProblem } from "@/lib/banners/validate";
import { Guild } from "@/lib/db/Guild";
import type { GuildActionState } from "@/types/dashboard";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

/** A second request for an update within this time is turned away; Discord limits banner changes. */
const REFRESH_COOLDOWN_MS = 60_000;

async function authorize(guildId: string): Promise<string | null> {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session) return t("settings.errors.notAuthorized");
  const gate = await requireGuildAdmin(guildId);
  return gate.error;
}

/**
 * Saves the banners and the settings of the updater. The status and the update request are not
 * touched: the bot writes the first and the button below writes the second.
 */
export async function updateBannerSettings(
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

    const problem = bannerProblem(parsed);
    if (problem) {
      return { ok: false, error: t(`banners.errors.${problem.key}` as MessageKey, problem.params) };
    }

    // Only the known keys are kept, and every value is brought into range.
    const settings = normalizeBannerSettings(parsed);

    const guild = new Guild(guildId);
    await guild.set("utils.banners.enabled", settings.enabled);
    await guild.set("utils.banners.interval", settings.interval);
    await guild.set("utils.banners.activity_window", settings.activity_window);
    await guild.set("utils.banners.active", settings.active);
    await guild.set("utils.banners.items", settings.items);

    revalidatePath(`/dashboard/${guildId}/banners`);
    return { ok: true };
  } catch (error) {
    console.error("[Banners Update Error]:", error);
    return { ok: false, error: t("settings.errors.internalSave") };
  }
}

/** Asks the bot to draw and set the active banner now. */
export async function requestBannerRefresh(guildId: string): Promise<GuildActionState> {
  const t = await getT();
  try {
    const denied = await authorize(guildId);
    if (denied) return { ok: false, error: denied };

    const guild = new Guild(guildId);
    const settings = normalizeBannerSettings(await guild.get("utils.banners"));
    if (!settings.enabled || !settings.active) {
      return { ok: false, error: t("banners.errors.refreshNotReady") };
    }

    const last = settings.refresh_request ? Date.parse(settings.refresh_request) : 0;
    if (Date.now() - last < REFRESH_COOLDOWN_MS) {
      return { ok: false, error: t("banners.errors.refreshTooSoon") };
    }

    await guild.set("utils.banners.refresh_request", new Date().toISOString());

    revalidatePath(`/dashboard/${guildId}/banners`);
    return { ok: true };
  } catch (error) {
    console.error("[Banners Refresh Error]:", error);
    return { ok: false, error: t("banners.errors.refreshFailed") };
  }
}
