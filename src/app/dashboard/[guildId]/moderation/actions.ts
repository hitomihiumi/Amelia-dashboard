"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { GuildActionState } from "@/types/dashboard";
import type {
  AutoModKind,
  AutoModerationSettings,
  AuditCategory,
  AuditEventKey,
  AuditSettings,
  GuildSchema,
  ModerationForm,
  ModerationSubmissionStatus,
  WarnThreshold,
} from "@/lib/db/types";
import {
  AUTOMOD_KINDS,
  AUDIT_CATEGORIES,
  AUDIT_EVENT_KEYS,
  resolveAuditChannel,
  resolveAuditEvent,
} from "@/lib/db/types";
import {
  normalizeForm,
  validateFormConfiguration,
} from "@/lib/moderation/forms";
import { applyAutoModeration } from "@/lib/discord/automod";
import {
  type AutoModIssue,
  type AutoModSyncResult,
  validateAutoModeration as validateAutoModRules,
} from "@/lib/moderation/autoModeration";
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

    const settingsError = validateSettings(settings, t);
    if (settingsError) return { ok: false, error: settingsError };

    const autoMod = sanitizeAutoModeration(JSON.parse(autoModRaw as string));
    if (!autoMod) return { ok: false, error: t("moderation.errors.autoModIncomplete") };

    const autoModError = validateAutoModeration(autoMod, t);
    if (autoModError) return { ok: false, error: autoModError };

    const guild = new Guild(guildId);

    await guild.set("moderation.moderation_roles", settings.moderation_roles);
    await guild.set("moderation.log_channel", settings.log_channel);
    await guild.set("moderation.dm_notify", settings.dm_notify);
    await guild.set("moderation.warn_expiry", settings.warn_expiry);
    await guild.set("moderation.warn_thresholds", settings.warn_thresholds);

    for (const kind of AUTOMOD_KINDS) {
      await guild.set(`moderation.auto_moderation.${kind}` as any, autoMod[kind] as any);
    }

    // The rule ids belong to the server, never to the browser: read them back from the database.
    const stored = (await guild.get("moderation.auto_moderation")) as AutoModerationSettings;
    const synced = await applyAutoModeration(
      guildId,
      { ...autoMod, rules: stored?.rules ?? {} },
      settings.moderation_roles,
    );

    let messages: string[] = [];
    if (!synced) {
      messages = [t("moderation.automod.sync.noToken")];
    } else {
      await guild.set("moderation.auto_moderation.rules" as any, synced.rules as any);
      messages = describeSync(synced, t);
    }

    revalidatePath(`/dashboard/${guildId}/moderation`);
    return messages.length > 0 ? { ok: true, automod: { messages } } : { ok: true };
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

function isSnowflakeList(value: unknown, max: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= max &&
    value.every((item) => typeof item === "string" && SNOWFLAKE.test(item))
  );
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  return value.every((item) => typeof item === "string" && item.length <= maxLength)
    ? (value as string[])
    : null;
}

/**
 * The browser sends the rules as JSON, so nothing in it can be trusted: keep only known fields of the
 * right type and nothing else (the rule ids in particular are never taken from the request).
 * Returns `null` when a field is malformed.
 */
function sanitizeAutoModeration(raw: unknown): AutoModerationSettings | null {
  const input = (raw ?? {}) as Record<string, any>;
  const out: Record<string, any> = { rules: {} };

  for (const kind of AUTOMOD_KINDS) {
    const rule = input[kind];
    if (!rule || typeof rule !== "object") return null;

    const base = {
      enabled: rule.enabled === true,
      ignore_channels: rule.ignore_channels,
      ignore_roles: rule.ignore_roles,
      delete_message: rule.delete_message === true,
      block_message:
        typeof rule.block_message === "string" && rule.block_message.trim()
          ? rule.block_message.trim()
          : null,
      alert_channel:
        typeof rule.alert_channel === "string" && SNOWFLAKE.test(rule.alert_channel)
          ? rule.alert_channel
          : null,
      moderation_immune: rule.moderation_immune === true,
      punishment: {
        type: rule.punishment?.type,
        time: rule.punishment?.time,
        reason: rule.punishment?.reason,
      },
    };
    if (!isSnowflakeList(base.ignore_channels, 200) || !isSnowflakeList(base.ignore_roles, 200)) {
      return null;
    }
    if (typeof base.block_message === "string" && base.block_message.length > 1000) return null;

    let extra: Record<string, unknown> = {};
    switch (kind) {
      case "links": {
        const list = stringList(rule.ignore_links, 1000, 400);
        if (!list) return null;
        extra = { ignore_links: list };
        break;
      }
      case "keywords": {
        const keywords = stringList(rule.keywords, 3000, 400);
        const regex = stringList(rule.regex, 100, 1000);
        const allow = stringList(rule.allow, 1000, 400);
        if (!keywords || !regex || !allow) return null;
        extra = { keywords, regex, allow };
        break;
      }
      case "profanity": {
        const presets = stringList(rule.presets, 3, 20);
        const allow = stringList(rule.allow, 1000, 400);
        if (!presets || !allow) return null;
        extra = {
          presets: presets.filter((preset) =>
            ["profanity", "sexual_content", "slurs"].includes(preset),
          ),
          allow,
        };
        break;
      }
      case "mention_spam":
        extra = {
          limit: Number(rule.limit),
          raid_protection: rule.raid_protection === true,
        };
        break;
    }

    out[kind] = { ...base, ...extra };
  }

  return out as AutoModerationSettings;
}

function kindLabel(t: Translator, kind: AutoModKind): string {
  return t(`moderation.automod.kinds.${kind}`);
}

function describeIssue(t: Translator, issue: AutoModIssue): string {
  return t(`moderation.automod.issues.${issue.code}`, {
    kind: kindLabel(t, issue.kind),
    ...(issue.params ?? {}),
  });
}

function validateAutoModeration(
  autoMod: AutoModerationSettings,
  t: Translator,
): string | null {
  for (const kind of AUTOMOD_KINDS) {
    const rule = autoMod[kind];

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

  const issues = validateAutoModRules(autoMod);
  return issues.length > 0 ? describeIssue(t, issues[0]) : null;
}

/** What Discord refused or shortened, as sentences the administrator can act on. */
function describeSync(result: AutoModSyncResult, t: Translator): string[] {
  if (result.listError) {
    return [
      result.listError.kind === "permissions"
        ? t("moderation.automod.sync.permissions")
        : t("moderation.automod.sync.unknown", {
            kind: "AutoMod",
            message: result.listError.message,
          }),
    ];
  }

  const messages: string[] = [];
  for (const kind of AUTOMOD_KINDS) {
    const outcome = result.results[kind];
    outcome.warnings.forEach((issue) => messages.push(describeIssue(t, issue)));

    const error = outcome.error;
    if (!error) continue;
    if (error.kind === "permissions") {
      messages.push(t("moderation.automod.sync.permissions"));
    } else if (error.kind === "limit") {
      messages.push(t("moderation.automod.sync.limit", { kind: kindLabel(t, kind) }));
    } else {
      messages.push(
        t(`moderation.automod.sync.${error.kind === "invalid" ? "invalid" : "unknown"}`, {
          kind: kindLabel(t, kind),
          message: error.message,
        }),
      );
    }
  }

  return [...new Set(messages)];
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
