"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { requireSiteAdmin } from "@/lib/admin/access";
import { CONFIG_LIMITS, isValidLink, type ServiceOverride } from "@/lib/admin/defaults";
import { getT } from "@/i18n/server";

export type AdminActionState = { ok: true; id?: string } | { ok: false; error: string };

const BANNER_VARIANTS = ["info", "warning", "danger", "success"];
const SERVICE_KEYS = ["gateway", "database", "website", "shards"];
const SERVICE_STATUSES = ["operational", "degraded", "down", "maintenance"];

/** Site wide configuration: banner, links, landing copy and status overrides. */
export async function updateGlobalConfig(formData: FormData): Promise<AdminActionState> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const raw = formData.get("config");
    if (!raw) return { ok: false, error: t("admin.errors.missingData") };

    const config = JSON.parse(raw as string) as Record<string, unknown>;

    const bannerVariant = String(config.bannerVariant ?? "warning");
    if (!BANNER_VARIANTS.includes(bannerVariant)) {
      return { ok: false, error: t("admin.errors.unknownBannerVariant") };
    }

    const linkFields = {
      inviteUrl: t("admin.config.links.invite"),
      supportUrl: t("admin.config.links.support"),
      githubUrl: t("admin.config.links.github"),
    } as const;

    for (const key of Object.keys(linkFields) as (keyof typeof linkFields)[]) {
      const value = String(config[key] ?? "").trim();
      if (value && !isValidLink(value)) {
        return { ok: false, error: t("admin.errors.invalidLink", { field: linkFields[key] }) };
      }
    }

    const rawOverrides =
      config.serviceOverrides && typeof config.serviceOverrides === "object"
        ? (config.serviceOverrides as Record<string, ServiceOverride | undefined>)
        : {};

    const text = (value: unknown, max: number) => {
      const trimmed = String(value ?? "").trim();
      return trimmed ? trimmed.slice(0, max) : null;
    };

    // Only a recognised service with an actual status is stored; an empty status
    // means "trust the measurement" and the entry is dropped.
    const overrides: Record<string, ServiceOverride> = {};

    for (const [key, override] of Object.entries(rawOverrides)) {
      if (!(SERVICE_KEYS as readonly string[]).includes(key)) {
        return { ok: false, error: t("admin.errors.unknownService", { service: key }) };
      }
      if (!override?.status) continue;
      if (!(SERVICE_STATUSES as readonly string[]).includes(override.status)) {
        return { ok: false, error: t("admin.errors.unknownServiceStatus", { service: key }) };
      }
      overrides[key] = {
        status: override.status,
        note: text(override.note, CONFIG_LIMITS.serviceNote),
      };
    }

    await prisma.globalConfig.upsert({
      where: { id: "global" },
      create: { id: "global" },
      update: {},
    });

    await prisma.globalConfig.update({
      where: { id: "global" },
      data: {
        bannerEnabled: Boolean(config.bannerEnabled),
        bannerText: text(config.bannerText, CONFIG_LIMITS.bannerText),
        bannerVariant,
        inviteUrl: text(config.inviteUrl, CONFIG_LIMITS.url),
        supportUrl: text(config.supportUrl, CONFIG_LIMITS.url),
        githubUrl: text(config.githubUrl, CONFIG_LIMITS.url),
        heroTagline: text(config.heroTagline, CONFIG_LIMITS.heroTagline),
        heroText: text(config.heroText, CONFIG_LIMITS.heroText),
        maintenance: Boolean(config.maintenance),
        maintenanceMessage: text(config.maintenanceMessage, CONFIG_LIMITS.maintenanceMessage),
        serviceOverrides: overrides as object,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/status");
    revalidatePath("/admin/config");
    return { ok: true };
  } catch (error) {
    console.error("[Admin Config Error]:", error);
    if (error instanceof SyntaxError) return { ok: false, error: t("admin.errors.parseFailed") };
    return { ok: false, error: t("admin.errors.configSaveFailed") };
  }
}
