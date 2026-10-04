"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { GuildActionState } from "@/types/dashboard";
import type {
  AuditCategory,
  AuditEventKey,
  AuditSettings,
  GuildSchema,
  ModerationForm,
  ModerationSubmissionStatus,
  WarnThreshold,
} from "@/lib/db/types";
import {
  AUDIT_CATEGORIES,
  AUDIT_EVENT_KEYS,
  resolveAuditChannel,
  resolveAuditEvent,
} from "@/lib/db/types";
import {
  normalizeForm,
  validateFormConfiguration,
} from "@/lib/moderation/forms";
import { describeLinkPatternIssue } from "@/lib/moderation/linkPatternMessages";
import { resolveSubmission, revokeCase } from "@/lib/moderation/service";
import { syncAuditWebhooks } from "@/lib/moderation/webhooks";
import { getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translate";

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
  const t = await getT();

  try {
    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const settingsRaw = formData.get("settings");
    const autoModRaw = formData.get("auto_moderation");

    if (!settingsRaw || !autoModRaw)
      return { ok: false, error: t("moderation.errors.missingData") };

    const settings = JSON.parse(settingsRaw as string) as ModerationSettings;
    const autoMod = JSON.parse(autoModRaw as string) as AutoModeration;

    const settingsError = validateSettings(settings, t);
    if (settingsError) return { ok: false, error: settingsError };

    const autoModError = validateAutoModeration(autoMod, t);
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
    if (error instanceof SyntaxError)
      return { ok: false, error: t("moderation.errors.parseFailed") };
    return { ok: false, error: t("moderation.errors.internalSave") };
  }
}

function validateSettings(
  settings: ModerationSettings,
  t: Translator,
): string | null {
  if (
    !Array.isArray(settings.moderation_roles) ||
    settings.moderation_roles.length > 25
  ) {
    return t("moderation.errors.rolesLimit");
  }
  if (settings.moderation_roles.some((role) => !SNOWFLAKE.test(role))) {
    return t("moderation.errors.invalidRole");
  }
  if (
    settings.log_channel !== null &&
    !SNOWFLAKE.test(String(settings.log_channel))
  ) {
    return t("moderation.errors.invalidLogChannel");
  }
  if (
    typeof settings.warn_expiry !== "number" ||
    settings.warn_expiry < 0 ||
    settings.warn_expiry > 365
  ) {
    return t("moderation.errors.warnExpiryRange");
  }
  if (
    !Array.isArray(settings.warn_thresholds) ||
    settings.warn_thresholds.length > 10
  ) {
    return t("moderation.errors.thresholdsLimit");
  }

  const seen = new Set<number>();

  for (const rule of settings.warn_thresholds) {
    if (typeof rule?.count !== "number" || rule.count < 1 || rule.count > 100) {
      return t("moderation.errors.thresholdCount");
    }
    if (seen.has(rule.count)) return t("moderation.errors.thresholdDuplicate");
    seen.add(rule.count);

    if (!PUNISHMENT_TYPES.includes(String(rule.punishment?.type))) {
      return t("moderation.errors.thresholdPunishment");
    }
    if (
      typeof rule.punishment.time !== "number" ||
      rule.punishment.time < 0 ||
      rule.punishment.time > 2_419_200
    ) {
      return t("moderation.errors.thresholdDuration");
    }
  }

  return null;
}

