"use client";

import React, { useCallback, useEffect, useState } from "react";
import {Column, Flex, Grid, Icon, Line, Row, Text, RevealFx, CountFx} from "@once-ui-system/core";
import type { ServiceStatus, StatusSnapshot } from "@/lib/status/status";
import type { IconName } from "@/resources/icons";
import { useFormat, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

const STATUS_COLOR: Record<ServiceStatus, string> = {
  operational: "var(--success-solid-strong)",
  degraded: "var(--warning-solid-strong)",
  down: "var(--danger-solid-strong)",
  maintenance: "var(--info-solid-strong)",
};

const HEADLINE_ICON: Record<ServiceStatus, IconName> = {
  operational: "check",
  degraded: "warning",
  down: "danger",
  maintenance: "gear",
};

const SERVICE_LABEL_KEYS: Record<string, MessageKey> = {
  gateway: "site.status.services.gateway",
  database: "site.status.services.database",
  website: "site.status.services.website",
  shards: "site.status.services.shards",
};

export function StatusView({
  initialSnapshot,
}: {
  initialSnapshot: StatusSnapshot;
}) {
  const t = useT();
  const format = useFormat();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [uptimeMs, setUptimeMs] = useState(snapshot.metrics.uptimeMs);
  const [ping , setPing] = useState(snapshot.metrics.ping);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) return;

      const next = (await res.json()) as StatusSnapshot;
      setSnapshot(next);
      setUptimeMs(next.metrics.uptimeMs);
      setPing(next.metrics.ping);
    } catch {
      // A failed poll is not worth showing; the next one is 30 seconds away.
    }
  }, []);

  useEffect(() => {
    const poll = setInterval(refresh, 30_000);
    // Re-render once a minute so "last updated" keeps counting up.
    const clock = setInterval(() => setTick((value) => value + 1), 60_000);

    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [refresh]);

  const overall = snapshot.overall;

  /** "just now", "2 minutes ago" — the freshness line under the headline. */
  const relativeTime = (iso: string | null): string => {
    if (!iso) return t("site.status.never");

    const elapsed = Date.now() - new Date(iso).getTime();
    if (elapsed < 60_000) return t("site.status.justNow");
    return format.relative(iso);
  };

  const unit = {
    day: t("site.status.units.day"),
    hour: t("site.status.units.hour"),
    minute: t("site.status.units.minute"),
  };

  return (
    <Column fillWidth gap="32">
      <RevealFx translateY={-0.5}>
        <Flex
          direction="column"
          fillWidth
          center
          gap="16"
          padding="40"
          radius="l"
          border="neutral-medium"
          background="surface"
        >
          <Flex
            center
            padding="16"
            radius="l"
            border="neutral-medium"
            style={{ color: STATUS_COLOR[overall] }}
          >
            <Icon name={HEADLINE_ICON[overall]} size="l" />
          </Flex>
          <Text variant="display-strong-xs" align="center">
            {t(`site.status.headline.${overall}`)}
          </Text>
          <Text variant="body-default-m" onBackground="neutral-weak" align="center">
            {t("site.status.lastUpdated", { time: relativeTime(snapshot.checkedAt) })}
          </Text>
        </Flex>
      </RevealFx>

      <RevealFx delay={300} translateY={-0.5}>
        <Grid columns={3} m={{ columns: 3 }} s={{ columns: 1 }} gap="16" fillWidth key={tick}>
          <MetricCard
            icon="target"
            label={t("site.status.metrics.ping.label")}
            value={ping === null ? "—" : (
                  <CountFx
                      variant="display-strong-xs"
                      value={ping}
                      speed={5000}
                      effect="wheel"
                      easing="ease-out"
                      children={` ${t("site.status.units.ms")}`}
                  />
            )}
            description={t("site.status.metrics.ping.description")}
          />
          <MetricCard
            icon="play"
            label={t("site.status.metrics.uptime.label")}
            value={formatUptime(uptimeMs, unit)}
            description={t("site.status.metrics.uptime.description")}
          />
          <MetricCard
            icon="boxes"
            label={t("site.status.metrics.shards.label")}
            value={
              <Text variant="display-strong-xs">
                {snapshot.metrics.shards.ready}/{snapshot.metrics.shards.total || 1}
              </Text>
            }
            description={t("site.status.metrics.shards.description")}
          />
        </Grid>
      </RevealFx>

      <RevealFx delay={600} translateY={-0.5}>
        <Column fillWidth gap="12">
          <Text variant="heading-strong-m">{t("site.status.servicesTitle")}</Text>
          <Flex
            direction="column"
            fillWidth
            radius="l"
            border="neutral-medium"
            background="surface"
            overflow="hidden"
          >
            {snapshot.services.map((service, index) => (
              <React.Fragment key={service.key}>
                {index > 0 && <Line />}
                <Row fillWidth horizontal="between" vertical="center" padding="16" gap="12">
                  <Column gap="2">
                    <Text variant="body-default-m">
                      {SERVICE_LABEL_KEYS[service.key]
                        ? t(SERVICE_LABEL_KEYS[service.key])
                        : service.label}
                    </Text>
                    {(service.note || (service.key === "shards" && snapshot.metrics.shards.total > 0)) && (
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        {service.note ??
                          t("site.status.shardsReady", {
                            ready: snapshot.metrics.shards.ready,
                            total: snapshot.metrics.shards.total,
                          })}
                      </Text>
                    )}
                  </Column>
                  <Row gap="8" vertical="center">
                    <span
                      aria-hidden
                      style={{
                        width: "0.5rem",
                        height: "0.5rem",
                        borderRadius: "50%",
                        background: STATUS_COLOR[service.status],
                      }}
                    />
                    <Text variant="body-default-s" onBackground="neutral-medium">
                      {t(`site.status.state.${service.status}`)}
                    </Text>
                  </Row>
                </Row>
              </React.Fragment>
            ))}
          </Flex>
        </Column>
      </RevealFx>
    </Column>
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
}: {
  icon: IconName;
  label: string;
  value: React.ReactNode;
  description: string;
}) {
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
      <Row gap="8" vertical="center">
        <Icon name={icon} size="s" onBackground="brand-medium" />
        <Text
          variant="label-default-s"
          onBackground="neutral-weak"
          style={{ textTransform: "uppercase" }}
        >
          {label}
        </Text>
      </Row>
      {value}
      <Text variant="body-default-xs" onBackground="neutral-weak">
        {description}
      </Text>
    </Flex>
  );
}

