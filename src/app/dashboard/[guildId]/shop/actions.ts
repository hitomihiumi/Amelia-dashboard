"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Guild } from "@/lib/db/Guild";
import { revalidatePath } from "next/cache";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { GuildActionState } from "@/types/dashboard";

export async function updateShop(guildId: string, formData: FormData): Promise<GuildActionState> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { ok: false, error: "Not authorized." };

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const rolesRaw = formData.get("roles");

    if (!rolesRaw) {
      return { ok: false, error: "Missing required data to save." };
    }

    let roles: any[];
    try {
      roles = JSON.parse(rolesRaw as string);
    } catch (e) {
      return { ok: false, error: "Invalid data format." };
    }

    if (!Array.isArray(roles)) {
      return { ok: false, error: "Roles must be an array." };
    }

    const uniqueRoles = new Set();
    for (const item of roles) {
      if (!item.role || typeof item.role !== "string") {
        return { ok: false, error: "Invalid role ID." };
      }
      if (uniqueRoles.has(item.role)) {
        return { ok: false, error: `Duplicate role detected: ${item.role}` };
      }
      uniqueRoles.add(item.role);

      if (
        typeof item.price !== "number" ||
        isNaN(item.price) ||
        item.price <= 0 ||
        item.price >= 1000000
      ) {
        return { ok: false, error: "Price must be a valid number between 1 and 999999." };
      }

      const discount = item.discount;
      if (!discount) {
        return { ok: false, error: "Missing discount information." };
      }

      if (
        typeof discount.amount !== "number" ||
        isNaN(discount.amount) ||
        discount.amount < 0 ||
        discount.amount > 100
      ) {
        return { ok: false, error: "Discount amount must be between 0 and 100." };
      }

      if (discount.starts_at !== null && typeof discount.starts_at !== "number") {
        return { ok: false, error: "Invalid discount start time format." };
      }

      if (discount.expires_at !== null && typeof discount.expires_at !== "number") {
        return { ok: false, error: "Invalid discount expiration time format." };
      }

      if (discount.starts_at && discount.expires_at && discount.starts_at >= discount.expires_at) {
        return { ok: false, error: "Discount start time must be before expiration time." };
      }
    }

    const guild = new Guild(guildId);

    await guild.set("economy.shop.roles", roles);

    revalidatePath(`/dashboard/${guildId}/shop`);

    return { ok: true };
  } catch (error) {
    console.error("[Economy Update Error]:", error);

    if (error instanceof SyntaxError) {
      return { ok: false, error: "Data format error." };
    }

    return { ok: false, error: "Internal server error while saving settings." };
  }
}
