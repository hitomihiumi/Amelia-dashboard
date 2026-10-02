"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { revalidatePath } from "next/cache";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { GuildActionState } from "@/types/dashboard";
import { getT } from "@/i18n/server";

export async function updateShop(guildId: string, formData: FormData): Promise<GuildActionState> {
  const t = await getT();
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { ok: false, error: t("settings.errors.notAuthorized") };

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const rolesRaw = formData.get("roles");

    if (!rolesRaw) {
      return { ok: false, error: t("settings.errors.missingData") };
    }

    let roles: any[];
    try {
      roles = JSON.parse(rolesRaw as string);
    } catch (e) {
      return { ok: false, error: t("settings.errors.invalidFormat") };
    }

    if (!Array.isArray(roles)) {
      return { ok: false, error: t("settings.shop.errors.rolesArray") };
    }

    const uniqueRoles = new Set();
    for (const item of roles) {
      if (!item.role || typeof item.role !== "string") {
        return { ok: false, error: t("settings.shop.errors.invalidRole") };
      }
      if (uniqueRoles.has(item.role)) {
        return { ok: false, error: t("settings.shop.errors.duplicateRole", { role: item.role }) };
      }
      uniqueRoles.add(item.role);

      if (
        typeof item.price !== "number" ||
        isNaN(item.price) ||
        item.price <= 0 ||
        item.price >= 1000000
      ) {
        return { ok: false, error: t("settings.shop.errors.price") };
      }

      const discount = item.discount;
      if (!discount) {
        return { ok: false, error: t("settings.shop.errors.missingDiscount") };
      }

      if (
        typeof discount.amount !== "number" ||
        isNaN(discount.amount) ||
        discount.amount < 0 ||
        discount.amount > 100
      ) {
        return { ok: false, error: t("settings.shop.errors.discountAmount") };
      }

      if (discount.starts_at !== null && typeof discount.starts_at !== "number") {
        return { ok: false, error: t("settings.shop.errors.discountStart") };
      }

      if (discount.expires_at !== null && typeof discount.expires_at !== "number") {
        return { ok: false, error: t("settings.shop.errors.discountExpiry") };
      }

      if (discount.starts_at && discount.expires_at && discount.starts_at >= discount.expires_at) {
        return { ok: false, error: t("settings.shop.errors.discountOrder") };
      }
    }

    const guild = new Guild(guildId);

    await guild.set("economy.shop.roles", roles);

    revalidatePath(`/dashboard/${guildId}/shop`);

    return { ok: true };
  } catch (error) {
    console.error("[Shop Update Error]:", error);

    if (error instanceof SyntaxError) {
      return { ok: false, error: t("settings.errors.dataFormat") };
    }

    return { ok: false, error: t("settings.errors.internalSave") };
  }
}
