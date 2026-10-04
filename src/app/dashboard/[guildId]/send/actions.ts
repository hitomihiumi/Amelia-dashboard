"use server";

import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { RedisService } from "@/lib/db/redis";
import {
  type ButtonCustom,
  type EmbedCustom,
  type LayoutCustom,
  type SelectMenuCustom,
  collectLayoutIssues,
} from "@/lib/db/types";
import { fetchGuildTextChannels } from "@/lib/discord/channels-api";
import {
  type DiscordJson,
  IS_COMPONENTS_V2,
  type MessageLibrary,
  type PayloadError,
  buildClassicBody,
  buildLayoutBody,
} from "@/lib/discord/message-payload";
import { botFetch, fetchGuildBrief } from "@/lib/discord/rest";
import { INTERACTIVE_PLACEHOLDER, type VariableContext } from "@/lib/discord/substitute";
import { describeIssue } from "@/lib/layouts/issues";
import { getServerSession } from "next-auth";

export interface SendMessageInput {
  channelId: string;
  mode: "classic" | "layout";
  /** Classic mode. */
  content: string;
  embedIds: string[];
  buttonIds: string[];
  selectMenuIds: string[];
  /** Layout mode. */
  layoutId: string;
  /** Let `@everyone` / `@here` actually ping. Users and roles always can. */
  allowEveryone: boolean;
}

export type SendMessageResult =
  | { ok: true; messageUrl: string; warnings: string[] }
  | { ok: false; error: string };

/** One send per user and server every few seconds, like the bot's `/send` cooldown. */
const COOLDOWN_SECONDS = 3;
const MAX_REFERENCES = 60;

const SNOWFLAKE = /^\d{15,25}$/;

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_REFERENCES) return null;
  return value.every((item) => typeof item === "string" && item.length <= 128)
    ? (value as string[])
    : null;
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function takeCooldown(guildId: string, userId: string): Promise<boolean> {
  try {
    const client = RedisService.getClient();
    const result = await client.set(
      `dashboard:send:${guildId}:${userId}`,
      "1",
      "EX",
      COOLDOWN_SECONDS,
      "NX",
    );
    return result === "OK";
  } catch {
    // Redis is only a guard against double clicks; never block sending because of it.
    return true;
  }
}

/** Discord's own explanation, reduced to what an admin can act on. */
function discordFailure(
  status: number,
  body: { code?: number; message?: string } | null,
  t: Awaited<ReturnType<typeof getT>>,
): string {
  switch (body?.code) {
    case 50001: // Missing Access
    case 50013: // Missing Permissions
      return t("send.errors.noPermission");
    case 10003: // Unknown Channel
      return t("send.errors.channelGone");
    case 50035: // Invalid Form Body
      return t("send.errors.rejected", { reason: body.message ?? "" });
    default:
      return status === 403
        ? t("send.errors.noPermission")
        : t("send.errors.discordFailed", { status });
  }
}

