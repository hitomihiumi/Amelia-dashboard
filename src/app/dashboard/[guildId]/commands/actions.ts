"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { revalidatePath } from "next/cache";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { GuildActionState } from "@/types/dashboard";
import { CommandPermission } from "@/lib/db/types";
import { getT } from "@/i18n/server";

export async function updateCommandPermissions(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const t = await getT();
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { ok: false, error: t("settings.errors.authRequired") };

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const permsRaw = formData.get("permissions");
    if (!permsRaw) return { ok: false, error: t("settings.commands.errors.missingPermissions") };

    const permissions = JSON.parse(permsRaw as string) as Record<string, CommandPermission>;

    for (const [cmdName, data] of Object.entries(permissions)) {
      if (cmdName.length > 32)
        return { ok: false, error: t("settings.commands.errors.invalidCommand") };

      if (data.roles.length > 100)
        return { ok: false, error: t("settings.commands.errors.tooManyOverrides") };

      for (const roleEntry of data.roles) {
        if (!/^\d{17,20}$/.test(roleEntry.id)) {
          return {
            ok: false,
            error: t("settings.commands.errors.invalidRoleId", { id: roleEntry.id }),
          };
        }
        if (roleEntry.type !== "allow" && roleEntry.type !== "deny") {
          return { ok: false, error: t("settings.commands.errors.invalidType") };
        }
      }

      if (data.permission !== null) {
        const pStr = data.permission.toString();
        if (!/^\d+$/.test(pStr))
          return { ok: false, error: t("settings.commands.errors.invalidBitmask") };
      }
    }

    const guild = new Guild(guildId);

    await guild.set("permissions", permissions);

    revalidatePath(`/dashboard/${guildId}/commands`);
    return { ok: true };
  } catch (error) {
    console.error("[Command Perms Error]:", error);
    return { ok: false, error: t("settings.commands.errors.internal") };
  }
}
