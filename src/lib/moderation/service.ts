import "server-only";

import type { ModerationCase, ModerationSubmission } from "@prisma/client";
import { prisma } from "@/lib/db/db";
import { Guild } from "@/lib/db/Guild";
import {
  clearMemberTimeout,
  editChannelMessage,
  postChannelMessage,
  removeGuildBan,
  sendDirectMessage,
} from "@/lib/discord/rest";
import type {
  ModerationForm,
  ModerationSubmissionAnswer,
  ModerationSubmissionKind,
  ModerationSubmissionStatus,
} from "@/lib/db/types";
import { COLORS, buildCaseEmbed, buildSubmissionComponents, buildSubmissionEmbed } from "./embeds";

/** Allocate the next per-guild number without races. */
async function nextSequence(
  guildId: string,
  field: "modCaseSeq" | "modReportSeq" | "modAppealSeq",
): Promise<number> {
  await prisma.guild.upsert({ where: { id: guildId }, update: {}, create: { id: guildId } });

  const row = await prisma.guild.update({
    where: { id: guildId },
    data: { [field]: { increment: 1 } },
    select: { modCaseSeq: true, modReportSeq: true, modAppealSeq: true },
  });

  return row[field];
}

export interface CreateSubmissionInput {
  guildId: string;
  kind: ModerationSubmissionKind;
  authorId: string;
  targetId: string | null;
  caseId: string | null;
  form: ModerationForm;
  answers: ModerationSubmissionAnswer[];
}

export type CreateSubmissionResult =
  | { ok: true; submission: ModerationSubmission }
  | { ok: false; error: string };

/**
 * Store a submission and post it to the moderation channel.
 * Rate limits are enforced here so every caller gets the same rules.
 */