function validateAutoModeration(
  autoMod: AutoModeration,
  t: Translator,
): string | null {
  for (const key of ["invite", "links"] as const) {
    const rule = autoMod?.[key];
    if (!rule) return t("moderation.errors.autoModIncomplete");

    if (
      !Array.isArray(rule.ignore_channels) ||
      rule.ignore_channels.length > 50
    ) {
      return t("moderation.errors.ignoredChannelsLimit");
    }
    if (!Array.isArray(rule.ignore_roles) || rule.ignore_roles.length > 50) {
      return t("moderation.errors.ignoredRolesLimit");
    }
    if (!PUNISHMENT_TYPES.includes(String(rule.punishment?.type))) {
      return t("moderation.errors.autoModPunishment");
    }
    if (
      typeof rule.punishment.time !== "number" ||
      rule.punishment.time < 0 ||
      rule.punishment.time > 2_419_200
    ) {
      return t("moderation.errors.autoModDuration");
    }
    if (
      typeof rule.punishment.reason !== "string" ||
      rule.punishment.reason.length > 400
    ) {
      return t("moderation.errors.autoModReason");
    }
  }

  if (
    !Array.isArray(autoMod.links.ignore_links) ||
    autoMod.links.ignore_links.length > 100
  ) {
    return t("moderation.errors.whitelistLimit");
  }

  for (const pattern of autoMod.links.ignore_links) {
    if (typeof pattern !== "string")
      return t("moderation.errors.whitelistText");

    const error = describeLinkPatternIssue(t, pattern);
    if (error) return error;
  }

  return null;
}

/** Report and appeal form configuration coming from the form builder. */
export async function updateModerationForms(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const t = await getT();

  try {
    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const reportRaw = formData.get("report");
    const appealRaw = formData.get("appeal");

    if (!reportRaw || !appealRaw)
      return { ok: false, error: t("moderation.errors.missingData") };

    const report = normalizeForm(
      JSON.parse(reportRaw as string) as ModerationForm,
      "report",
    );
    const appeal = normalizeForm(
      JSON.parse(appealRaw as string) as ModerationForm,
      "appeal",
    );

    const reportError = validateFormConfiguration(report, t);
    if (reportError)
      return {
        ok: false,
        error: t("moderation.errors.reportForm", { error: reportError }),
      };

    const appealError = validateFormConfiguration(appeal, t);
    if (appealError)
      return {
        ok: false,
        error: t("moderation.errors.appealForm", { error: appealError }),
      };

    const guild = new Guild(guildId);

    await guild.set("moderation.forms.report", report);
    await guild.set("moderation.forms.appeal", appeal);

    revalidatePath(`/dashboard/${guildId}/moderation/forms`);
    return { ok: true };
  } catch (error) {
    console.error("[Moderation Forms Action Error]:", error);
    if (error instanceof SyntaxError)
      return { ok: false, error: t("moderation.errors.parseFailed") };
    return { ok: false, error: t("moderation.errors.internalSave") };
  }
}

/** Approve, reject or claim a submission from the dashboard queue. */
export async function handleSubmission(
  guildId: string,
  submissionId: string,
  status: ModerationSubmissionStatus,
  response: string | null,
): Promise<GuildActionState> {
  const t = await getT();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return { ok: false, error: t("moderation.errors.notAuthorized") };

    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    if (!["in_review", "approved", "rejected"].includes(status)) {
      return { ok: false, error: t("moderation.errors.unknownStatus") };
    }

    const trimmed = response?.trim().slice(0, 1000) || null;

    const result = await resolveSubmission(
      guildId,
      submissionId,
      status,
      session.user.id,
      trimmed,
    );

    if (!result.ok) return { ok: false, error: result.error };

    revalidatePath(`/dashboard/${guildId}/moderation/queue`);
    return { ok: true };
  } catch (error) {
    console.error("[Submission Handling Error]:", error);
    return { ok: false, error: t("moderation.errors.internal") };
  }
}

/** Revoke a case (unwarn / unmute / unban) from the case log. */
export async function revokeModerationCase(
  guildId: string,
  caseNumber: number,
  reason: string,
): Promise<GuildActionState> {
  const t = await getT();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return { ok: false, error: t("moderation.errors.notAuthorized") };

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
    return { ok: false, error: t("moderation.errors.internal") };
  }
}

