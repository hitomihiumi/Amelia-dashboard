"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  Chip,
  Column,
  Feedback,
  Grid,
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
import styles from "./QueueClient.module.scss";

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

const firstAnswer = (answers: ModerationSubmissionAnswer[]) => {
  const found = answers.find((a) => a.value !== null && a.value !== "");
  return found ? String(found.value) : null;
};

// Long free text gets the whole row, short answers share it.
const isLong = (value: string) => value.length > 90 || value.includes("\n");

// Answers and facts follow the width of the detail panel, not the viewport.
const autoFit = (min: number): React.CSSProperties => ({
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
});

export function QueueClient({
  guildId,
  items,
  counts,
  status,
  kind,
}: {
  guildId: string;
  items: QueueItem[];
  counts: Record<string, number>;
  status: string;
  kind: string;
}) {
  const t = useT();
  const format = useFormat();
  const router = useRouter();

  // undefined: first submission, null: the person closed the detail.
  const [selectedId, setSelectedId] = useState<string | null | undefined>(
    undefined,
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const selected =
    selectedId === null
      ? null
      : (items.find((item) => item.id === selectedId) ?? items[0] ?? null);

  const setFilter = (next: { status?: string; kind?: string }) => {
    const params = new URLSearchParams();
    params.set("status", next.status ?? status);
    params.set("kind", next.kind ?? kind);
    router.push(`/dashboard/${guildId}/moderation/queue?${params.toString()}`);
  };

  const statusFilters = [
    { value: "open", label: t("moderation.queue.filters.open") },
    ...STATUSES.map((value) => ({
      value,
      label: t(`moderation.queue.status.${value}`),
    })),
  ];

  return (
    <Column fillWidth gap="16">
      <RevealFx delay={100} translateY={-0.5} fillWidth>
        <Row
          fillWidth
          wrap
          vertical="center"
          horizontal="between"
          style={{ gap: "var(--static-space-12) var(--static-space-24)" }}
        >
          <Row wrap gap="8" minWidth={0} role="group">
            {statusFilters.map((filter) => (
              <Chip
                key={filter.value}
                // The label and the count render together as children.
                label=""
                selected={status === filter.value}
                onClick={() => setFilter({ status: filter.value })}
              >
                <Row as="span" gap="8" vertical="center">
                  {filter.label}
                  {counts[filter.value] !== undefined && (
                    <Tag size="s">{counts[filter.value]}</Tag>
                  )}
                </Row>
              </Chip>
            ))}
          </Row>
          <Column style={{ flex: "0 1 380px", minWidth: "min(100%, 260px)" }}>
            <SegmentedControl
              buttons={[
                { value: "all", label: t("moderation.queue.filters.all") },
                {
                  value: "report",
                  label: t("moderation.queue.filters.reports"),
                },
                {
                  value: "appeal",
                  label: t("moderation.queue.filters.appeals"),
                },
              ]}
              value={kind}
              onChange={(value) => setFilter({ kind: value })}
            />
          </Column>
        </Row>
      </RevealFx>

      {items.length === 0 && (
        <RevealFx delay={200} translateY={-0.5} fillWidth>
          <Feedback
            variant="info"
            title={t("moderation.queue.emptyTitle")}
            description={t("moderation.queue.emptyText")}
          />
        </RevealFx>
      )}

      {items.length > 0 && (
        <Grid
          fillWidth
          gap="8"
          minWidth={0}
          className={styles.board}
          style={
            {
              "--rows": items.length,
              "--span": items.length + 1,
            } as React.CSSProperties
          }
        >
          {items.map((item, idx) => {
            const open = selected?.id === item.id;
            const snippet = firstAnswer(item.answers);
            const title = t("moderation.queue.cardTitle", {
              kind: t(
                item.kind === "appeal"
                  ? "moderation.queue.kinds.appeal"
                  : "moderation.queue.kinds.report",
              ),
              number: item.number,
            });

            return (
              <React.Fragment key={item.id}>
                <RevealFx
                  delay={Math.min(idx * 50, 400)}
                  translateY={-0.5}
                  fillWidth
                  className={styles.rowWrap}
                >
                  <Card
                    selected={open}
                    onClick={() => setSelectedId(open ? null : item.id)}
                    direction="column"
                    gap="8"
                    padding="16"
                    radius="l"
                    fillWidth
                    minWidth={0}
                  >
                    <Row
                      fillWidth
                      vertical="center"
                      horizontal="between"
                      gap="8"
                    >
                      <Text variant="heading-strong-s">{title}</Text>
                      <StatusTag status={item.status} />
                    </Row>
                    <Row
                      fillWidth
                      wrap
                      minWidth={0}
                      style={{
                        columnGap: "var(--static-space-8)",
                        overflowWrap: "anywhere",
                      }}
                    >
                      <Text
                        variant="code-default-xs"
                        onBackground="neutral-weak"
                      >
                        {item.authorId}
                      </Text>
                      {item.targetId && (
                        <Text
                          variant="body-default-xs"
                          onBackground="neutral-weak"
                        >
                          → {item.targetId}
                        </Text>
                      )}
                    </Row>
                    {snippet && (
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-medium"
                        className={styles.snippet}
                      >
                        {snippet}
                      </Text>
                    )}
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {format.dateTime(item.createdAt)}
                    </Text>
                  </Card>
                </RevealFx>

                {open && (
                  <SubmissionDetail
                    guildId={guildId}
                    item={item}
                    draft={drafts[item.id] ?? item.response ?? ""}
                    onDraft={(value) =>
                      setDrafts((prev) => ({ ...prev, [item.id]: value }))
                    }
                  />
                )}
              </React.Fragment>
            );
          })}

          {!selected && (
            <Column center minWidth={0} className={styles.placeholder}>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {t("moderation.queue.selectHint")}
              </Text>
            </Column>
          )}
        </Grid>
      )}
    </Column>
  );
}

function StatusTag({ status }: { status: string }) {
  const t = useT();
  return (
    <Tag scheme={STATUS_VARIANT[status] ?? "neutral"}>
      {isStatus(status) ? t(`moderation.queue.status.${status}`) : status}
    </Tag>
  );
}

function SubmissionDetail({
  guildId,
  item,
  draft,
  onDraft,
}: {
  guildId: string;
  item: QueueItem;
  draft: string;
  onDraft: (value: string) => void;
}) {
  const t = useT();
  const format = useFormat();
  const router = useRouter();
  const { addToast } = useToast();

  const [pending, setPending] = useState(false);

  const resolved = item.status === "approved" || item.status === "rejected";

  const act = async (status: "in_review" | "approved" | "rejected") => {
    setPending(true);

    const result: GuildActionState = await handleSubmission(
      guildId,
      item.id,
      status,
      draft.trim() || null,
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

  const facts = [
    t("moderation.queue.author", { id: item.authorId }),
    item.targetId
      ? t("moderation.queue.reported", { id: item.targetId })
      : null,
    item.caseNumber !== null
      ? t("moderation.queue.caseRef", { number: item.caseNumber })
      : null,
    t("moderation.queue.sent", { date: format.dateTime(item.createdAt) }),
    item.handledBy
      ? t("moderation.queue.handledBy", { id: item.handledBy })
      : null,
  ].filter(Boolean);

  return (
    <Column
      gap="16"
      minWidth={0}
      radius="l"
      border="neutral-medium"
      background="surface"
      className={styles.detail}
    >
      <Row
        wrap
        vertical="center"
        horizontal="between"
        className={styles.head}
        style={{ gap: "var(--static-space-8) var(--static-space-16)" }}
      >
        <Text variant="heading-strong-m">
          {t("moderation.queue.cardTitle", {
            kind: t(
              item.kind === "appeal"
                ? "moderation.queue.kinds.appeal"
                : "moderation.queue.kinds.report",
            ),
            number: item.number,
          })}
        </Text>
        <StatusTag status={item.status} />
      </Row>

      <Grid
        gap="4"
        minWidth={0}
        style={{
          ...autoFit(220),
          columnGap: "var(--static-space-16)",
          overflowWrap: "anywhere",
        }}
      >
        {facts.map((fact) => (
          <Text key={fact} variant="body-default-s" onBackground="neutral-weak">
            {fact}
          </Text>
        ))}
      </Grid>

      <Grid gap="20" minWidth={0} className={styles.body}>
        <Grid gap="16" minWidth={0} style={autoFit(240)}>
          {item.answers.map((answer) => {
            const value =
              answer.value === null || answer.value === ""
                ? "—"
                : String(answer.value);
            return (
              <Column
                key={answer.fieldId}
                gap="4"
                minWidth={0}
                style={{
                  overflowWrap: "anywhere",
                  ...(isLong(value)
                    ? {
                        gridColumn: "1 / -1",
                        maxWidth: "80ch",
                        whiteSpace: "pre-wrap",
                      }
                    : null),
                }}
              >
                <Text variant="label-default-s">{answer.label}</Text>
                <Text variant="body-default-s" onBackground="neutral-medium">
                  {value}
                </Text>
              </Column>
            );
          })}
        </Grid>

        {resolved ? (
          item.response && (
            <Column gap="12" minWidth={0} className={styles.reply}>
              <Text variant="label-default-s">
                {t("moderation.queue.response")}
              </Text>
              <Text variant="body-default-s" onBackground="neutral-medium">
                {item.response}
              </Text>
            </Column>
          )
        ) : (
          <Column gap="12" minWidth={0} className={styles.reply}>
            <Textarea
              id={`response-${item.id}`}
              label={t("moderation.queue.responseLabel")}
              lines={3}
              value={draft}
              maxLength={1000}
              onChange={(e) => onDraft(e.target.value)}
            />

            <Row wrap horizontal="end" gap="8" className={styles.actions}>
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
          </Column>
        )}
      </Grid>
    </Column>
  );
}
