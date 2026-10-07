"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { requireSiteAdmin } from "@/lib/admin/access";
import {
  AI_CAP_BOUNDS,
  AI_MODEL_KEYS,
  AI_QUOTA_BOUNDS,
  type AiGlobalConfig,
  type AiLimits,
  type AiModelQuota,
} from "@/lib/db/types";
import { getT } from "@/i18n/server";
import type { AdminActionState } from "../actions";

const SNOWFLAKE = /^\d{17,20}$/;
const NOTE_MAX = 200;

const isWholeNumber = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

/** Quota of the API key per model and the ceilings for what a server may set. */
export async function updateAiGlobalConfig(formData: FormData): Promise<AdminActionState> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const raw = formData.get("config");
    if (!raw) return { ok: false, error: t("admin.errors.missingData") };

    const config = JSON.parse(raw as string) as AiGlobalConfig;

    for (const model of AI_MODEL_KEYS) {
      for (const field of Object.keys(AI_QUOTA_BOUNDS) as (keyof AiModelQuota)[]) {
        const { min, max } = AI_QUOTA_BOUNDS[field];
        if (!isWholeNumber(config?.quota?.[model]?.[field], min, max)) {
          return {
            ok: false,
            error: t("adminAi.errors.range", {
              field: `${t(`adminAi.models.${model}`)} · ${t(`adminAi.quota.${field}`)}`,
              min,
              max,
            }),
          };
        }
      }
    }

    for (const field of Object.keys(AI_CAP_BOUNDS) as (keyof AiLimits)[]) {
      const { min, max } = AI_CAP_BOUNDS[field];
      if (!isWholeNumber(config?.caps?.[field], min, max)) {
        return {
          ok: false,
          error: t("adminAi.errors.range", { field: t(`adminAi.caps.${field}`), min, max }),
        };
      }
    }

    // Only the known numbers are stored, whatever else the payload carried.
    const quota = Object.fromEntries(
      AI_MODEL_KEYS.map((model) => [
        model,
        {
          rpm: config.quota[model].rpm,
          rpd: config.quota[model].rpd,
          tpm: config.quota[model].tpm,
        },
      ]),
    );
    const caps = {
      user_per_minute: config.caps.user_per_minute,
      user_per_day: config.caps.user_per_day,
      guild_per_day: config.caps.guild_per_day,
    };

    await prisma.aiConfig.upsert({
      where: { id: "global" },
      create: { id: "global", quota, caps },
      update: { quota, caps },
    });

    revalidatePath("/admin/ai");
    return { ok: true };
  } catch (error) {
    console.error("[Admin AI Config Error]:", error);
    if (error instanceof SyntaxError) return { ok: false, error: t("admin.errors.parseFailed") };
    return { ok: false, error: t("adminAi.errors.saveFailed") };
  }
}

/** The end of a `YYYY-MM-DD` day in UTC, or `null` when the text is not such a date. */
function endOfDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Give a server premium, or change the end date and note of one that has it.
 * `until` is a `YYYY-MM-DD` date (the whole day counts) or empty for no end.
 */
export async function grantPremium(
  guildId: string,
  until: string,
  note: string,
): Promise<AdminActionState> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const id = guildId.trim();
    if (!SNOWFLAKE.test(id)) return { ok: false, error: t("adminAi.errors.invalidGuild") };

    let premiumUntil: Date | null = null;
    if (until.trim()) {
      premiumUntil = endOfDay(until.trim());
      if (!premiumUntil) return { ok: false, error: t("adminAi.errors.invalidDate") };
      if (premiumUntil.getTime() <= Date.now()) {
        return { ok: false, error: t("adminAi.errors.pastDate") };
      }
    }

    const text = note.trim();
    if (text.length > NOTE_MAX) {
      return { ok: false, error: t("adminAi.errors.noteLength", { max: NOTE_MAX }) };
    }
    const premiumNote = text || null;

    // The server may not be known to the bot yet; premium waits for it.
    await prisma.guild.upsert({
      where: { id },
      create: { id, premium: true, premiumUntil, premiumNote },
      update: { premium: true, premiumUntil, premiumNote },
    });

    console.info(
      `[Admin] ${gate.admin.id} gave premium to ${id}, ${
        premiumUntil ? `until ${premiumUntil.toISOString()}` : "no end date"
      }`,
    );

    revalidatePath("/admin/ai");
    revalidatePath(`/dashboard/${id}/ai`);
    return { ok: true };
  } catch (error) {
    console.error("[Admin Premium Error]:", error);
    return { ok: false, error: t("adminAi.errors.saveFailed") };
  }
}

/** Take premium away. The server's own AI settings are kept for when it comes back. */
export async function revokePremium(guildId: string): Promise<AdminActionState> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const id = guildId.trim();
    if (!SNOWFLAKE.test(id)) return { ok: false, error: t("adminAi.errors.invalidGuild") };

    await prisma.guild.updateMany({
      where: { id },
      data: { premium: false, premiumUntil: null },
    });

    console.info(`[Admin] ${gate.admin.id} revoked premium of ${id}`);

    revalidatePath("/admin/ai");
    revalidatePath(`/dashboard/${id}/ai`);
    return { ok: true };
  } catch (error) {
    console.error("[Admin Premium Error]:", error);
    return { ok: false, error: t("adminAi.errors.saveFailed") };
  }
}