/** Audit log settings, including the webhooks the log posts through. */
export async function updateAuditSettings(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const t = await getT();

  try {
    const gate = await requireGuildAdmin(guildId);
    if (gate.error) return { ok: false, error: gate.error };

    const raw = formData.get("audit");
    if (!raw) return { ok: false, error: t("moderation.errors.missingData") };

    const audit = JSON.parse(raw as string) as AuditSettings;

    const error = validateAudit(audit, t);
    if (error) return { ok: false, error };

    const guild = new Guild(guildId);

    await guild.set("audit.enabled", audit.enabled);
    await guild.set("audit.channel", audit.channel);
    await guild.set("audit.ignore_channels", audit.ignore_channels);
    await guild.set("audit.ignore_roles", audit.ignore_roles);
    await guild.set("audit.ignore_bots", audit.ignore_bots);
    await guild.set("audit.webhook.name", audit.webhook.name);
    await guild.set("audit.webhook.avatar", audit.webhook.avatar);
    await guild.set("audit.categories", audit.categories);
    await guild.set("audit.events", audit.events);

    // Create the webhooks up front so the admin finds out about missing
    // permissions here, and not when the first event silently goes nowhere.
    let webhookError: string | null = null;

    if (audit.enabled) {
      // Exactly the channels the bot will resolve for the events that are on:
      // event override, then category channel, then the default channel.
      const channels = AUDIT_EVENT_KEYS.filter(
        (event) => resolveAuditEvent(audit.events, event).enabled,
      )
        .map((event) => resolveAuditChannel(audit, event))
        .filter((channel): channel is string => Boolean(channel));

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
    if (error instanceof SyntaxError)
      return { ok: false, error: t("moderation.errors.parseFailed") };
    return { ok: false, error: t("moderation.errors.internalSave") };
  }
}

function validateAudit(audit: AuditSettings, t: Translator): string | null {
  if (typeof audit?.enabled !== "boolean")
    return t("moderation.errors.auditInvalid");

  if (audit.channel !== null && !SNOWFLAKE.test(String(audit.channel))) {
    return t("moderation.errors.auditChannel");
  }

  for (const [key, category] of Object.entries(audit.categories ?? {})) {
    if (!AUDIT_CATEGORIES.includes(key as never))
      return t("moderation.errors.auditUnknownCategory", { key });
    const channel = category?.channel ?? null;
    if (channel !== null && !SNOWFLAKE.test(String(channel))) {
      return t("moderation.errors.auditCategoryChannel", {
        category: t(`moderation.audit.categories.${key as AuditCategory}`),
      });
    }
  }

  for (const [list, limit, invalid] of [
    [
      audit.ignore_channels,
      "auditIgnoredChannelsLimit",
      "auditIgnoredChannelsInvalid",
    ],
    [audit.ignore_roles, "auditIgnoredRolesLimit", "auditIgnoredRolesInvalid"],
  ] as const) {
    if (!Array.isArray(list) || list.length > 50) {
      return t(`moderation.errors.${limit}`);
    }
    if (list.some((entry) => !SNOWFLAKE.test(String(entry)))) {
      return t(`moderation.errors.${invalid}`);
    }
  }

  if (audit.webhook?.name && audit.webhook.name.length > 80) {
    return t("moderation.errors.webhookNameLength");
  }
  if (
    audit.webhook?.avatar &&
    !/^https?:\/\/\S+$/i.test(audit.webhook.avatar)
  ) {
    return t("moderation.errors.webhookAvatar");
  }

  for (const [key, event] of Object.entries(audit.events ?? {})) {
    if (!AUDIT_EVENT_KEYS.includes(key as never)) {
      return t("moderation.errors.auditUnknownEvent", { key });
    }
    const label = t(`moderation.audit.events.${key as AuditEventKey}`);
    if (typeof event?.enabled !== "boolean") {
      return t("moderation.errors.auditEventInvalid", { event: label });
    }
    if (event.channel !== null && !SNOWFLAKE.test(String(event.channel))) {
      return t("moderation.errors.auditEventChannel", { event: label });
    }
  }

  // Every event that is on must end up somewhere.
  if (audit.enabled) {
    const orphan = AUDIT_EVENT_KEYS.find(
      (event) =>
        resolveAuditEvent(audit.events, event).enabled &&
        !resolveAuditChannel(audit, event),
    );

    if (orphan) {
      return t("moderation.errors.auditOrphan");
    }
  }

  return null;
}
