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

const STATUS_VARIANT: Record<string, "neutral" | "info" | "success" | "danger"> = {
  pending: "neutral",
  in_review: "info",
  approved: "success",
  rejected: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
};

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
  const router = useRouter();

  const setFilter = (next: { status?: string; kind?: string }) => {
    const params = new URLSearchParams();
    params.set("status", next.status ?? status);
    params.set("kind", next.kind ?? kind);
    router.push(`/dashboard/${guildId}/moderation/queue?${params.toString()}`);
  };

  return (
    <Column fillWidth gap="16">
      <RevealFx delay={0.3} translateY={-0.5}>
        <Row fillWidth gap="12" wrap>
          <SegmentedControl
            buttons={[
              { value: "open", label: "Open" },
              { value: "pending", label: "Pending" },
              { value: "in_review", label: "In review" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
            selected={status}
            onToggle={(value) => setFilter({ status: value })}
          />
          <SegmentedControl
            buttons={[
              { value: "all", label: "All" },
              { value: "report", label: "Reports" },
              { value: "appeal", label: "Appeals" },
            ]}
            selected={kind}
            onToggle={(value) => setFilter({ kind: value })}
          />
        </Row>
      </RevealFx>

      {items.length === 0 && (
        <RevealFx delay={0.4} translateY={-0.5}>
          <Feedback
            variant="info"
            title="Nothing here"
            description="No submissions match the current filters."
          />
        </RevealFx>
      )}

      {items.map((item, idx) => (
        <RevealFx delay={0.4 + idx * 0.1} translateY={-0.5}>
          <SubmissionCard key={item.id} guildId={guildId} item={item} />
        </RevealFx>
      ))}
    </Column>
  );
}

function SubmissionCard({ guildId, item }: { guildId: string; item: QueueItem }) {
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
      addToast({ message: "Submission updated", variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result?.error || "Action failed", variant: "danger" });
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
          {item.kind === "appeal" ? "Appeal" : "Report"} #{item.number}
        </Text>
        <Tag variant={STATUS_VARIANT[item.status] ?? "neutral"}>
          {STATUS_LABEL[item.status] ?? item.status}
        </Tag>
      </Row>

      <Column gap="4">
        <Text variant="body-default-s" onBackground="neutral-weak">
          Author: {item.authorId}
          {item.targetId ? ` • Reported: ${item.targetId}` : ""}
          {item.caseNumber !== null ? ` • Case #${item.caseNumber}` : ""}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Sent {new Date(item.createdAt).toLocaleString()}
          {item.handledBy ? ` • Handled by ${item.handledBy}` : ""}
        </Text>
      </Column>

      <Column gap="8">
        {item.answers.map((answer) => (
          <Column key={answer.fieldId} gap="2">
            <Text variant="label-default-s">{answer.label}</Text>
            <Text variant="body-default-s" onBackground="neutral-medium">
              {answer.value === null || answer.value === "" ? "—" : String(answer.value)}
            </Text>
          </Column>
        ))}
      </Column>

      {resolved ? (
        item.response && (
          <Column gap="2">
            <Text variant="label-default-s">Response</Text>
            <Text variant="body-default-s" onBackground="neutral-medium">
              {item.response}
            </Text>
          </Column>
        )
      ) : (
        <>
          <Textarea
            id={`response-${item.id}`}
            label="Response to the author (sent in DM)"
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
              Take in review
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => act("rejected")}>
              Reject
            </Button>
            <Button variant="primary" disabled={pending} onClick={() => act("approved")}>
              Approve
            </Button>
          </Row>
        </>
      )}
    </Flex>
  );
}
