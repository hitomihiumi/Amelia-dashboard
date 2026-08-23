import "server-only";

import { prisma } from "@/lib/db/db";
import { botFetch } from "@/lib/discord/rest";

/**
 * Webhooks used by the audit log.
 *
 * The dashboard creates them when a channel is picked so the admin sees the
 * result immediately; the bot creates any that are still missing when an event
 * fires. Both sides share the `GuildWebhook` table, keyed by channel.
 */

interface DiscordWebhook {
  id: string;
  token?: string;
}

/** Make sure a webhook exists for the channel and return its id. */
export async function ensureWebhook(
  guildId: string,
  channelId: string,
  name: string | null,
  avatar: string | null,
): Promise<{ ok: true; webhookId: string } | { ok: false; error: string }> {
  const existing = await prisma.guildWebhook.findUnique({
    where: { guildId_channelId: { guildId, channelId } },
  });

  if (existing) {
    // Confirm Discord still knows about it; the token is part of the URL.
    const check = await botFetch(`/webhooks/${existing.webhookId}/${existing.token}`);
    if (check?.ok) return { ok: true, webhookId: existing.webhookId };

    await prisma.guildWebhook.delete({ where: { id: existing.id } }).catch(() => null);
  }

  const res = await botFetch(
    `/channels/${channelId}/webhooks`,
    {
      method: "POST",
      body: JSON.stringify({ name: name?.trim() || "Audit log", avatar: avatar || undefined }),
    },
    "Audit log",
  );

  if (!res) return { ok: false, error: "The bot token is not configured." };

  if (!res.ok) {
    const body = await res.text();
    return {
      ok: false,
      error: `Discord refused to create a webhook (${res.status}). Check that the bot may manage webhooks in that channel. ${body.slice(0, 120)}`,
    };
  }

  const webhook = (await res.json()) as DiscordWebhook;
  if (!webhook.token) return { ok: false, error: "Discord returned a webhook without a token." };

  await prisma.guildWebhook.upsert({
    where: { guildId_channelId: { guildId, channelId } },
    update: { webhookId: webhook.id, token: webhook.token },
    create: { guildId, channelId, webhookId: webhook.id, token: webhook.token },
  });

  return { ok: true, webhookId: webhook.id };
}

/** Drop a webhook the audit log no longer posts to. */
export async function removeWebhook(guildId: string, channelId: string): Promise<void> {
  const stored = await prisma.guildWebhook.findUnique({
    where: { guildId_channelId: { guildId, channelId } },
  });

  if (!stored) return;

  await botFetch(`/webhooks/${stored.webhookId}/${stored.token}`, { method: "DELETE" });
  await prisma.guildWebhook.delete({ where: { id: stored.id } }).catch(() => null);
}

/**
 * Reconcile the stored webhooks with the channels the audit log actually uses.
 * Returns the first error, if any — a failure here is worth showing to the admin.
 */
export async function syncAuditWebhooks(
  guildId: string,
  channels: string[],
  name: string | null,
  avatar: string | null,
): Promise<string | null> {
  const wanted = [...new Set(channels.filter(Boolean))];

  const stored = await prisma.guildWebhook.findMany({
    where: { guildId },
    select: { channelId: true },
  });

  for (const { channelId } of stored) {
    if (!wanted.includes(channelId)) await removeWebhook(guildId, channelId);
  }

  for (const channelId of wanted) {
    const result = await ensureWebhook(guildId, channelId, name, avatar);
    if (!result.ok) return result.error;
  }

  return null;
}
