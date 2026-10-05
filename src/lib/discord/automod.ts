import "server-only";

import type { AutoModKind, AutoModerationSettings } from "@/lib/db/types";
import {
  AUTOMOD_KINDS,
  type AutoModApiError,
  type AutoModErrorKind,
  type AutoModSyncResult,
  type AutoModTransport,
  type DiscordAutoModRule,
  describeAutoModError,
  syncAutoModeration,
} from "@/lib/moderation/autoModeration";
import { botFetch } from "./rest";

/** Throws what the shared sync code classifies: HTTP status, Discord's error code and message. */
async function request<T>(
  guildId: string,
  path: string,
  init: RequestInit = {},
  auditReason?: string,
): Promise<T> {
  const res = await botFetch(`/guilds/${guildId}/auto-moderation/rules${path}`, init, auditReason);
  if (!res) {
    throw { status: 0, message: "The bot token is not configured." } satisfies AutoModApiError;
  }
  if (res.status === 204) return undefined as T;

  const body = (await res.json().catch(() => null)) as {
    code?: number;
    message?: string;
    errors?: unknown;
  } | null;

  if (!res.ok) {
    const detail = body?.errors ? ` ${JSON.stringify(body.errors).slice(0, 300)}` : "";
    throw {
      status: res.status,
      code: body?.code,
      message: `${body?.message ?? `HTTP ${res.status}`}${detail}`,
    } satisfies AutoModApiError;
  }

  return body as T;
}

const REASON = "Auto moderation settings changed in the dashboard";

/** The AutoMod endpoints of one server, in the shape the shared sync code expects. */
export function autoModTransport(guildId: string): AutoModTransport {
  return {
    list: () => request<DiscordAutoModRule[]>(guildId, ""),
    create: (body) =>
      request<DiscordAutoModRule>(guildId, "", { method: "POST", body: JSON.stringify(body) }, REASON),
    edit: (id, body) =>
      request<DiscordAutoModRule>(
        guildId,
        `/${id}`,
        { method: "PATCH", body: JSON.stringify(body) },
        REASON,
      ),
    remove: async (id) => {
      await request<void>(guildId, `/${id}`, { method: "DELETE" }, REASON);
    },
  };
}

/**
 * Make the AutoMod rules of the server match the settings. Returns `null` when the deployment has no
 * bot token (nothing can be synced then).
 */
export async function applyAutoModeration(
  guildId: string,
  settings: AutoModerationSettings,
  moderationRoles: string[],
): Promise<AutoModSyncResult | null> {
  if (!process.env.DISCORD_BOT_TOKEN?.trim()) return null;

  return await syncAutoModeration({
    transport: autoModTransport(guildId),
    settings,
    moderationRoles,
    mode: "apply",
  });
}

export type AutoModRuleState = "active" | "missing" | "unknown";

export interface AutoModStateReport {
  /** What Discord has for each rule the settings hold an id of. */
  states: Partial<Record<AutoModKind, AutoModRuleState>>;
  /** Why the rules could not be read; `states` is empty then. */
  error: null | "no_token" | AutoModErrorKind;
}

/**
 * What Discord has for each created rule right now (the page shows it next to the switches). A rule
 * somebody deleted or switched off in Discord shows up here before the next save.
 */
export async function readAutoModerationState(
  guildId: string,
  settings: AutoModerationSettings,
): Promise<AutoModStateReport> {
  if (!process.env.DISCORD_BOT_TOKEN?.trim()) return { states: {}, error: "no_token" };

  let rules: DiscordAutoModRule[];
  try {
    rules = await autoModTransport(guildId).list();
  } catch (error) {
    return { states: {}, error: describeAutoModError(error).kind };
  }

  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  const states: AutoModStateReport["states"] = {};
  for (const kind of AUTOMOD_KINDS) {
    const id = settings.rules?.[kind];
    if (!id) continue;

    const rule = byId.get(id);
    states[kind] = !rule ? "missing" : rule.enabled ? "active" : "unknown";
  }

  return { states, error: null };
}
