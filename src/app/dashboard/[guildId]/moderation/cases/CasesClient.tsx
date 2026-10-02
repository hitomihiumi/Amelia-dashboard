"use client";

import React, { useState } from "react";
import {
  Button,
  Column,
  Feedback,
  Flex,
  IconButton,
  Input,
  RevealFx,
  Row,
  SegmentedControl,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import type { GuildActionState } from "@/types/dashboard";
import { revokeModerationCase } from "../actions";
import { useFormat, useT } from "@/i18n/client";

export interface CaseItem {
  id: string;
  caseNumber: number;
  type: string;
  typeLabel: string;
  targetId: string;
  moderatorId: string;
  reason: string;
  duration: number | null;
  expiresAt: string | null;
  active: boolean;
  source: string;
  createdAt: string;
}

const TYPE_FILTERS = ["all", "warn", "mute", "ban", "kick", "note"] as const;

const SOURCES = ["command", "automod", "dashboard", "submission"] as const;

const REVOCABLE = ["warn", "mute", "ban"];

export function CasesClient({
  guildId,
  items,
  type,
  user,
  page,
  pages,
}: {
  guildId: string;
  items: CaseItem[];
  type: string;
  user: string;
  page: number;
  pages: number;
}) {
  const t = useT();
  const router = useRouter();
  const [search, setSearch] = useState(user);

  const navigate = (next: { type?: string; user?: string; page?: number }) => {
    const params = new URLSearchParams();
    params.set("type", next.type ?? type);
    if ((next.user ?? user).trim())
      params.set("user", (next.user ?? user).trim());
    params.set("page", String(next.page ?? 1));
    router.push(`/dashboard/${guildId}/moderation/cases?${params.toString()}`);
  };

  return (
    <Column fillWidth gap="16">
      <RevealFx delay={300} translateY={-0.5}>
        <Row fillWidth gap="12" vertical="center" wrap>
          <SegmentedControl
            buttons={TYPE_FILTERS.map((value) => ({
              value,
              label: t(`moderation.cases.filters.${value}`),
            }))}
            value={type}
            onChange={(value) => navigate({ type: value, page: 1 })}
          />
          <Input
            id="case-user"
            label={t("moderation.cases.userFilter")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={
              <IconButton
                icon="search"
                variant="ghost"
                onClick={() => navigate({ user: search, page: 1 })}
              />
            }
          />
        </Row>
      </RevealFx>

      {items.length === 0 && (
        <RevealFx delay={600} translateY={-0.5}>
          <Feedback
            variant="info"
            title={t("moderation.cases.emptyTitle")}
            description={t("moderation.cases.emptyText")}
          />
        </RevealFx>
      )}

      {items.map((item, idx) => (
        <RevealFx delay={400 + idx * 100} translateY={-0.5} key={idx}>
          <CaseCard key={item.id} guildId={guildId} item={item} />
        </RevealFx>
      ))}

      {pages > 1 && (
        <RevealFx delay={600} translateY={-0.5}>
          <Row fillWidth gap="8" horizontal="center" vertical="center">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => navigate({ page: page - 1 })}
            >
              {t("moderation.cases.previous")}
            </Button>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("moderation.cases.pageOf", { page, pages })}
            </Text>
            <Button
              variant="secondary"
              disabled={page >= pages}
              onClick={() => navigate({ page: page + 1 })}
            >
              {t("moderation.cases.next")}
            </Button>
          </Row>
        </RevealFx>
      )}
    </Column>
  );
}

function CaseCard({ guildId, item }: { guildId: string; item: CaseItem }) {
  const t = useT();
  const format = useFormat();
  const router = useRouter();
  const { addToast } = useToast();

  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const source = (SOURCES as readonly string[]).includes(item.source)
    ? t(`moderation.cases.sources.${item.source as (typeof SOURCES)[number]}`)
    : item.source;

  const canRevoke = item.active && REVOCABLE.includes(item.type);

  const revoke = async () => {
    setPending(true);

    const result: GuildActionState = await revokeModerationCase(
      guildId,
      item.caseNumber,
      reason,
    );

    setPending(false);

    if (result?.ok) {
      addToast({
        message: t("moderation.cases.revoked", { number: item.caseNumber }),
        variant: "success",
      });
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
      gap="8"
      padding="20"
      radius="l"
      border="neutral-medium"
      background="surface"
    >
      <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
        <Text variant="heading-strong-s">
          {t("moderation.cases.caseTitle", {
            number: item.caseNumber,
            type: item.typeLabel,
          })}
        </Text>
        <Tag scheme={item.active ? "danger" : "neutral"}>
          {item.active
            ? t("moderation.cases.active")
            : t("moderation.cases.closed")}
        </Tag>
      </Row>

      <Text variant="body-default-s" onBackground="neutral-weak">
        {t("moderation.cases.user", { id: item.targetId })} •{" "}
        {t("moderation.cases.moderator", {
          moderator:
            item.moderatorId === "AUTOMOD"
              ? t("moderation.cases.autoModeration")
              : item.moderatorId,
        })}{" "}
        • {source}
      </Text>

      {["ban", "mute"].includes(item.type) && (
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("moderation.cases.duration", {
            value: item.duration
              ? t("moderation.cases.durationSeconds", {
                  seconds: item.duration,
                })
              : t("moderation.cases.permanent"),
          })}
        </Text>
      )}

      <Text variant="body-default-s" onBackground="neutral-medium">
        {item.reason}
      </Text>

      <Text variant="body-default-xs" onBackground="neutral-weak">
        {format.dateTime(item.createdAt)}
        {item.expiresAt
          ? ` • ${t("moderation.cases.expires", { date: format.dateTime(item.expiresAt) })}`
          : ""}
      </Text>

      {canRevoke && (
        <Row fillWidth gap="8" vertical="center" wrap>
          <Input
            id={`revoke-reason-${item.id}`}
            label={t("moderation.cases.revokeReason")}
            value={reason}
            maxLength={400}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button variant="danger" disabled={pending} onClick={revoke}>
            {t("moderation.cases.revoke")}
          </Button>
        </Row>
      )}
    </Flex>
  );
}
