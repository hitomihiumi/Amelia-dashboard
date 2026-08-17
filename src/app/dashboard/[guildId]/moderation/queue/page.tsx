import React from "react";
import { Flex, Text } from "@once-ui-system/core";
import { prisma } from "@/lib/db/db";
import type { ModerationSubmissionAnswer } from "@/lib/db/types";
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

  const status = STATUS_FILTERS.includes(query.status ?? "") ? query.status! : "open";
  const kind = KIND_FILTERS.includes(query.kind ?? "") ? query.kind! : "all";

  const submissions = await prisma.moderationSubmission.findMany({
    where: {
      guildId,
      ...(kind === "all" ? {} : { kind }),
      ...(status === "open" ? { status: { in: ["pending", "in_review"] } } : { status }),
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
      <Flex direction="column" gap="8">
        <Text variant="heading-strong-l">Submission queue</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Reports and appeals sent through the dashboard forms. Approving an appeal automatically
          lifts the punishment it was filed against.
        </Text>
      </Flex>

      <QueueClient guildId={guildId} items={items} status={status} kind={kind} />
    </Flex>
  );
}
