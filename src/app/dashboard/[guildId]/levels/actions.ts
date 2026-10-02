"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { revalidatePath } from "next/cache";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { GuildActionState } from "@/types/dashboard";
import { GuildSchema } from "@/lib/db/types";
import { getT } from "@/i18n/server";

export async function updateLevelsSettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const t = await getT();
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { ok: false, error: t("settings.errors.notAuthorized") };

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const levelsRaw = formData.get("levels");
    const economyRaw = formData.get("economy");

    if (!levelsRaw || !economyRaw) {
      return { ok: false, error: t("settings.levels.errors.missingData") };
    }

    const levels = JSON.parse(levelsRaw as string) as GuildSchema["utils"]["levels"];
    const economy = JSON.parse(
      economyRaw as string,
    ) as GuildSchema["economy"]["income"]["level_up"];

    if (!levels || typeof levels !== "object")
      return { ok: false, error: t("settings.levels.errors.invalidLevels") };
    if (!economy || typeof economy !== "object")
      return { ok: false, error: t("settings.levels.errors.invalidEconomy") };

    if (!Array.isArray(levels.ignore_channels) || levels.ignore_channels.length > 50) {
      return { ok: false, error: t("settings.levels.errors.ignoredChannelsLimit") };
    }
    if (!Array.isArray(levels.ignore_roles) || levels.ignore_roles.length > 50) {
      return { ok: false, error: t("settings.levels.errors.ignoredRolesLimit") };
    }

    if (
      typeof levels.message?.delete !== "number" ||
      levels.message.delete < 0 ||
      levels.message.delete > 60
    ) {
      return { ok: false, error: t("settings.levels.errors.deleteDelay") };
    }
    if (levels.message.channel !== null && typeof levels.message.channel !== "string") {
      return { ok: false, error: t("settings.levels.errors.invalidChannel") };
    }

    if (levels.level_roles && typeof levels.level_roles === "object") {
      const roleKeys = Object.keys(levels.level_roles);

      if (roleKeys.length > 50) {
        return { ok: false, error: t("settings.levels.errors.rewardsLimit") };
      }

      for (const [levelStr, roleId] of Object.entries(levels.level_roles)) {
        const level = parseInt(levelStr, 10);

        if (isNaN(level) || level <= 0 || level > 1000) {
          return {
            ok: false,
            error: t("settings.levels.errors.invalidLevel", { level: levelStr }),
          };
        }

        if (typeof roleId !== "string" || !/^\d{17,20}$/.test(roleId)) {
          return { ok: false, error: t("settings.levels.errors.invalidRoleId", { level }) };
        }
      }
    }

    if (typeof economy.amount !== "number" || economy.amount < 0 || economy.amount > 1000000) {
      return { ok: false, error: t("settings.levels.errors.rewardAmount") };
    }

    const guild = new Guild(guildId);

    await guild.set("utils.levels", levels);
    await guild.set("economy.income.level_up", economy);

    revalidatePath(`/dashboard/${guildId}/levels`);
    return { ok: true };
  } catch (error) {
    console.error("[Levels Action Error]:", error);

    if (error instanceof SyntaxError) {
      return { ok: false, error: t("settings.levels.errors.parseFailed") };
    }

    return { ok: false, error: t("settings.levels.errors.internal") };
  }
}
