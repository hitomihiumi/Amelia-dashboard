"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  Chip,
  Column,
  Feedback,
  Grid,
  IconButton,
  Input,
  RevealFx,
  Row,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import type { GuildActionState } from "@/types/dashboard";
import { revokeModerationCase } from "../actions";
import { useFormat, useT } from "@/i18n/client";
import styles from "./CasesClient.module.scss";

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

const TYPE_SCHEME: Record<
  string,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  ban: "danger",
  kick: "danger",
  mute: "warning",
  warn: "warning",
  unban: "success",
  unmute: "success",
  unwarn: "success",
  note: "info",
  purge: "neutral",
};

// Table cells: the grid area comes from the row template (see the module).
const cell = (area: string): React.CSSProperties => ({
  gridArea: area,
  minWidth: 0,
  overflowWrap: "anywhere",
});

const COLUMNS = [
  ["num", "number"],
  ["type", "type"],
  ["user", "user"],
  ["mod", "moderator"],
  ["reason", "reason"],
  ["source", "source"],
  ["date", "date"],
  ["status", "status"],
] as const;

const COMPACT_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

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
  const format = useFormat();
  const router = useRouter();
  const [search, setSearch] = useState(user);
  // undefined: first case, null: the person closed the detail.
  const [selectedId, setSelectedId] = useState<string | null | undefined>(
    undefined,
  );

  const selected =
    selectedId === null
      ? null
      : (items.find((item) => item.id === selectedId) ?? items[0] ?? null);

  const navigate = (next: { type?: string; user?: string; page?: number }) => {
    const params = new URLSearchParams();
    params.set("type", next.type ?? type);
    if ((next.user ?? user).trim())
      params.set("user", (next.user ?? user).trim());
    params.set("page", String(next.page ?? 1));
    router.push(`/dashboard/${guildId}/moderation/cases?${params.toString()}`);
  };

  const moderatorLabel = (id: string) =>
    id === "AUTOMOD" ? t("moderation.cases.autoModeration") : id;
  const sourceLabel = (value: string) =>
    (SOURCES as readonly string[]).includes(value)
      ? t(`moderation.cases.sources.${value as (typeof SOURCES)[number]}`)
      : value;

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
            {TYPE_FILTERS.map((value) => (
              <Chip
                key={value}
                selected={type === value}
                label={t(`moderation.cases.filters.${value}`)}
                onClick={() => navigate({ type: value, page: 1 })}
              />
            ))}
          </Row>
          <Column style={{ flex: "0 1 380px", minWidth: "min(100%, 260px)" }}>
            <Input
              id="case-user"
              label={t("moderation.cases.userFilter")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate({ user: search, page: 1 });
              }}
              prefix={
                <IconButton
                  icon="search"
                  variant="ghost"
                  onClick={() => navigate({ user: search, page: 1 })}
                />
              }
            />
          </Column>
        </Row>
      </RevealFx>

      {items.length === 0 && (
        <RevealFx delay={200} translateY={-0.5} fillWidth>
          <Feedback
            variant="info"
            title={t("moderation.cases.emptyTitle")}
            description={t("moderation.cases.emptyText")}
          />
        </RevealFx>
      )}

      {items.length > 0 && (
        <Grid
          fillWidth
          minWidth={0}
          className={styles.board}
          style={
            {
              "--rows": items.length,
              "--span": items.length + 2,
            } as React.CSSProperties
          }
        >
          <Grid className={styles.head} aria-hidden>
            {COLUMNS.map(([area, key]) => (
              <Text
                key={key}
                className={
                  area === "mod" || area === "source"
                    ? styles.wideOnly
                    : undefined
                }
                style={{ gridArea: area }}
                variant="label-default-xs"
                onBackground="neutral-weak"
              >
                {t(`moderation.cases.columns.${key}`)}
              </Text>
            ))}
          </Grid>

          {items.map((item, idx) => {
            const open = selected?.id === item.id;
            return (
              <React.Fragment key={item.id}>
                <RevealFx
                  delay={Math.min(idx * 30, 400)}
                  translateY={-0.5}
                  fillWidth
                  className={styles.rowWrap}
                >
                  <Card
                    selected={open}
                    onClick={() => setSelectedId(open ? null : item.id)}
                    padding="0"
                    radius="l"
                    fillWidth
                    minWidth={0}
                    className={styles.card}
                  >
                    <Grid fillWidth minWidth={0} className={styles.row}>
                      <Text
                        style={{ gridArea: "num" }}
                        variant="heading-strong-s"
                      >
                        #{item.caseNumber}
                      </Text>
                      <Tag
                        scheme={TYPE_SCHEME[item.type] ?? "neutral"}
                        style={{ gridArea: "type", justifySelf: "start" }}
                      >
                        {item.typeLabel}
                      </Tag>
                      <Text
                        style={cell("user")}
                        variant="code-default-xs"
                        onBackground="neutral-medium"
                      >
                        {item.targetId}
                      </Text>
                      <Text
                        className={styles.wideOnly}
                        style={cell("mod")}
                        variant="body-default-xs"
                        onBackground="neutral-weak"
                      >
                        {moderatorLabel(item.moderatorId)}
                      </Text>
                      <Text
                        className={styles.clamp}
                        style={{ gridArea: "reason" }}
                        variant="body-default-s"
                        onBackground="neutral-medium"
                      >
                        {item.reason}
                      </Text>
                      <Text
                        className={styles.wideOnly}
                        style={cell("source")}
                        variant="body-default-xs"
                        onBackground="neutral-weak"
                      >
                        {sourceLabel(item.source)}
                      </Text>
                      <Text
                        style={cell("date")}
                        variant="body-default-xs"
                        onBackground="neutral-weak"
                      >
                        {format.dateTime(item.createdAt, COMPACT_DATE)}
                      </Text>
                      <Tag
                        scheme={item.active ? "danger" : "neutral"}
                        className={styles.status}
                        style={{ gridArea: "status" }}
                      >
                        {item.active
                          ? t("moderation.cases.active")
                          : t("moderation.cases.closed")}
                      </Tag>
                    </Grid>
                  </Card>
                </RevealFx>

                {open && (
                  <CaseDetail
                    key={item.id}
                    guildId={guildId}
                    item={item}
                    source={sourceLabel(item.source)}
                    moderator={moderatorLabel(item.moderatorId)}
                  />
                )}
              </React.Fragment>
            );
          })}

          {!selected && (
            <Column center minWidth={0} className={styles.placeholder}>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {t("moderation.cases.selectHint")}
              </Text>
            </Column>
          )}
        </Grid>
      )}

      {pages > 1 && (
        <RevealFx delay={200} translateY={-0.5} fillWidth>
          <Row
            wrap
            vertical="center"
            horizontal="center"
            style={{ gap: "var(--static-space-8) var(--static-space-16)" }}
          >
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

function CaseDetail({
  guildId,
  item,
  source,
  moderator,
}: {
  guildId: string;
  item: CaseItem;
  source: string;
  moderator: string;
}) {
  const t = useT();
  const format = useFormat();
  const router = useRouter();
  const { addToast } = useToast();

  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

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

  const facts = [
    t("moderation.cases.user", { id: item.targetId }),
    t("moderation.cases.moderator", { moderator }),
    `${t("moderation.cases.columns.source")}: ${source}`,
    ["ban", "mute"].includes(item.type)
      ? t("moderation.cases.duration", {
          value: item.duration
            ? t("moderation.cases.durationSeconds", { seconds: item.duration })
            : t("moderation.cases.permanent"),
        })
      : null,
    `${t("moderation.cases.columns.date")}: ${format.dateTime(item.createdAt)}`,
    item.expiresAt
      ? t("moderation.cases.expires", { date: format.dateTime(item.expiresAt) })
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
        style={{ gap: "var(--static-space-8) var(--static-space-16)" }}
      >
        <Text variant="heading-strong-m">
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

      <Text
        variant="body-default-m"
        onBackground="neutral-medium"
        style={{
          maxWidth: "72ch",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {item.reason}
      </Text>

      <Grid
        gap="4"
        minWidth={0}
        className={styles.facts}
        style={{ overflowWrap: "anywhere" }}
      >
        {facts.map((fact) => (
          <Text key={fact} variant="body-default-s" onBackground="neutral-weak">
            {fact}
          </Text>
        ))}
      </Grid>

      {canRevoke && (
        <Column gap="12" paddingTop="16" borderTop="neutral-medium">
          <Input
            id={`revoke-reason-${item.id}`}
            label={t("moderation.cases.revokeReason")}
            value={reason}
            maxLength={400}
            onChange={(e) => setReason(e.target.value)}
          />
          <Row horizontal="end" className={styles.revokeActions}>
            <Button variant="danger" disabled={pending} onClick={revoke}>
              {t("moderation.cases.revoke")}
            </Button>
          </Row>
        </Column>
      )}
    </Column>
  );
}
