"use server";

import { revalidatePath } from "next/cache";
import { Guild } from "@/lib/db/Guild";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import type { GuildActionState } from "@/types/dashboard";
import type { AiGlobalConfig, AiLimits, AiSettings } from "@/lib/db/types";
import {
  AI_MODEL_CHOICES,
  AI_PERSONA_MAX_LENGTH,
  isPremiumActive,
  limitBounds,
} from "@/lib/db/types";
import { getAiGlobalConfig } from "@/lib/admin/ai";
import { getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translate";

const SNOWFLAKE = /^\d{17,20}$/;
const MAX_CHANNELS = 25;

/** AI chat settings: switch, chat and ignored channels, model, personality text and limits. */
export async function updateAiSettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const t = await getT();

  try {
    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const raw = formData.get("ai");
    if (!raw) return { ok: false, error: t("ai.errors.missingData") };

    const ai = JSON.parse(raw as string) as AiSettings;

    const guild = new Guild(guildId);

    // The AI chat is a premium feature; the bot's administrators give premium out.
    if (!isPremiumActive(await guild.get("premium"))) {
      return { ok: false, error: t("ai.errors.premiumRequired") };
    }

    const error = validateAi(ai, (await getAiGlobalConfig()).caps, t);
    if (error) return { ok: false, error };

    const persona = ai.persona?.trim() ? ai.persona.trim() : null;

    await guild.set("ai.enabled", ai.enabled);
    await guild.set("ai.channels", ai.channels);
    await guild.set("ai.ignore_channels", ai.ignore_channels);
    await guild.set("ai.model", ai.model);
    await guild.set("ai.persona", persona);
    await guild.set("ai.limits", {
      user_per_minute: ai.limits.user_per_minute,
      user_per_day: ai.limits.user_per_day,
      guild_per_day: ai.limits.guild_per_day,
    });

    revalidatePath(`/dashboard/${guildId}/ai`);

    return { ok: true };
  } catch (error) {
    console.error("[AI Action Error]:", error);
    if (error instanceof SyntaxError) return { ok: false, error: t("ai.errors.parseFailed") };
    return { ok: false, error: t("ai.errors.internalSave") };
  }
}

function validateAi(ai: AiSettings, caps: AiGlobalConfig["caps"], t: Translator): string | null {
  if (typeof ai?.enabled !== "boolean") return t("ai.errors.invalid");

  if (!AI_MODEL_CHOICES.includes(ai.model)) return t("ai.errors.model");

  for (const list of [ai.channels, ai.ignore_channels]) {
    if (!Array.isArray(list) || list.length > MAX_CHANNELS) {
      return t("ai.errors.channelsLimit", { max: MAX_CHANNELS });
    }
    if (list.some((entry) => !SNOWFLAKE.test(String(entry)))) {
      return t("ai.errors.channelsInvalid");
    }
  }

  if (ai.persona !== null && typeof ai.persona !== "string") return t("ai.errors.invalid");
  if ((ai.persona?.length ?? 0) > AI_PERSONA_MAX_LENGTH) {
    return t("ai.errors.personaLength", { max: AI_PERSONA_MAX_LENGTH });
  }

  const bounds = limitBounds(caps);
  for (const field of Object.keys(bounds) as (keyof AiLimits)[]) {
    const { min, max } = bounds[field];
    const value = (ai.limits as unknown as Record<string, unknown> | undefined)?.[field];
    if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
      return t("ai.errors.limit", { limit: t(`ai.limits.${field}`), min, max });
    }
  }

  return null;
}
