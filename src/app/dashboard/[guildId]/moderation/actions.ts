"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { GuildActionState } from "@/types/dashboard";
import type {
  AuditSettings,
  GuildSchema,
  ModerationForm,
  ModerationSubmissionStatus,
  WarnThreshold,
} from "@/lib/db/types";
import { AUDIT_EVENT_KEYS } from "@/lib/db/types";
import { normalizeForm, validateFormConfiguration } from "@/lib/moderation/forms";
import { validateLinkPattern } from "@/lib/moderation/linkPatterns";
import { resolveSubmission, revokeCase } from "@/lib/moderation/service";
import { syncAuditWebhooks } from "@/lib/moderation/webhooks";

type ModerationSettings = {
  moderation_roles: string[];
  log_channel: string | null;
  dm_notify: boolean;
  warn_expiry: number;
  warn_thresholds: WarnThreshold[];
};

type AutoModeration = GuildSchema["moderation"]["auto_moderation"];

const SNOWFLAKE = /^\d{17,20}$/;
const PUNISHMENT_TYPES = ["warn", "mute", "kick", "ban"];

/** General moderation settings plus both auto moderation rules. */
export async function updateModerationSettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  try {
    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const settingsRaw = formData.get("settings");
    const autoModRaw = formData.get("auto_moderation");

    if (!settingsRaw || !autoModRaw) return { ok: false, error: "Required data is missing." };

    const settings = JSON.parse(settingsRaw as string) as ModerationSettings;
    const autoMod = JSON.parse(autoModRaw as string) as AutoModeration;

    const settingsError = validateSettings(settings);
    if (settingsError) return { ok: false, error: settingsError };

    const autoModError = validateAutoModeration(autoMod);
    if (autoModError) return { ok: false, error: autoModError };

    const guild = new Guild(guildId);

    await guild.set("moderation.moderation_roles", settings.moderation_roles);
    await guild.set("moderation.log_channel", settings.log_channel);
    await guild.set("moderation.dm_notify", settings.dm_notify);
    await guild.set("moderation.warn_expiry", settings.warn_expiry);
    await guild.set("moderation.warn_thresholds", settings.warn_thresholds);
    await guild.set("moderation.auto_moderation", autoMod);

    revalidatePath(`/dashboard/${guildId}/moderation`);
    return { ok: true };
  } catch (error) {
    console.error("[Moderation Action Error]:", error);
    if (error instanceof SyntaxError) return { ok: false, error: "Failed to parse data payload." };
    return { ok: false, error: "Internal server error occurred while saving." };
  }
}

function validateSettings(settings: ModerationSettings): string | null {
  if (!Array.isArray(settings.moderation_roles) || settings.moderation_roles.length > 25) {
    return "Moderation roles must be a list of at most 25 roles.";
  }
  if (settings.moderation_roles.some((role) => !SNOWFLAKE.test(role))) {
    return "Invalid role selected.";
  }
  if (settings.log_channel !== null && !SNOWFLAKE.test(String(settings.log_channel))) {
    return "Invalid moderation log channel.";
  }
  if (
    typeof settings.warn_expiry !== "number" ||
    settings.warn_expiry < 0 ||
    settings.warn_expiry > 365
  ) {
    return "Warn expiry must be between 0 and 365 days.";
  }
  if (!Array.isArray(settings.warn_thresholds) || settings.warn_thresholds.length > 10) {
    return "You can configure at most 10 escalation rules.";
  }

  const seen = new Set<number>();

  for (const rule of settings.warn_thresholds) {
    if (typeof rule?.count !== "number" || rule.count < 1 || rule.count > 100) {
      return "Every escalation rule needs a warn count between 1 and 100.";
    }
    if (seen.has(rule.count)) return "Escalation rules must use distinct warn counts.";
    seen.add(rule.count);

    if (!PUNISHMENT_TYPES.includes(String(rule.punishment?.type))) {
      return "Every escalation rule needs a valid punishment.";
    }
    if (
      typeof rule.punishment.time !== "number" ||
      rule.punishment.time < 0 ||
      rule.punishment.time > 2_419_200
    ) {
      return "Escalation durations must be between 0 and 28 days.";
    }
  }

  return null;
}

