"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { requireSiteAdmin } from "@/lib/admin/access";
import { NEWS_CATEGORIES, slugify } from "@/lib/news/categories";
import { CONFIG_LIMITS, isValidLink, type ServiceOverride } from "@/lib/admin/defaults";
import { getT } from "@/i18n/server";

export type AdminActionState = { ok: true; id?: string } | { ok: false; error: string };

const SEVERITIES = ["minor", "major", "critical", "maintenance"];
const INCIDENT_STATUSES = ["investigating", "identified", "monitoring", "resolved"];
const BANNER_VARIANTS = ["info", "warning", "danger", "success"];
const SERVICE_KEYS = ["gateway", "database", "website", "shards"];
const SERVICE_STATUSES = ["operational", "degraded", "down", "maintenance"];

function revalidateNews(slug?: string) {
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/admin/news");
  if (slug) revalidatePath(`/news/${slug}`);
}

/** Create or update a post. An empty `id` means "create". */
export async function saveNewsPost(formData: FormData): Promise<AdminActionState> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const id = String(formData.get("id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const category = String(formData.get("category") ?? "update");
    const summary = String(formData.get("summary") ?? "").trim();
    const coverUrl = String(formData.get("coverUrl") ?? "").trim();
    const published = formData.get("published") === "true";
    const slugInput = String(formData.get("slug") ?? "").trim();

    if (title.length < 3 || title.length > 200) {
      return { ok: false, error: t("admin.errors.titleLength") };
    }
    if (!content) return { ok: false, error: t("admin.errors.bodyEmpty") };
    if (content.length > 50_000) return { ok: false, error: t("admin.errors.bodyTooLong") };
    if (!NEWS_CATEGORIES.includes(category as never)) {
      return { ok: false, error: t("admin.errors.unknownCategory") };
    }
    if (summary.length > 400) return { ok: false, error: t("admin.errors.summaryTooLong") };
    if (coverUrl && !/^https?:\/\/\S+$/i.test(coverUrl)) {
      return { ok: false, error: t("admin.errors.coverInvalid") };
    }

    const slug = slugify(slugInput || title);

    // Slugs are the public URL, so they have to stay unique.
    const clash = await prisma.newsPost.findFirst({
      where: { slug, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    if (clash) return { ok: false, error: t("admin.errors.slugTaken", { slug }) };

    const data = {
      slug,
      title,
      summary: summary || null,
      content,
      category,
      coverUrl: coverUrl || null,
      published,
    };

    if (id) {
      const existing = await prisma.newsPost.findUnique({ where: { id } });
      if (!existing) return { ok: false, error: t("admin.errors.postNotFound") };

      const post = await prisma.newsPost.update({
        where: { id },
        data: {
          ...data,
          // The publication date is set once, when the post first goes live.
          publishedAt: published ? (existing.publishedAt ?? new Date()) : null,
        },
      });

      revalidateNews(post.slug);
      if (existing.slug !== post.slug) revalidatePath(`/news/${existing.slug}`);
      return { ok: true, id: post.id };
    }

    const post = await prisma.newsPost.create({
      data: {
        ...data,
        authorId: gate.admin.id,
        publishedAt: published ? new Date() : null,
      },
    });

    revalidateNews(post.slug);
    return { ok: true, id: post.id };
  } catch (error) {
    console.error("[Admin News Error]:", error);
    return { ok: false, error: t("admin.errors.saveFailed") };
  }
}

export async function deleteNewsPost(id: string): Promise<AdminActionState> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const post = await prisma.newsPost.delete({ where: { id } });

    revalidateNews(post.slug);
    return { ok: true };
  } catch (error) {
    console.error("[Admin News Delete Error]:", error);
    return { ok: false, error: t("admin.errors.deletePostFailed") };
  }
}

/** Manually opened incident. */
export async function createIncident(formData: FormData): Promise<AdminActionState> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const severity = String(formData.get("severity") ?? "minor");
    const component = String(formData.get("component") ?? "").trim();

    if (title.length < 3 || title.length > 200) {
      return { ok: false, error: t("admin.errors.titleLength") };
    }
    if (!SEVERITIES.includes(severity)) return { ok: false, error: t("admin.errors.unknownSeverity") };
    if (component && !SERVICE_KEYS.includes(component)) {
      return { ok: false, error: t("admin.errors.unknownComponent") };
    }

    const incident = await prisma.incident.create({
      data: {
        title,
        body: body || null,
        severity,
        component: component || null,
        auto: false,
        updates: body ? { create: { status: "investigating", body } } : undefined,
      },
    });

    revalidatePath("/status");
    revalidatePath("/admin/incidents");
    return { ok: true, id: incident.id };
  } catch (error) {
    console.error("[Admin Incident Error]:", error);
    return { ok: false, error: t("admin.errors.incidentCreateFailed") };
  }
}

/** Post an update on an incident, optionally resolving it. */
export async function addIncidentUpdate(formData: FormData): Promise<AdminActionState> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const incidentId = String(formData.get("incidentId") ?? "");
    const status = String(formData.get("status") ?? "monitoring");
    const body = String(formData.get("body") ?? "").trim();

    if (!INCIDENT_STATUSES.includes(status)) return { ok: false, error: t("admin.errors.unknownStatus") };
    if (!body || body.length > 2000) {
      return { ok: false, error: t("admin.errors.updateLength") };
    }

    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return { ok: false, error: t("admin.errors.incidentNotFound") };

    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status,
        resolvedAt: status === "resolved" ? (incident.resolvedAt ?? new Date()) : null,
        updates: { create: { status, body } },
      },
    });

    revalidatePath("/status");
    revalidatePath("/admin/incidents");
    return { ok: true };
  } catch (error) {
    console.error("[Admin Incident Update Error]:", error);
    return { ok: false, error: t("admin.errors.incidentUpdateFailed") };
  }
}

export async function deleteIncident(id: string): Promise<AdminActionState> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    await prisma.incident.delete({ where: { id } });

    revalidatePath("/status");
    revalidatePath("/admin/incidents");
    return { ok: true };
  } catch (error) {
    console.error("[Admin Incident Delete Error]:", error);
    return { ok: false, error: t("admin.errors.incidentDeleteFailed") };
  }
}

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
