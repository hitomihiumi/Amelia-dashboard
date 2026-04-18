"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { revalidatePath } from "next/cache";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { GuildActionState } from "@/types/dashboard";
import { GuildSchema } from "@/lib/db/types";
import {discordAutoSetupTempVoice} from "@/lib/discord/temp-voice";

export async function updatePrivateRoomSettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { ok: false, error: "Not authorized." };

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const joinToCreateRaw = formData.get("join_to_create");

    if (!joinToCreateRaw) {
      return { ok: false, error: "Missing required data to save." };
    }

    let joinToCreate: GuildSchema["utils"]["join_to_create"];
    try {
      joinToCreate = JSON.parse(
        joinToCreateRaw as string,
      ) as GuildSchema["utils"]["join_to_create"];
    } catch {
      return { ok: false, error: "Data format error." };
    }

    // Validate required fields
    if (!joinToCreate.default_name || joinToCreate.default_name.trim().length === 0) {
      return { ok: false, error: "Default room name cannot be empty." };
    }

    if (joinToCreate.default_name.length > 100) {
      return { ok: false, error: "Default room name is too long (max 100 characters)." };
    }

    // If enabled, channel and category must be selected
    if (joinToCreate.enabled) {
      if (!joinToCreate.channel) {
        return { ok: false, error: "Please select a trigger channel." };
      }
      if (!joinToCreate.category) {
        return { ok: false, error: "Please select a category for new rooms." };
      }
    }

    const guild = new Guild(guildId);
    await guild.set("utils.join_to_create", joinToCreate);

    revalidatePath(`/dashboard/${guildId}/private`);

    return { ok: true };
  } catch (error) {
    console.error("[Private Rooms Update Error]:", error);

    return { ok: false, error: "Internal server error while saving settings." };
  }
}

export async function autoSetupTempVoiceSettings(
    _prev: GuildActionState,
    formData: FormData,
): Promise<GuildActionState> {
  try {
    const guildId = String(formData.get('guildId') ?? '');
    if (!guildId || guildId.trim().length === 0) {
      return { ok: false, error: "Missing guild ID." };
    }

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const result = await discordAutoSetupTempVoice(guildId);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    if (!result.categoryId || !result.triggerChannelId) {
      return { ok: false, error: "Auto-setup created channels but returned invalid IDs." };
    }

    const guild = new Guild(guildId);

    const existingConfig = await guild.get("utils.join_to_create");


    const joinToCreateConfig: GuildSchema["utils"]["join_to_create"] = {
      enabled: true,
      channel: result.triggerChannelId,
      category: result.categoryId,
      default_name: existingConfig.default_name
    };

    await guild.set("utils.join_to_create", joinToCreateConfig);

    revalidatePath(`/dashboard/${guildId}/private`);
    return { ok: true };
  } catch (error) {
    console.error("[Auto Setup Temp Voice Error]:", error);
    return { ok: false, error: "Internal server error during auto-setup." };
  }
}