function validateAutoModeration(autoMod: AutoModeration): string | null {
  for (const key of ["invite", "links"] as const) {
    const rule = autoMod?.[key];
    if (!rule) return "Auto moderation data is incomplete.";

    if (!Array.isArray(rule.ignore_channels) || rule.ignore_channels.length > 50) {
      return "Ignored channels must be a list of at most 50 channels.";
    }
    if (!Array.isArray(rule.ignore_roles) || rule.ignore_roles.length > 50) {
      return "Ignored roles must be a list of at most 50 roles.";
    }
    if (!PUNISHMENT_TYPES.includes(String(rule.punishment?.type))) {
      return "Every auto moderation rule needs a valid punishment.";
    }
    if (
      typeof rule.punishment.time !== "number" ||
      rule.punishment.time < 0 ||
      rule.punishment.time > 2_419_200
    ) {
      return "Auto moderation durations must be between 0 and 28 days.";
    }
    if (typeof rule.punishment.reason !== "string" || rule.punishment.reason.length > 400) {
      return "Auto moderation reasons must be at most 400 characters long.";
    }
  }

  if (!Array.isArray(autoMod.links.ignore_links) || autoMod.links.ignore_links.length > 100) {
    return "The link whitelist accepts at most 100 entries.";
  }

  for (const pattern of autoMod.links.ignore_links) {
    if (typeof pattern !== "string") return "The link whitelist accepts text patterns only.";

    const error = validateLinkPattern(pattern);
    if (error) return error;
  }

  return null;
}

/** Report and appeal form configuration coming from the form builder. */
export async function updateModerationForms(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  try {
    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const reportRaw = formData.get("report");
    const appealRaw = formData.get("appeal");

    if (!reportRaw || !appealRaw) return { ok: false, error: "Required data is missing." };

    const report = normalizeForm(JSON.parse(reportRaw as string) as ModerationForm, "report");
    const appeal = normalizeForm(JSON.parse(appealRaw as string) as ModerationForm, "appeal");

    const reportError = validateFormConfiguration(report);
    if (reportError) return { ok: false, error: `Report form: ${reportError}` };

    const appealError = validateFormConfiguration(appeal);
    if (appealError) return { ok: false, error: `Appeal form: ${appealError}` };

    const guild = new Guild(guildId);

    await guild.set("moderation.forms.report", report);
    await guild.set("moderation.forms.appeal", appeal);

    revalidatePath(`/dashboard/${guildId}/moderation/forms`);
    return { ok: true };
  } catch (error) {
    console.error("[Moderation Forms Action Error]:", error);
    if (error instanceof SyntaxError) return { ok: false, error: "Failed to parse data payload." };
    return { ok: false, error: "Internal server error occurred while saving." };
  }
}

/** Approve, reject or claim a submission from the dashboard queue. */
export async function handleSubmission(
  guildId: string,
  submissionId: string,
  status: ModerationSubmissionStatus,
  response: string | null,
): Promise<GuildActionState> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { ok: false, error: "Not authorized." };

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    if (!["in_review", "approved", "rejected"].includes(status)) {
      return { ok: false, error: "Unknown status." };
    }

    const trimmed = response?.trim().slice(0, 1000) || null;

    const result = await resolveSubmission(guildId, submissionId, status, session.user.id, trimmed);

    if (!result.ok) return { ok: false, error: result.error };

    revalidatePath(`/dashboard/${guildId}/moderation/queue`);
    return { ok: true };
  } catch (error) {
    console.error("[Submission Handling Error]:", error);
    return { ok: false, error: "Internal server error occurred." };
  }
}

