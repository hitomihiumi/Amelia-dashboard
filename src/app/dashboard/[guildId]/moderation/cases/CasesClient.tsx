"use client";

import React, { useState } from "react";
import {
  Button,
  Column,
  Feedback,
  IconButton,
  Input,
  RevealFx,
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
        <div className={styles.toolbar}>
          <div className={styles.chips} role="group">
            {TYPE_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                className={styles.chip}
                aria-pressed={type === value}
                onClick={() => navigate({ type: value, page: 1 })}
              >
                {t(`moderation.cases.filters.${value}`)}
              </button>
            ))}
          </div>
          <div className={styles.search}>
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
          </div>
        </div>
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
        <div
          className={styles.board}
          style={
            {
              "--rows": items.length,
              "--span": items.length + 2,
            } as React.CSSProperties
          }
        >
          <div className={styles.head} aria-hidden>
            {(
              [
                ["hnum", "number"],
                ["htype", "type"],
                ["huser", "user"],
                ["hmod", "moderator"],
                ["hreason", "reason"],
                ["hsource", "source"],
                ["hdate", "date"],
                ["hstatus", "status"],
              ] as const
            ).map(([cls, key]) => (
              <Text
                key={key}
                className={styles[cls]}
                variant="label-default-xs"
                onBackground="neutral-weak"
              >
                {t(`moderation.cases.columns.${key}`)}
              </Text>
            ))}
          </div>

          {items.map((item, idx) => {
            const open = selected?.id === item.id;
            return (
              <div key={item.id} className={styles.entry}>
                <RevealFx
                  delay={Math.min(idx * 30, 400)}
                  translateY={-0.5}
                  fillWidth
                  className={styles.rowWrap}
                >
                  <button
                    type="button"
                    className={styles.row}
                    aria-expanded={open}
                    onClick={() => setSelectedId(open ? null : item.id)}
                  >
                    <Text className={styles.num} variant="heading-strong-s">
                      #{item.caseNumber}
                    </Text>
                    <span className={styles.type}>
                      <Tag scheme={TYPE_SCHEME[item.type] ?? "neutral"}>
                        {item.typeLabel}
                      </Tag>
                    </span>
                    <Text
                      className={`${styles.user} ${styles.cell}`}
                      variant="code-default-xs"
                      onBackground="neutral-medium"
                    >
                      {item.targetId}
                    </Text>
                    <Text
                      className={`${styles.mod} ${styles.cell}`}
                      variant="body-default-xs"
                      onBackground="neutral-weak"
                    >
                      {moderatorLabel(item.moderatorId)}
                    </Text>
                    <Text
                      className={`${styles.reason} ${styles.clamp}`}
                      variant="body-default-s"
                      onBackground="neutral-medium"
                    >
                      {item.reason}
                    </Text>
                    <Text
                      className={`${styles.source} ${styles.cell}`}
                      variant="body-default-xs"
                      onBackground="neutral-weak"
                    >
                      {sourceLabel(item.source)}
                    </Text>
                    <Text
                      className={`${styles.date} ${styles.cell}`}
                      variant="body-default-xs"
                      onBackground="neutral-weak"
                    >
                      {format.dateTime(item.createdAt, COMPACT_DATE)}
                    </Text>
                    <span className={styles.status}>
                      <Tag scheme={item.active ? "danger" : "neutral"}>
                        {item.active
                          ? t("moderation.cases.active")
                          : t("moderation.cases.closed")}
                      </Tag>
                    </span>
                  </button>
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
              </div>
            );
          })}

          {!selected && (
            <div className={styles.placeholder}>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {t("moderation.cases.selectHint")}
              </Text>
            </div>
          )}
        </div>
      )}

      {pages > 1 && (
        <RevealFx delay={200} translateY={-0.5} fillWidth>
          <div className={styles.pager}>
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
          </div>
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
    <div className={styles.detail}>
      <div className={styles.detailHead}>
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
      </div>

      <Text
        variant="body-default-m"
        onBackground="neutral-medium"
        className={styles.reasonText}
      >
        {item.reason}
      </Text>

      <div className={styles.facts}>
        {facts.map((fact) => (
          <Text key={fact} variant="body-default-s" onBackground="neutral-weak">
            {fact}
          </Text>
        ))}
      </div>

      {canRevoke && (
        <div className={styles.revoke}>
          <Input
            id={`revoke-reason-${item.id}`}
            label={t("moderation.cases.revokeReason")}
            value={reason}
            maxLength={400}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className={styles.revokeActions}>
            <Button variant="danger" disabled={pending} onClick={revoke}>
              {t("moderation.cases.revoke")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
