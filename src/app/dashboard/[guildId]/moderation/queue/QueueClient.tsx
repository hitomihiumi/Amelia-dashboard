"use client";

import React, { useState } from "react";
import {
  Button,
  Column,
  Feedback,
  Flex,
  RevealFx,
  Row,
  SegmentedControl,
  Tag,
  Text,
  Textarea,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import type { ModerationSubmissionAnswer } from "@/lib/db/types";
import type { GuildActionState } from "@/types/dashboard";
import { handleSubmission } from "../actions";
import { useFormat, useT } from "@/i18n/client";

export interface QueueItem {
  id: string;
  number: number;
  kind: string;
  status: string;
  authorId: string;
  targetId: string | null;
  caseNumber: number | null;
  answers: ModerationSubmissionAnswer[];
  response: string | null;
  handledBy: string | null;
  createdAt: string;
}

const STATUS_VARIANT: Record<
  string,
  "neutral" | "info" | "success" | "danger"
> = {
  pending: "neutral",
  in_review: "info",
  approved: "success",
  rejected: "danger",
};

const STATUSES = ["pending", "in_review", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

const isStatus = (value: string): value is Status =>
  (STATUSES as readonly string[]).includes(value);

export function QueueClient({
  guildId,
  items,
  status,
  kind,
}: {
  guildId: string;
  items: QueueItem[];
  status: string;
  kind: string;
}) {
  const t = useT();
  const router = useRouter();

  const setFilter = (next: { status?: string; kind?: string }) => {
    const params = new URLSearchParams();
    params.set("status", next.status ?? status);
    params.set("kind", next.kind ?? kind);
    router.push(`/dashboard/${guildId}/moderation/queue?${params.toString()}`);
  };

  return (
    <Column fillWidth gap="16">
      <RevealFx delay={300} translateY={-0.5}>
        <Row fillWidth gap="12" wrap>
          <SegmentedControl
            buttons={[
              { value: "open", label: t("moderation.queue.filters.open") },
              ...STATUSES.map((value) => ({
                value,
                label: t(`moderation.queue.status.${value}`),
              })),
            ]}
            value={status}
            onChange={(value) => setFilter({ status: value })}
          />
          <SegmentedControl
            buttons={[
              { value: "all", label: t("moderation.queue.filters.all") },
              { value: "report", label: t("moderation.queue.filters.reports") },
              { value: "appeal", label: t("moderation.queue.filters.appeals") },
            ]}
            value={kind}
            onChange={(value) => setFilter({ kind: value })}
          />
        </Row>
      </RevealFx>

      {items.length === 0 && (
        <RevealFx delay={400} translateY={-0.5}>
          <Feedback
            variant="info"
            title={t("moderation.queue.emptyTitle")}
            description={t("moderation.queue.emptyText")}
          />
        </RevealFx>
      )}

      {items.map((item, idx) => (
        <RevealFx key={item.id} delay={400 + idx * 100} translateY={-0.5}>
          <SubmissionCard guildId={guildId} item={item} />
        </RevealFx>
      ))}
    </Column>
  );
}

function SubmissionCard({
  guildId,
  item,
}: {
  guildId: string;
  item: QueueItem;
}) {
  const t = useT();
  const format = useFormat();
  const router = useRouter();
  const { addToast } = useToast();

  const [response, setResponse] = useState(item.response ?? "");
  const [pending, setPending] = useState(false);

  const resolved = item.status === "approved" || item.status === "rejected";

  const act = async (status: "in_review" | "approved" | "rejected") => {
    setPending(true);

    const result: GuildActionState = await handleSubmission(
      guildId,
      item.id,
      status,
      response.trim() || null,
    );

    setPending(false);

    if (result?.ok) {
      addToast({ message: t("moderation.queue.updated"), variant: "success" });
      router.refresh();
    } else {
      addToast({
        message: result?.error || t("moderation.errors.actionFailed"),
        variant: "danger",
      });
    }
  };

  return (
    <Flex
      direction="column"
      fillWidth
      gap="12"
      padding="20"
      radius="l"
      border="neutral-medium"
      background="surface"
    >
      <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
        <Text variant="heading-strong-s">
          {t("moderation.queue.cardTitle", {
            kind: t(
              item.kind === "appeal"
                ? "moderation.queue.kinds.appeal"
                : "moderation.queue.kinds.report",
            ),
            number: item.number,
          })}
        </Text>
        <Tag scheme={STATUS_VARIANT[item.status] ?? "neutral"}>
          {isStatus(item.status)
            ? t(`moderation.queue.status.${item.status}`)
            : item.status}
        </Tag>
      </Row>

      <Column gap="4">
        <Text variant="body-default-s" onBackground="neutral-weak">
          {[
            t("moderation.queue.author", { id: item.authorId }),
            item.targetId
              ? t("moderation.queue.reported", { id: item.targetId })
              : null,
            item.caseNumber !== null
              ? t("moderation.queue.caseRef", { number: item.caseNumber })
              : null,
          ]
            .filter(Boolean)
            .join(" • ")}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("moderation.queue.sent", {
            date: format.dateTime(item.createdAt),
          })}
          {item.handledBy
            ? ` • ${t("moderation.queue.handledBy", { id: item.handledBy })}`
            : ""}
        </Text>
      </Column>

      <Column gap="8">
        {item.answers.map((answer) => (
          <Column key={answer.fieldId} gap="2">
            <Text variant="label-default-s">{answer.label}</Text>
            <Text variant="body-default-s" onBackground="neutral-medium">
              {answer.value === null || answer.value === ""
                ? "—"
                : String(answer.value)}
            </Text>
          </Column>
        ))}
      </Column>

      {resolved ? (
        item.response && (
          <Column gap="2">
            <Text variant="label-default-s">
              {t("moderation.queue.response")}
            </Text>
            <Text variant="body-default-s" onBackground="neutral-medium">
              {item.response}
            </Text>
          </Column>
        )
      ) : (
        <>
          <Textarea
            id={`response-${item.id}`}
            label={t("moderation.queue.responseLabel")}
            lines={2}
            value={response}
            maxLength={1000}
            onChange={(e) => setResponse(e.target.value)}
          />

          <Row fillWidth gap="8" horizontal="end" wrap>
            <Button
              variant="secondary"
              disabled={pending || item.status === "in_review"}
              onClick={() => act("in_review")}
            >
              {t("moderation.queue.takeInReview")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => act("rejected")}
            >
              {t("moderation.queue.reject")}
            </Button>
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => act("approved")}
            >
              {t("moderation.queue.approve")}
            </Button>
          </Row>
        </>
      )}
    </Flex>
  );
}
