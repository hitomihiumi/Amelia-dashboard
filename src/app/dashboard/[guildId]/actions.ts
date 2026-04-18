"use server";

import { Guild } from "@/lib/db/Guild";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyUserIsGuildAdministrator } from "@/lib/discord/guilds-api";
import { GuildActionState } from "@/types/dashboard";

export async function updateGeneralSettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Not authorized");

  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return { ok: false, error: gate.error };

  const newPrefix = formData.get("prefix") as string;

  const newLanguage = formData.get("language") as string;

  const guild = new Guild(guildId);

  if (newPrefix && newPrefix.length > 0 && newPrefix.length <= 5) {
    await guild.set("settings.prefix", newPrefix);

    revalidatePath(`/dashboard/${guildId}`);
  } else {
    return {
      ok: false,
      error: "You need to specify a valid prefix setting",
    };
  }

  if (newLanguage && (newLanguage === "en" || newLanguage === "uk" || newLanguage === "ru")) {
    await guild.set("settings.language", newLanguage);

    revalidatePath(`/dashboard/${guildId}`);
  } else {
    return {
      ok: false,
      error: "You need to specify a valid language setting",
    };
  }

  return {
    ok: true,
  };
}

export async function requireGuildAdmin(
  guildId: string,
): Promise<{ error: string } | { error: null }> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: "Нужна авторизация" };
  }
  try {
    const allowed = await verifyUserIsGuildAdministrator(session.accessToken, guildId);
    if (!allowed) {
      return {
        error: "Нужны права администратора Discord на этом сервере",
      };
    }
  } catch {
    return {
      error: "Discord временно недоступен (лимит запросов). Подождите и попробуйте снова.",
    };
  }
  return { error: null };
}