export async function createSubmission(
  input: CreateSubmissionInput,
): Promise<CreateSubmissionResult> {
  const { guildId, kind, authorId, form } = input;

  if (!form.enabled) return { ok: false, error: "This form is currently disabled." };
  if (!form.channel) return { ok: false, error: "This form is not fully configured yet." };

  const pending = await prisma.moderationSubmission.count({
    where: { guildId, kind, authorId, status: { in: ["pending", "in_review"] } },
  });

  if (pending >= form.max_pending) {
    return {
      ok: false,
      error: `You already have ${pending} submission(s) waiting for review. Please wait until they are handled.`,
    };
  }

  if (form.cooldown > 0) {
    const last = await prisma.moderationSubmission.findFirst({
      where: { guildId, kind, authorId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (last) {
      const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
      if (elapsed < form.cooldown) {
        const wait = Math.ceil((form.cooldown - elapsed) / 60);
        return { ok: false, error: `Please wait ${wait} more minute(s) before submitting again.` };
      }
    }
  }

  const number = await nextSequence(guildId, kind === "report" ? "modReportSeq" : "modAppealSeq");

  const submission = await prisma.moderationSubmission.create({
    data: {
      guildId,
      number,
      kind,
      authorId,
      targetId: input.targetId,
      caseId: input.caseId,
      answers: input.answers as unknown as object,
      channelId: form.channel,
    },
  });

  const relatedCase = submission.caseId
    ? await prisma.moderationCase.findUnique({ where: { id: submission.caseId } })
    : null;

  const messageId = await postChannelMessage(form.channel, {
    embeds: [buildSubmissionEmbed(submission, relatedCase, form.allow_anonymous)],
    components: buildSubmissionComponents(submission),
  });

  if (messageId) {
    return {
      ok: true,
      submission: await prisma.moderationSubmission.update({
        where: { id: submission.id },
        data: { messageId },
      }),
    };
  }

  // The submission is stored either way — it stays visible in the dashboard queue.
  return { ok: true, submission };
}

export type ResolveResult =
  | { ok: true; submission: ModerationSubmission }
  | { ok: false; error: string };

/**
 * Approve, reject or claim a submission from the dashboard.
 * Mirrors `ModerationService.resolveSubmission` in the bot.
 */
export async function resolveSubmission(
  guildId: string,
  submissionId: string,
  status: ModerationSubmissionStatus,
  moderatorId: string,
  response: string | null,
): Promise<ResolveResult> {
  const submission = await prisma.moderationSubmission.findUnique({ where: { id: submissionId } });

  if (!submission || submission.guildId !== guildId) {
    return { ok: false, error: "Submission not found." };
  }
  if (submission.status === "approved" || submission.status === "rejected") {
    return { ok: false, error: "This submission has already been handled." };
  }

  const updated = await prisma.moderationSubmission.update({
    where: { id: submission.id },
    data: {
      status,
      handledBy: moderatorId,
      handledAt: status === "in_review" ? submission.handledAt : new Date(),
      response: response ?? submission.response,
    },
  });

  // Approving an appeal lifts the punishment it was filed against.
  if (status === "approved" && updated.kind === "appeal" && updated.caseId) {
    const related = await prisma.moderationCase.findUnique({ where: { id: updated.caseId } });

    if (related?.active) {
      await revokeCase(guildId, related.caseNumber, moderatorId, `Appeal #${updated.number}`);
    }
  }

  await refreshSubmissionMessage(updated);

  if (status === "approved" || status === "rejected") {
    await notifyAuthor(guildId, updated, status);
  }

  return { ok: true, submission: updated };
}

/** Re-render the submission message in the moderation channel. */
async function refreshSubmissionMessage(submission: ModerationSubmission): Promise<void> {
  if (!submission.channelId || !submission.messageId) return;

  const relatedCase = submission.caseId
    ? await prisma.moderationCase.findUnique({ where: { id: submission.caseId } })
    : null;

  await editChannelMessage(submission.channelId, submission.messageId, {
    embeds: [buildSubmissionEmbed(submission, relatedCase, false)],
    components: buildSubmissionComponents(submission),
  });
}

async function notifyAuthor(
  guildId: string,
  submission: ModerationSubmission,
  status: "approved" | "rejected",
): Promise<void> {
  const guild = new Guild(guildId);
  const form = (await guild.get(
    `moderation.forms.${submission.kind === "appeal" ? "appeal" : "report"}`,
  )) as ModerationForm | null;

  const custom = status === "approved" ? form?.approve_message : form?.reject_message;
  const kindLabel = submission.kind === "appeal" ? "appeal" : "report";

  const fields = submission.response
    ? [{ name: "Moderator response", value: submission.response.slice(0, 1024) }]
    : undefined;

  await sendDirectMessage(submission.authorId, {
    embeds: [
      {
        color: status === "approved" ? COLORS.success : COLORS.error,
        description:
          custom?.trim() || `Your ${kindLabel} #${submission.number} has been ${status}.`,
        fields,
      },
    ],
  });
}

export type RevokeResult = { ok: true; case: ModerationCase } | { ok: false; error: string };

/**
 * Revoke an active case: lift the punishment in Discord, close the case and
 * store the counterpart case (unwarn / unmute / unban).
 */
export async function revokeCase(
  guildId: string,
  caseNumber: number,
  moderatorId: string,
  reason: string,
): Promise<RevokeResult> {
  const target = await prisma.moderationCase.findUnique({
    where: { guildId_caseNumber: { guildId, caseNumber } },
  });

  if (!target) return { ok: false, error: `Case #${caseNumber} was not found.` };
  if (!target.active) return { ok: false, error: `Case #${caseNumber} is already revoked.` };

  const revokeType = { warn: "unwarn", mute: "unmute", ban: "unban" }[target.type];
  if (!revokeType) return { ok: false, error: "This case type cannot be revoked." };

  if (target.type === "ban") {
    const removed = await removeGuildBan(guildId, target.targetId, reason);
    if (!removed) {
      return { ok: false, error: "Discord rejected the unban. Check the bot permissions." };
    }
  }

  if (target.type === "mute") {
    // A time out may already have expired on its own — that is not an error.
    await clearMemberTimeout(guildId, target.targetId, reason);
  }

  await prisma.moderationCase.update({
    where: { id: target.id },
    data: {
      active: false,
      revokedAt: new Date(),
      revokedBy: moderatorId,
      revokeReason: reason,
    },
  });

  const created = await prisma.moderationCase.create({
    data: {
      guildId,
      caseNumber: await nextSequence(guildId, "modCaseSeq"),
      type: revokeType,
      targetId: target.targetId,
      moderatorId,
      reason,
      source: "dashboard",
      active: false,
    },
  });

  await logCase(guildId, created);
  await notifyRevocation(guildId, created);

  return { ok: true, case: created };
}

/** Post a case to the configured moderation log channel. */
export async function logCase(guildId: string, entry: ModerationCase): Promise<void> {
  const guild = new Guild(guildId);
  const channelId = (await guild.get("moderation.log_channel")) as string | null;
  if (!channelId) return;

  await postChannelMessage(channelId, { embeds: [buildCaseEmbed(entry)] });
}

async function notifyRevocation(guildId: string, entry: ModerationCase): Promise<void> {
  const guild = new Guild(guildId);
  if (!(await guild.get("moderation.dm_notify"))) return;

  await sendDirectMessage(entry.targetId, {
    embeds: [
      {
        color: COLORS.success,
        description: "Your punishment has been revoked.",
        fields: [{ name: "Reason", value: entry.reason.slice(0, 1024) }],
      },
    ],
  });
}
