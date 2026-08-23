"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { prisma } from "@/lib/db/db";
import { getSubmissionAccess } from "@/lib/moderation/access";
import { normalizeForm, validateAnswers } from "@/lib/moderation/forms";
import { createSubmission } from "@/lib/moderation/service";
import type { ModerationSubmissionKind } from "@/lib/db/types";

export type SubmitResult = { ok: true; message: string } | { ok: false; error: string };

export interface SubmitPayload {
  answers: Record<string, unknown>;
  targetId: string | null;
  caseId: string | null;
}

const SNOWFLAKE = /^\d{17,20}$/;

/**
 * Public entry point for the report and appeal forms.
 *
 * Everything is re-checked here: the session, whether the visitor may use this
 * form at all, and every single answer against the stored configuration.
 */
export async function submitForm(
  guildId: string,
  kind: ModerationSubmissionKind,
  payload: SubmitPayload,
): Promise<SubmitResult> {
  try {
    if (kind !== "report" && kind !== "appeal") {
      return { ok: false, error: "Unknown form." };
    }
    if (!SNOWFLAKE.test(guildId)) {
      return { ok: false, error: "Unknown server." };
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { ok: false, error: "Please sign in with Discord first." };
    }

    const access = await getSubmissionAccess(guildId, session.user.id, kind);
    if (!access.allowed) {
      return { ok: false, error: "You are not allowed to use this form." };
    }

    const guild = new Guild(guildId);
    const form = normalizeForm(await guild.get(`moderation.forms.${kind}`), kind);

    if (!form.enabled) {
      return { ok: false, error: "This form is currently disabled." };
    }

    if (!payload.answers || typeof payload.answers !== "object") {
      return { ok: false, error: "Invalid form data." };
    }

    const validated = validateAnswers(form, payload.answers as Record<string, unknown>);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }

    let targetId: string | null = null;
    if (kind === "report") {
      const raw = payload.targetId?.trim() ?? "";

      if (form.require_target) {
        if (!SNOWFLAKE.test(raw)) {
          return { ok: false, error: "Enter a valid Discord ID of the reported user." };
        }
        if (raw === session.user.id) {
          return { ok: false, error: "You cannot report yourself." };
        }
        targetId = raw;
      } else if (raw) {
        targetId = SNOWFLAKE.test(raw) ? raw : null;
      }
    }

    let caseId: string | null = null;
    if (kind === "appeal" && payload.caseId) {
      // Only the punished user may appeal their own case.
      const related = await prisma.moderationCase.findFirst({
        where: { id: payload.caseId, guildId, targetId: session.user.id },
        select: { id: true },
      });

      if (!related) {
        return { ok: false, error: "That punishment does not belong to you." };
      }

      caseId = related.id;
    }

    const result = await createSubmission({
      guildId,
      kind,
      authorId: session.user.id,
      targetId,
      caseId,
      form,
      answers: validated.answers,
    });

    if (!result.ok) return result;

    return {
      ok: true,
      message:
        form.success_message?.trim() ||
        `Your ${kind} #${result.submission.number} has been sent to the moderation team. You will receive a direct message once it is handled.`,
    };
  } catch (error) {
    console.error("[Submission Action Error]:", error);
    return { ok: false, error: "Internal server error. Please try again later." };
  }
}
