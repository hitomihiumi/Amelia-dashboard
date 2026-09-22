import type { ModerationCase, ModerationSubmission } from "@prisma/client";
import type { ModerationSubmissionAnswer } from "@/lib/db/types";

/** Mirrors the bot palette (`client.holder.colors`). */
export const COLORS = {
  default: 0x7d7772,
  error: 0xff6b7f,
  success: 0x6bff97,
  info: 0x7dd8ff,
} as const;

export const CASE_TYPE_LABELS: Record<string, string> = {
  warn: "Warn",
  mute: "Mute",
  kick: "Kick",
  ban: "Ban",
  note: "Note",
  unwarn: "Warn revoked",
  unmute: "Unmute",
  unban: "Unban",
  purge: "Purge",
};

export const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
};

const SUBMISSION_STATUS_COLORS: Record<string, number> = {
  pending: COLORS.info,
  in_review: COLORS.default,
  approved: COLORS.success,
  rejected: COLORS.error,
};

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: EmbedField[];
  timestamp?: string;
}

/**
 * Embed for a report/appeal posted into the moderation channel.
 *
 * The bot re-renders this message (localized) as soon as a moderator acts on
 * it, so the two representations stay compatible on purpose.
 */
export function buildSubmissionEmbed(
  submission: ModerationSubmission,
  relatedCase: ModerationCase | null,
  anonymous: boolean,
): DiscordEmbed {
  const kindLabel = submission.kind === "appeal" ? "Appeal" : "Report";
  const fields: EmbedField[] = [];

  fields.push({
    name: "Author",
    value: anonymous ? "Anonymous" : `<@${submission.authorId}> (\`${submission.authorId}\`)`,
    inline: true,
  });

  if (submission.targetId) {
    fields.push({
      name: "Reported user",
      value: `<@${submission.targetId}> (\`${submission.targetId}\`)`,
      inline: true,
    });
  }

  if (relatedCase) {
    fields.push({
      name: "Case",
      value: `#${relatedCase.caseNumber} • ${
        CASE_TYPE_LABELS[relatedCase.type] ?? relatedCase.type
      }`,
      inline: true,
    });
  }

  const answers = Array.isArray(submission.answers)
    ? (submission.answers as unknown as ModerationSubmissionAnswer[])
    : [];

  for (const answer of answers.slice(0, 15)) {
    fields.push({
      name: String(answer.label).slice(0, 256),
      value:
        answer.value === null || answer.value === "" ? "—" : String(answer.value).slice(0, 1024),
    });
  }

  fields.push({
    name: "Status",
    value: SUBMISSION_STATUS_LABELS[submission.status] ?? submission.status,
    inline: true,
  });

  if (submission.handledBy) {
    fields.push({ name: "Handled by", value: `<@${submission.handledBy}>`, inline: true });
  }

  if (submission.response) {
    fields.push({ name: "Response", value: submission.response.slice(0, 1024) });
  }

  return {
    title: `${kindLabel} #${submission.number}`,
    color: SUBMISSION_STATUS_COLORS[submission.status] ?? COLORS.info,
    fields,
    timestamp: submission.createdAt.toISOString(),
  };
}

/**
 * Buttons handled by the bot (`I_mod:sub|<id>|<action>`).
 * Resolved submissions no longer carry any button.
 */
export function buildSubmissionComponents(submission: ModerationSubmission): unknown[] {
  if (submission.status === "approved" || submission.status === "rejected") return [];

  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          label: "Take in review",
          custom_id: `I_mod:sub|${submission.id}|claim`,
          disabled: submission.status === "in_review",
        },
        {
          type: 2,
          style: 3,
          label: "Approve",
          custom_id: `I_mod:sub|${submission.id}|approve`,
        },
        {
          type: 2,
          style: 4,
          label: "Reject",
          custom_id: `I_mod:sub|${submission.id}|reject`,
        },
      ],
    },
  ];
}

/** Embed used in the moderation log for a case. */
export function buildCaseEmbed(entry: ModerationCase): DiscordEmbed {
  const fields: EmbedField[] = [
    {
      name: "User",
      value: `<@${entry.targetId}> (\`${entry.targetId}\`)`,
      inline: true,
    },
    {
      name: "Moderator",
      value: entry.moderatorId === "AUTOMOD" ? "Auto moderation" : `<@${entry.moderatorId}>`,
      inline: true,
    },
    {
      name: "Reason",
      value: entry.reason || "No reason provided",
    },
  ];

  if (entry.duration) {
    fields.push({ name: "Duration", value: formatSeconds(entry.duration), inline: true });
  }

  if (entry.expiresAt) {
    fields.push({
      name: "Expires",
      value: `<t:${Math.floor(entry.expiresAt.getTime() / 1000)}:R>`,
      inline: true,
    });
  }

  fields.push({ name: "Source", value: entry.source, inline: true });

  return {
    title: `Case #${entry.caseNumber} • ${CASE_TYPE_LABELS[entry.type] ?? entry.type}`,
    color: entry.active ? COLORS.error : COLORS.default,
    fields,
    timestamp: entry.createdAt.toISOString(),
  };
}

/** Compact duration rendering ("2d 4h"). */
export function formatSeconds(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (rest || parts.length === 0) parts.push(`${rest}s`);

  return parts.join(" ");
}
