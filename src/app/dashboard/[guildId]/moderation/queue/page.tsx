import React from "react";
import { Flex } from "@once-ui-system/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { prisma } from "@/lib/db/db";
import type { ModerationSubmissionAnswer } from "@/lib/db/types";
import { getT } from "@/i18n/server";
import { QueueClient, type QueueItem } from "./QueueClient";

const STATUS_FILTERS = ["open", "pending", "in_review", "approved", "rejected"];
const KIND_FILTERS = ["all", "report", "appeal"];

export default async function ModerationQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ guildId: string }>;
  searchParams: Promise<{ status?: string; kind?: string }>;
}) {
  const { guildId } = await params;
  const query = await searchParams;
  const t = await getT();

  const status = STATUS_FILTERS.includes(query.status ?? "")
    ? query.status!
    : "open";
  const kind = KIND_FILTERS.includes(query.kind ?? "") ? query.kind! : "all";

  const statusCounts = await prisma.moderationSubmission.groupBy({
    by: ["status"],
    where: { guildId, ...(kind === "all" ? {} : { kind }) },
    _count: { _all: true },
  });
  const counts: Record<string, number> = { open: 0 };
  for (const row of statusCounts) {
    counts[row.status] = row._count._all;
    if (row.status === "pending" || row.status === "in_review") counts.open += row._count._all;
  }

  const submissions = await prisma.moderationSubmission.findMany({
    where: {
      guildId,
      ...(kind === "all" ? {} : { kind }),
      ...(status === "open"
        ? { status: { in: ["pending", "in_review"] } }
        : { status }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { case: { select: { caseNumber: true } } },
  });

  const items: QueueItem[] = submissions.map((submission) => ({
    id: submission.id,
    number: submission.number,
    kind: submission.kind,
    status: submission.status,
    authorId: submission.authorId,
    targetId: submission.targetId,
    caseNumber: submission.case?.caseNumber ?? null,
    answers: Array.isArray(submission.answers)
      ? (submission.answers as unknown as ModerationSubmissionAnswer[])
      : [],
    response: submission.response,
    handledBy: submission.handledBy,
    createdAt: submission.createdAt.toISOString(),
  }));

  return (
    <Flex direction="column" gap="24">
      <PageHeader title={t("moderation.queue.title")} description={t("moderation.queue.description")} />

      <QueueClient
        guildId={guildId}
        items={items}
        counts={counts}
        status={status}
        kind={kind}
      />
    </Flex>
  );
}