/** Mirror of `formatUptime` on the server, used after a client refresh. */
function formatUptime(
  uptimeMs: number | null,
  unit: { day: string; hour: string; minute: string },
): React.ReactNode {
  if (!uptimeMs || uptimeMs < 0) return "—";

  const minutes = Math.floor(uptimeMs / 60_000) % 60;
  const hours = Math.floor(uptimeMs / 3_600_000) % 24;
  const days = Math.floor(uptimeMs / 86_400_000);

  if (days > 0) return <Row gap="8" vertical="end">
    <CountFx
        variant="display-strong-xs"
        value={days}
        speed={5000}
        effect="wheel"
        easing="ease-out"
        children={unit.day}
    />
    <CountFx
        variant="display-strong-xs"
        value={hours}
        speed={5000}
        effect="wheel"
        easing="ease-out"
        children={unit.hour}
    />
  </Row>;
  if (hours > 0) return <Row gap="8" vertical="end">
    <CountFx
        variant="display-strong-xs"
        value={hours}
        speed={5000}
        effect="wheel"
        easing="ease-out"
        children={unit.hour}
    />
    <CountFx
        variant="display-strong-xs"
        value={minutes}
        speed={5000}
        effect="wheel"
        easing="ease-out"
        children={unit.minute}
    />
  </Row>;
  return <CountFx variant="display-strong-xs" value={minutes} speed={5000} effect="wheel" easing="ease-out" children={unit.minute} />;
}
