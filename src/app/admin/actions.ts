"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { requireSiteAdmin } from "@/lib/admin/access";
import { NEWS_CATEGORIES, slugify } from "@/lib/news/categories";

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
      return { ok: false, error: "The title must be between 3 and 200 characters." };
    }
    if (!content) return { ok: false, error: "The post body cannot be empty." };
    if (content.length > 50_000) return { ok: false, error: "The post body is too long." };
    if (!NEWS_CATEGORIES.includes(category as never)) {
      return { ok: false, error: "Unknown category." };
    }
    if (summary.length > 400) return { ok: false, error: "The summary is too long." };
    if (coverUrl && !/^https?:\/\/\S+$/i.test(coverUrl)) {
      return { ok: false, error: "The cover must be a link to an image." };
    }

    const slug = slugify(slugInput || title);

    // Slugs are the public URL, so they have to stay unique.
    const clash = await prisma.newsPost.findFirst({
      where: { slug, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    if (clash) return { ok: false, error: `The slug "${slug}" is already taken.` };

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
      if (!existing) return { ok: false, error: "Post not found." };

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
    return { ok: false, error: "Internal server error occurred while saving." };
  }
}

export async function deleteNewsPost(id: string): Promise<AdminActionState> {
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const post = await prisma.newsPost.delete({ where: { id } });

    revalidateNews(post.slug);
    return { ok: true };
  } catch (error) {
    console.error("[Admin News Delete Error]:", error);
    return { ok: false, error: "Could not delete the post." };
  }
}

/** Manually opened incident. */
export async function createIncident(formData: FormData): Promise<AdminActionState> {
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const severity = String(formData.get("severity") ?? "minor");
    const component = String(formData.get("component") ?? "").trim();

    if (title.length < 3 || title.length > 200) {
      return { ok: false, error: "The title must be between 3 and 200 characters." };
    }
    if (!SEVERITIES.includes(severity)) return { ok: false, error: "Unknown severity." };
    if (component && !SERVICE_KEYS.includes(component)) {
      return { ok: false, error: "Unknown component." };
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
    return { ok: false, error: "Could not create the incident." };
  }
}

/** Post an update on an incident, optionally resolving it. */
export async function addIncidentUpdate(formData: FormData): Promise<AdminActionState> {
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const incidentId = String(formData.get("incidentId") ?? "");
    const status = String(formData.get("status") ?? "monitoring");
    const body = String(formData.get("body") ?? "").trim();

    if (!INCIDENT_STATUSES.includes(status)) return { ok: false, error: "Unknown status." };
    if (!body || body.length > 2000) {
      return { ok: false, error: "The update must be between 1 and 2000 characters." };
    }

    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return { ok: false, error: "Incident not found." };

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
    return { ok: false, error: "Could not update the incident." };
  }
}

export async function deleteIncident(id: string): Promise<AdminActionState> {
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    await prisma.incident.delete({ where: { id } });

    revalidatePath("/status");
    revalidatePath("/admin/incidents");
    return { ok: true };
  } catch (error) {
    console.error("[Admin Incident Delete Error]:", error);
    return { ok: false, error: "Could not delete the incident." };
  }
}

/** Site wide configuration: banner, links, landing copy and status overrides. */
export async function updateGlobalConfig(formData: FormData): Promise<AdminActionState> {
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const raw = formData.get("config");
    if (!raw) return { ok: false, error: "Required data is missing." };

    const config = JSON.parse(raw as string) as Record<string, unknown>;

    const bannerVariant = String(config.bannerVariant ?? "warning");
    if (!BANNER_VARIANTS.includes(bannerVariant)) {
      return { ok: false, error: "Unknown banner variant." };
    }

    for (const key of ["inviteUrl", "supportUrl", "githubUrl"] as const) {
      const value = config[key];
      if (value && !/^https?:\/\/\S+$/i.test(String(value))) {
        return { ok: false, error: `"${key}" must be a valid link.` };
      }
    }

    const overrides = (config.serviceOverrides ?? {}) as Record<
      string,
      { status?: string; note?: string | null }
    >;

    for (const [key, override] of Object.entries(overrides)) {
      if (!SERVICE_KEYS.includes(key)) return { ok: false, error: `Unknown service "${key}".` };
      if (override?.status && !SERVICE_STATUSES.includes(override.status)) {
        return { ok: false, error: `Unknown status for "${key}".` };
      }
    }

    const text = (value: unknown, max: number) => {
      const trimmed = String(value ?? "").trim();
      return trimmed ? trimmed.slice(0, max) : null;
    };

    await prisma.globalConfig.upsert({
      where: { id: "global" },
      create: { id: "global" },
      update: {},
    });

    await prisma.globalConfig.update({
      where: { id: "global" },
      data: {
        bannerEnabled: Boolean(config.bannerEnabled),
        bannerText: text(config.bannerText, 300),
        bannerVariant,
        inviteUrl: text(config.inviteUrl, 500),
        supportUrl: text(config.supportUrl, 500),
        githubUrl: text(config.githubUrl, 500),
        heroTagline: text(config.heroTagline, 120),
        heroText: text(config.heroText, 400),
        maintenance: Boolean(config.maintenance),
        maintenanceMessage: text(config.maintenanceMessage, 300),
        serviceOverrides: overrides as object,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/status");
    revalidatePath("/admin/config");
    return { ok: true };
  } catch (error) {
    console.error("[Admin Config Error]:", error);
    if (error instanceof SyntaxError) return { ok: false, error: "Failed to parse data payload." };
    return { ok: false, error: "Could not save the configuration." };
  }
}
