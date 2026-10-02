"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { revalidatePath } from "next/cache";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { GuildActionState } from "@/types/dashboard";
import { GuildSchema } from "@/lib/db/types";
import { discordAutoSetupTempVoice } from "@/lib/discord/temp-voice";
import { getT } from "@/i18n/server";

export async function updatePrivateRoomSettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const t = await getT();
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { ok: false, error: t("settings.errors.notAuthorized") };

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const joinToCreateRaw = formData.get("join_to_create");

    if (!joinToCreateRaw) {
      return { ok: false, error: t("settings.errors.missingData") };
    }

    let joinToCreate: GuildSchema["utils"]["join_to_create"];
    try {
      joinToCreate = JSON.parse(
        joinToCreateRaw as string,
      ) as GuildSchema["utils"]["join_to_create"];
    } catch {
      return { ok: false, error: t("settings.errors.dataFormat") };
    }

    // Validate required fields
    if (!joinToCreate.default_name || joinToCreate.default_name.trim().length === 0) {
      return { ok: false, error: t("settings.private.errors.nameEmpty") };
    }

    if (joinToCreate.default_name.length > 100) {
      return { ok: false, error: t("settings.private.errors.nameTooLong") };
    }

    // If enabled, channel and category must be selected
    if (joinToCreate.enabled) {
      if (!joinToCreate.channel) {
        return { ok: false, error: t("settings.private.errors.triggerRequired") };
      }
      if (!joinToCreate.category) {
        return { ok: false, error: t("settings.private.errors.categoryRequired") };
      }
    }

    const guild = new Guild(guildId);
    await guild.set("utils.join_to_create", joinToCreate);

    revalidatePath(`/dashboard/${guildId}/private`);

    return { ok: true };
  } catch (error) {
    console.error("[Private Rooms Update Error]:", error);

    return { ok: false, error: t("settings.errors.internalSave") };
  }
}

export async function autoSetupTempVoiceSettings(
  _prev: GuildActionState,
  formData: FormData,
): Promise<GuildActionState> {
  const t = await getT();
  try {
    const guildId = String(formData.get("guildId") ?? "");
    if (!guildId || guildId.trim().length === 0) {
      return { ok: false, error: t("settings.private.errors.missingGuild") };
    }

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const result = await discordAutoSetupTempVoice(guildId);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    if (!result.categoryId || !result.triggerChannelId) {
      return { ok: false, error: t("settings.private.errors.invalidIds") };
    }

    const guild = new Guild(guildId);

    const existingConfig = await guild.get("utils.join_to_create");

    const joinToCreateConfig: GuildSchema["utils"]["join_to_create"] = {
      enabled: true,
      channel: result.triggerChannelId,
      category: result.categoryId,
      default_name: existingConfig.default_name,
    };

    await guild.set("utils.join_to_create", joinToCreateConfig);

    revalidatePath(`/dashboard/${guildId}/private`);
    return { ok: true };
  } catch (error) {
    console.error("[Auto Setup Temp Voice Error]:", error);
    return { ok: false, error: t("settings.private.errors.autoSetupInternal") };
  }
}
