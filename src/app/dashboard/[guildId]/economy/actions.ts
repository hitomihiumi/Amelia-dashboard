"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Guild } from "@/lib/db/Guild";
import { revalidatePath } from "next/cache";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { GuildActionState } from "@/types/dashboard";
import { GuildSchema } from "@/lib/db/types";

export async function updateEconomySettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { ok: false, error: "Not authorized." };

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const incomeRaw = formData.get("income");
    const currencyRaw = formData.get("currency");

    if (!incomeRaw || !currencyRaw) {
      return { ok: false, error: "Missing required data to save." };
    }

    const income = JSON.parse(incomeRaw as string) as GuildSchema["economy"]["income"];
    const currency = JSON.parse(currencyRaw as string) as GuildSchema["economy"]["currency"];

    if (
      typeof income.work.min !== "number" ||
      typeof income.work.max !== "number" ||
      typeof income.timely.amount !== "number" ||
      typeof income.daily.amount !== "number" ||
      typeof income.weekly.amount !== "number" ||
      typeof income.rob.income.min !== "number" ||
      typeof income.rob.income.max !== "number" ||
      typeof income.rob.punishment.min !== "number" ||
      typeof income.rob.punishment.max !== "number" ||
      typeof income.rob.punishment.fail_chance !== "number" ||
      typeof income.rob.cooldown !== "number" ||
      typeof income.work.cooldown !== "number"
    ) {
      return { ok: false, error: "Invalid data format." };
    }
    if (income.work.min <= 0 || income.work.max <= 0) {
      return { ok: false, error: "Salary cannot be negative." };
    }
    if (income.work.min > 10000) {
      return { ok: false, error: "Minimum salary out of range." };
    }
    if (income.work.max > 100000) {
      return { ok: false, error: "Maximum salary out of range." };
    }
    if (income.work.min >= income.work.max) {
      return { ok: false, error: "Minimum salary cannot be greater than maximum salary." };
    }
    if (income.work.cooldown <= 0) {
      return { ok: false, error: "Work cooldown cannot be negative." };
    }
    if (income.work.cooldown > 86400) {
      return { ok: false, error: "Work cooldown cannot be greater than 24 hours." };
    }

    if (income.timely.amount <= 0)
      return { ok: false, error: "Timely bonus amount cannot be negative." };
    if (income.daily.amount <= 0)
      return { ok: false, error: "Daily bonus amount cannot be negative." };
    if (income.weekly.amount <= 0)
      return { ok: false, error: "Weekly bonus amount cannot be negative." };

    if (income.rob.cooldown <= 0) {
      return { ok: false, error: "Rob cooldown cannot be negative." };
    }
    if (income.rob.cooldown > 86400) {
      return { ok: false, error: "Rob cooldown cannot be greater than 24 hours." };
    }

    if (income.rob.income.min <= 0 || income.rob.income.max <= 0) {
      return { ok: false, error: "Rob income cannot be negative." };
    }
    if (
      (income.rob.income.type === "fixed" && income.rob.income.min > 10000) ||
      (income.rob.income.type === "percentage" && income.rob.income.min > 99)
    ) {
      return { ok: false, error: "Minimum salary out of range." };
    }
    if (
      (income.rob.income.type === "fixed" && income.rob.income.max > 100000) ||
      (income.rob.income.type === "percentage" && income.rob.income.max > 100)
    ) {
      return { ok: false, error: "Maximum salary out of range." };
    }
    if (income.rob.income.min >= income.rob.income.max) {
      return { ok: false, error: "Minimum rob income cannot be greater than maximum rob income." };
    }
    if (income.rob.punishment.min <= 0 || income.rob.punishment.max <= 0) {
      return { ok: false, error: "Rob punishment cannot be negative." };
    }
    if (
      (income.rob.punishment.type === "fixed" && income.rob.punishment.min > 10000) ||
      (income.rob.punishment.type === "percentage" && income.rob.punishment.min > 99)
    ) {
      return { ok: false, error: "Rob punishment out of range." };
    }
    if (
      (income.rob.punishment.type === "fixed" && income.rob.punishment.max > 100000) ||
      (income.rob.punishment.type === "percentage" && income.rob.punishment.max > 100)
    ) {
      return { ok: false, error: "Rob punishment out of range." };
    }
    if (income.rob.punishment.min >= income.rob.punishment.max) {
      return {
        ok: false,
        error: "Minimum rob punishment cannot be greater than maximum rob punishment.",
      };
    }
    if (income.rob.punishment.fail_chance < 5 || income.rob.punishment.fail_chance > 95) {
      return { ok: false, error: "Rob fail chance must be between 0 and 100." };
    }

    const guild = new Guild(guildId);

    await guild.set("economy.currency", currency);
    await guild.set("economy.income", income);

    revalidatePath(`/dashboard/${guildId}/economy`);

    return { ok: true };
  } catch (error) {
    console.error("[Economy Update Error]:", error);

    if (error instanceof SyntaxError) {
      return { ok: false, error: "Data format error." };
    }

    return { ok: false, error: "Internal server error while saving settings." };
  }
}