/** Revoke a case (unwarn / unmute / unban) from the case log. */
export async function revokeModerationCase(
  guildId: string,
  caseNumber: number,
  reason: string,
): Promise<GuildActionState> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { ok: false, error: "Not authorized." };

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const result = await revokeCase(
      guildId,
      caseNumber,
      session.user.id,
      reason.trim().slice(0, 400) || "Revoked from the dashboard",
    );

    if (!result.ok) return { ok: false, error: result.error };

    revalidatePath(`/dashboard/${guildId}/moderation/cases`);
    return { ok: true };
  } catch (error) {
    console.error("[Case Revoke Error]:", error);
    return { ok: false, error: "Internal server error occurred." };
  }
}

/** Audit log settings, including the webhooks the log posts through. */
export async function updateAuditSettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  try {
    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const raw = formData.get("audit");
    if (!raw) return { ok: false, error: "Required data is missing." };

    const audit = JSON.parse(raw as string) as AuditSettings;

    const error = validateAudit(audit);
    if (error) return { ok: false, error };

    const guild = new Guild(guildId);

    await guild.set("audit.enabled", audit.enabled);
    await guild.set("audit.channel", audit.channel);
    await guild.set("audit.ignore_channels", audit.ignore_channels);
    await guild.set("audit.ignore_roles", audit.ignore_roles);
    await guild.set("audit.ignore_bots", audit.ignore_bots);
    await guild.set("audit.webhook.name", audit.webhook.name);
    await guild.set("audit.webhook.avatar", audit.webhook.avatar);
    await guild.set("audit.events", audit.events);

    // Create the webhooks up front so the admin finds out about missing
    // permissions here, and not when the first event silently goes nowhere.
    let webhookError: string | null = null;

    if (audit.enabled) {
      const channels = [
        audit.channel,
        ...Object.values(audit.events)
          .filter((event) => event?.enabled)
          .map((event) => event?.channel ?? null),
      ].filter((channel): channel is string => Boolean(channel));

      webhookError = await syncAuditWebhooks(
        guildId,
        channels,
        audit.webhook.name,
        audit.webhook.avatar,
      );
    }

    revalidatePath(`/dashboard/${guildId}/moderation/audit`);

    return webhookError ? { ok: false, error: webhookError } : { ok: true };
  } catch (error) {
    console.error("[Audit Action Error]:", error);
    if (error instanceof SyntaxError) return { ok: false, error: "Failed to parse data payload." };
    return { ok: false, error: "Internal server error occurred while saving." };
  }
}

function validateAudit(audit: AuditSettings): string | null {
  if (typeof audit?.enabled !== "boolean") return "Invalid audit log data.";

  if (audit.channel !== null && !SNOWFLAKE.test(String(audit.channel))) {
    return "Invalid audit log channel.";
  }
  if (audit.enabled && !audit.channel) {
    return "Choose the channel the audit log posts to before enabling it.";
  }

  for (const [field, list] of [
    ["Ignored channels", audit.ignore_channels],
    ["Ignored roles", audit.ignore_roles],
  ] as const) {
    if (!Array.isArray(list) || list.length > 50) {
      return `${field} must be a list of at most 50 entries.`;
    }
    if (list.some((entry) => !SNOWFLAKE.test(String(entry)))) {
      return `${field} contains an invalid ID.`;
    }
  }

  if (audit.webhook?.name && audit.webhook.name.length > 80) {
    return "The webhook name must be at most 80 characters long.";
  }
  if (audit.webhook?.avatar && !/^https?:\/\/\S+$/i.test(audit.webhook.avatar)) {
    return "The webhook avatar must be a link to an image.";
  }

  for (const [key, event] of Object.entries(audit.events ?? {})) {
    if (!AUDIT_EVENT_KEYS.includes(key as never)) return `Unknown audit event "${key}".`;
    if (typeof event?.enabled !== "boolean") return `Invalid configuration for "${key}".`;
    if (event.channel !== null && !SNOWFLAKE.test(String(event.channel))) {
      return `Invalid channel selected for "${key}".`;
    }
  }

  return null;
}
