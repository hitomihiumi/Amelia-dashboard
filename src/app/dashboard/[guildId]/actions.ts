"use server";

import { Guild } from "@/lib/db/Guild";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyUserIsGuildAdministrator } from "@/lib/discord/guilds-api";
import { GuildActionState } from "@/types/dashboard";
import { getT } from "@/i18n/server";

export async function updateGeneralSettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Not authorized");

  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return { ok: false, error: gate.error };

  const newPrefix = formData.get("prefix") as string;
  const newLanguage = formData.get("language") as string;

  if (!newPrefix || newPrefix.length === 0 || newPrefix.length > 5) {
    return { ok: false, error: t("settings.general.invalidPrefix") };
  }
  if (newLanguage !== "en" && newLanguage !== "uk" && newLanguage !== "ru") {
    return { ok: false, error: t("settings.general.invalidLanguage") };
  }

  // Both values are checked first and saved with a single write.
  await new Guild(guildId).setMany([
    ["settings.prefix", newPrefix],
    ["settings.language", newLanguage],
  ]);

  revalidatePath(`/dashboard/${guildId}`);

  return {
    ok: true,
  };
}

export async function requireGuildAdmin(
  guildId: string,
): Promise<{ error: string } | { error: null }> {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: t("settings.errors.authRequired") };
  }
  try {
    const allowed = await verifyUserIsGuildAdministrator(session.accessToken, guildId);
    if (!allowed) {
      return {
        error: t("settings.errors.accessDenied"),
      };
    }
  } catch {
    return {
      error: t("settings.errors.verifyFailed"),
    };
  }
  return { error: null };
}
