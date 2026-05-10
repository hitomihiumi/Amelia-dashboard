"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { revalidatePath } from "next/cache";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { GuildActionState } from "@/types/dashboard";
import { GuildSchema } from "@/lib/db/types";

export async function updateLevelsSettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { ok: false, error: "Authentication required." };

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const levelsRaw = formData.get("levels");
    const economyRaw = formData.get("economy");

    if (!levelsRaw || !economyRaw) {
      return { ok: false, error: "Required data is missing." };
    }

    const levels = JSON.parse(levelsRaw as string) as GuildSchema["utils"]["levels"];
    const economy = JSON.parse(
      economyRaw as string,
    ) as GuildSchema["economy"]["income"]["level_up"];

    if (!levels || typeof levels !== "object")
      return { ok: false, error: "Invalid levels data format." };
    if (!economy || typeof economy !== "object")
      return { ok: false, error: "Invalid economy data format." };

    if (!Array.isArray(levels.ignore_channels) || levels.ignore_channels.length > 50) {
      return { ok: false, error: "Ignored channels must be an array with a maximum of 50 items." };
    }
    if (!Array.isArray(levels.ignore_roles) || levels.ignore_roles.length > 50) {
      return { ok: false, error: "Ignored roles must be an array with a maximum of 50 items." };
    }

    if (
      typeof levels.message?.delete !== "number" ||
      levels.message.delete < 0 ||
      levels.message.delete > 60
    ) {
      return { ok: false, error: "Message delete delay must be between 0 and 60 seconds." };
    }
    if (levels.message.channel !== null && typeof levels.message.channel !== "string") {
      return { ok: false, error: "Invalid announcement channel format." };
    }

    if (levels.level_roles && typeof levels.level_roles === "object") {
      const roleKeys = Object.keys(levels.level_roles);

      if (roleKeys.length > 50) {
        return { ok: false, error: "You can configure a maximum of 50 role rewards." };
      }

      for (const [levelStr, roleId] of Object.entries(levels.level_roles)) {
        const level = parseInt(levelStr, 10);

        if (isNaN(level) || level <= 0 || level > 1000) {
          return {
            ok: false,
            error: `Invalid level (${levelStr}) for role rewards. Must be between 1 and 1000.`,
          };
        }

        if (typeof roleId !== "string" || !/^\d{17,20}$/.test(roleId)) {
          return { ok: false, error: `Invalid Discord Role ID provided for level ${level}.` };
        }
      }
    }

    if (typeof economy.amount !== "number" || economy.amount < 0 || economy.amount > 1000000) {
      return { ok: false, error: "Economy reward must be a positive number up to 1,000,000." };
    }

    const guild = new Guild(guildId);

    await guild.set("utils.levels", levels);
    await guild.set("economy.income.level_up", economy);

    revalidatePath(`/dashboard/${guildId}/levels`);
    return { ok: true };
  } catch (error) {
    console.error("[Levels Action Error]:", error);

    if (error instanceof SyntaxError) {
      return { ok: false, error: "Failed to parse data payload." };
    }

    return { ok: false, error: "Internal server error occurred while saving." };
  }
}
