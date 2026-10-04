"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Column, Input, Row, SegmentedControl, Tag, Text } from "@once-ui-system/core";
import { useT } from "@/i18n/client";
import { useStableFormat } from "@/components/status/useStableFormat";
import { AdminCard } from "@/components/admin/AdminPage";
import { PlainItem, PlainList } from "@/components/admin/PlainList";
import type { LogsResult } from "@/lib/admin/logs";

interface Filters {
  level: "all" | "error" | "warn";
  container: string;
  q: string;
  hours: number;
}

interface LogsViewProps {
  result: LogsResult;
  now: number;
  filters: Filters;
}

const REFRESH_MS = 15_000;
const HOURS = [1, 6, 24];

export function LogsView({ result, filters }: LogsViewProps) {
  const t = useT();
  const format = useStableFormat();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q);
  const [live, setLive] = useState(true);

  useEffect(() => setQuery(filters.q), [filters.q]);

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => startTransition(() => router.refresh()), REFRESH_MS);
    return () => clearInterval(timer);
  }, [live, router]);

  const apply = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    const params = new URLSearchParams();
    if (next.level !== "all") params.set("level", next.level);
    if (next.container) params.set("container", next.container);
    if (next.q) params.set("q", next.q);
    if (next.hours !== 24) params.set("hours", String(next.hours));
    const search = params.toString();
    startTransition(() =>
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false }),
    );
  };

  const totalErrors = result.containers.reduce((sum, c) => sum + c.errors, 0);
  const totalWarnings = result.containers.reduce((sum, c) => sum + c.warnings, 0);

  if (!result.available) {
    return (
      <AdminCard>
        <Text variant="heading-strong-s">{t("adminLogs.unavailable.title")}</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("adminLogs.unavailable.text")}
        </Text>
      </AdminCard>
    );
  }

  return (
    <Column fillWidth gap="16">
      <Row wrap gap="8" vertical="center">
        <Tag scheme="danger">{t("adminLogs.summary.errors", { count: totalErrors })}</Tag>
        <Tag scheme="warning">{t("adminLogs.summary.warnings", { count: totalWarnings })}</Tag>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {t("adminLogs.summary.window", { hours: filters.hours })}
        </Text>
      </Row>

      <Row wrap gap="12" vertical="center">
        <SegmentedControl
          fillWidth={false}
          aria-label={t("adminLogs.filters.level")}
          value={filters.level}
          onChange={(value) => apply({ level: value as Filters["level"] })}
          buttons={[
            { value: "all", label: t("adminLogs.filters.all") },
            { value: "error", label: t("adminLogs.level.error") },
            { value: "warn", label: t("adminLogs.level.warn") },
          ]}
        />
        <SegmentedControl
          fillWidth={false}
          aria-label={t("adminLogs.filters.period")}
          value={String(filters.hours)}
          onChange={(value) => apply({ hours: Number(value) })}
          buttons={HOURS.map((hours) => ({
            value: String(hours),
            label: t("adminLogs.filters.hours", { hours }),
          }))}
        />
        <Button
          variant={live ? "primary" : "secondary"}
          prefixIcon="refresh"
          onClick={() => setLive((value) => !value)}
        >
          {t(live ? "adminLogs.live.on" : "adminLogs.live.off")}
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
        >
          {t("adminLogs.refresh")}
        </Button>
      </Row>

      <Row wrap gap="8">
        <Button
          size="s"
          variant={filters.container ? "secondary" : "primary"}
          onClick={() => apply({ container: "" })}
        >
          {t("adminLogs.filters.allContainers")}
        </Button>
        {result.containers.map((container) => (
          <Button
            key={container.name}
            size="s"
            variant={filters.container === container.name ? "primary" : "secondary"}
            onClick={() => apply({ container: container.name })}
          >
            {container.name} · {container.errors}/{container.warnings}
          </Button>
        ))}
      </Row>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q: query.trim() });
        }}
      >
        <Input
          id="logs-search"
          label={t("adminLogs.filters.search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>

      {result.entries.length === 0 ? (
        <AdminCard>
          <Text variant="heading-strong-s">{t("adminLogs.empty.title")}</Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("adminLogs.empty.text")}
          </Text>
        </AdminCard>
      ) : (
        <AdminCard padding="16" gap="8">
          <PlainList gap="8">
            {result.entries.map((entry) => (
              <PlainItem
                key={`${entry.container}:${entry.id}:${entry.message.length}`}
                gap="12"
                vertical="start"
                fillWidth
              >
                <Text
                  variant="body-default-xs"
                  onBackground="neutral-weak"
                  style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}
                  title={format.dateTime(entry.ts, { dateStyle: "long", timeStyle: "medium" })}
                >
                  {format.dateTime(entry.ts, { dateStyle: "short", timeStyle: "medium" })}
                </Text>
                <Tag scheme={entry.level === "error" ? "danger" : "warning"}>
                  {t(`adminLogs.level.${entry.level === "error" ? "error" : "warn"}`)}
                </Tag>
                <Tag scheme="neutral">{entry.container}</Tag>
                <Text
                  variant="code-default-s"
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", minWidth: 0, flex: 1 }}
                >
                  {entry.message}
                </Text>
              </PlainItem>
            ))}
          </PlainList>
          {result.truncated && (
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {t("adminLogs.truncated", { shown: result.entries.length, total: result.total })}
            </Text>
          )}
        </AdminCard>
      )}
    </Column>
  );
}
