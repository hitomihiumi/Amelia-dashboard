"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import classNames from "classnames";
import { Button, Column, Input, Row, SegmentedControl, Text } from "@once-ui-system/core";
import { useT } from "@/i18n/client";
import { useStableFormat } from "@/components/status/useStableFormat";
import tones from "@/components/status/tones.module.scss";
import { AdminCard } from "@/components/admin/AdminPage";
import type { LogsResult } from "@/lib/admin/logs";
import styles from "./Logs.module.scss";

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

  const toggleLevel = (level: "error" | "warn") =>
    apply({ level: filters.level === level ? "all" : level });

  let lastDay = "";

  return (
    <Column fillWidth gap="20">
      <div className={styles.stats}>
        <button
          type="button"
          className={classNames(
            styles.stat,
            tones.danger,
            filters.level === "error" && styles.active,
          )}
          aria-pressed={filters.level === "error"}
          onClick={() => toggleLevel("error")}
        >
          <span className={styles.statDot} aria-hidden />
          <span className={styles.statValue}>{totalErrors}</span>
          <Text variant="label-default-m">{t("adminLogs.level.error")}</Text>
        </button>
        <button
          type="button"
          className={classNames(
            styles.stat,
            tones.warning,
            filters.level === "warn" && styles.active,
          )}
          aria-pressed={filters.level === "warn"}
          onClick={() => toggleLevel("warn")}
        >
          <span className={styles.statDot} aria-hidden />
          <span className={styles.statValue}>{totalWarnings}</span>
          <Text variant="label-default-m">{t("adminLogs.level.warn")}</Text>
        </button>
      </div>

      <Column gap="8">
        <Text variant="label-default-s" onBackground="neutral-weak">
          {t("adminLogs.containers")}
        </Text>
        <div className={styles.containers}>
          <ContainerButton
            active={!filters.container}
            name={t("adminLogs.filters.allContainers")}
            errors={totalErrors}
            warnings={totalWarnings}
            onClick={() => apply({ container: "" })}
          />
          {result.containers.map((container) => (
            <ContainerButton
              key={container.name}
              active={filters.container === container.name}
              name={container.name}
              errors={container.errors}
              warnings={container.warnings}
              onClick={() =>
                apply({ container: filters.container === container.name ? "" : container.name })
              }
            />
          ))}
        </div>
      </Column>

      <Row wrap gap="12" vertical="center">
        <form
          className={styles.search}
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

      {result.entries.length === 0 ? (
        <AdminCard>
          <Text variant="heading-strong-s">{t("adminLogs.empty.title")}</Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("adminLogs.empty.text")}
          </Text>
        </AdminCard>
      ) : (
        <div className={styles.console} role="log" aria-label={t("adminLogs.title")}>
          <div className={styles.consoleBar}>
            <span>
              {t("adminLogs.consoleCount", { shown: result.entries.length, total: result.total })}
            </span>
            <span>{live ? t("adminLogs.consoleLive") : ""}</span>
          </div>
          <div className={styles.consoleBody}>
            {result.entries.map((entry) => {
              const day = format.date(entry.ts, { dateStyle: "long" });
              const header = day !== lastDay;
              lastDay = day;
              const [first, ...rest] = entry.message.split("\n");

              return (
                <React.Fragment key={`${entry.container}:${entry.id}`}>
                  {header && <div className={styles.day}>{day}</div>}
                  <div
                    className={classNames(
                      styles.line,
                      entry.level === "error" ? styles.error : styles.warn,
                    )}
                  >
                    <span
                      className={styles.time}
                      title={format.dateTime(entry.ts, { dateStyle: "long", timeStyle: "medium" })}
                    >
                      {format.time(entry.ts, { timeStyle: "medium" })}
                    </span>
                    <span className={styles.level}>
                      {entry.level === "error" ? "ERROR" : "WARN"}
                    </span>
                    <span className={styles.source} title={entry.container}>
                      {entry.container}
                    </span>
                    <pre className={styles.message}>
                      {first}
                      {rest.map((line, index) => (
                        <span key={index} className={styles.trace}>
                          {line}
                        </span>
                      ))}
                    </pre>
                  </div>
                </React.Fragment>
              );
            })}
            {result.truncated && (
              <div className={styles.more}>
                {t("adminLogs.truncated", { shown: result.entries.length, total: result.total })}
              </div>
            )}
          </div>
        </div>
      )}
    </Column>
  );
}

function ContainerButton({
  active,
  name,
  errors,
  warnings,
  onClick,
}: {
  active: boolean;
  name: string;
  errors: number;
  warnings: number;
  onClick: () => void;
}) {
  const t = useT();

  return (
    <button
      type="button"
      className={classNames(styles.container, active && styles.active)}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className={styles.containerName}>{name}</span>
      <span className={styles.counts}>
        <span className={classNames(styles.count, errors > 0 && styles.hasErrors)}>
          {t("adminLogs.count.errors", { count: errors })}
        </span>
        <span className={classNames(styles.count, warnings > 0 && styles.hasWarnings)}>
          {t("adminLogs.count.warnings", { count: warnings })}
        </span>
      </span>
    </button>
  );
}