export async function sendDashboardMessage(
  guildId: string,
  input: SendMessageInput,
): Promise<SendMessageResult> {
  const t = await getT();

  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return { ok: false, error: gate.error };

  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.user?.id) {
    return { ok: false, error: t("settings.errors.authRequired") };
  }

  // ---- the request is untrusted: shape it before anything else ----
  const embedIds = asStringArray(input?.embedIds);
  const buttonIds = asStringArray(input?.buttonIds);
  const selectMenuIds = asStringArray(input?.selectMenuIds);
  if (
    !SNOWFLAKE.test(String(input?.channelId ?? "")) ||
    (input.mode !== "classic" && input.mode !== "layout") ||
    typeof input.content !== "string" ||
    typeof input.layoutId !== "string" ||
    !embedIds ||
    !buttonIds ||
    !selectMenuIds
  ) {
    return { ok: false, error: t("send.errors.invalid") };
  }

  // The channel must belong to this guild: the id comes from the browser.
  let channels: Awaited<ReturnType<typeof fetchGuildTextChannels>>;
  try {
    channels = await fetchGuildTextChannels(session.accessToken, guildId);
  } catch {
    return { ok: false, error: t("builder.shared.loadChannelsFailed") };
  }
  const channel = channels.find((candidate) => candidate.id === input.channelId);
  if (!channel) return { ok: false, error: t("send.errors.channelGone") };

  if (!(await takeCooldown(guildId, session.user.id))) {
    return { ok: false, error: t("send.errors.cooldown", { seconds: COOLDOWN_SECONDS }) };
  }

  // ---- the stored components are the source of truth, never what the browser sends ----
  const stored = await new Guild(guildId).get("utils.components");
  const embeds = list<EmbedCustom>(stored?.embed);
  const buttons = list<ButtonCustom>(stored?.buttons);
  const selectMenus = list<SelectMenuCustom>(stored?.selectMenus);
  const layouts = list<LayoutCustom>(stored?.layouts);
  const library: MessageLibrary = { embeds, buttons, selectMenus };

  const brief = await fetchGuildBrief(guildId);
  const user = session.user;
  const context: VariableContext = {
    user: {
      id: user.id,
      name: user.name ?? user.id,
      displayName: user.name ?? user.id,
      mention: `<@${user.id}>`,
      avatar: user.image ?? "https://cdn.discordapp.com/embed/avatars/0.png",
    },
    channel: { id: channel.id, name: channel.name, mention: `<#${channel.id}>` },
    guild: { id: guildId, name: brief?.name ?? guildId, icon: brief?.iconUrl ?? null },
  };

  const explain = (error: PayloadError) => t(`send.payload.${error.code}`, error.params);

  let body: DiscordJson;
  const warnings: string[] = [];

  if (input.mode === "layout") {
    const layout = layouts.find((candidate) => candidate.id === input.layoutId);
    if (!layout) return { ok: false, error: t("send.errors.layoutGone") };

    // Refuse a broken layout rather than posting half of it; the editor shows the same problems.
    const issues = collectLayoutIssues(layout, { buttons, selectMenus });
    if (issues.length > 0) {
      return { ok: false, error: describeIssue(t, layout, issues[0]) };
    }

    const built = buildLayoutBody(layout, { buttons, selectMenus }, context);
    if (!built.body) return { ok: false, error: t("send.payload.layoutEmpty") };
    body = built.body;
    warnings.push(...built.warnings);
  } else {
    const built = buildClassicBody(
      { content: input.content, embedIds, buttonIds, selectMenuIds },
      library,
      context,
    );
    if (!built.ok) return { ok: false, error: explain(built.error) };
    body = built.body;
    warnings.push(...built.warnings);
  }

  if (INTERACTIVE_PLACEHOLDER.test(JSON.stringify(body))) {
    warnings.push(t("send.warnings.interactivePlaceholders"));
  }

  const res = await botFetch(`/channels/${channel.id}/messages`, {
    method: "POST",
    body: JSON.stringify({
      ...body,
      // A V2 message must not carry anything else; the flag is the only thing to forward.
      ...(input.mode === "layout" ? { flags: IS_COMPONENTS_V2 } : {}),
      allowed_mentions: { parse: input.allowEveryone ? ["users", "roles", "everyone"] : ["users", "roles"] },
    }),
  });

  if (!res) return { ok: false, error: t("send.errors.noToken") };

  if (!res.ok) {
    const failure = (await res.json().catch(() => null)) as {
      code?: number;
      message?: string;
    } | null;
    return { ok: false, error: discordFailure(res.status, failure, t) };
  }

  const message = (await res.json().catch(() => null)) as { id?: string } | null;
  return {
    ok: true,
    messageUrl: message?.id
      ? `https://discord.com/channels/${guildId}/${channel.id}/${message.id}`
      : `https://discord.com/channels/${guildId}/${channel.id}`,
    warnings,
  };
}
