"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Column, Flex, Grid, Icon, Line, Row, Text } from "@once-ui-system/core";
import type { ServiceStatus, StatusSnapshot } from "@/lib/status/status";

const STATUS_COLOR: Record<ServiceStatus, string> = {
  operational: "var(--success-solid-strong)",
  degraded: "var(--warning-solid-strong)",
  down: "var(--danger-solid-strong)",
  maintenance: "var(--info-solid-strong)",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
  maintenance: "Maintenance",
};

const HEADLINE: Record<ServiceStatus, string> = {
  operational: "All systems operational",
  degraded: "Some systems are degraded",
  down: "Major outage",
  maintenance: "Scheduled maintenance",
};

const HEADLINE_ICON: Record<ServiceStatus, string> = {
  operational: "check",
  degraded: "warning",
  down: "danger",
  maintenance: "gear",
};

/** "just now", "2 min ago" — the freshness line under the headline. */
function relativeTime(iso: string | null): string {
  if (!iso) return "never";

  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

export function StatusView({
  initialSnapshot,
  uptimeLabel,
}: {
  initialSnapshot: StatusSnapshot;
  uptimeLabel: string;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [uptime, setUptime] = useState(uptimeLabel);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) return;

      const next = (await res.json()) as StatusSnapshot;
      setSnapshot(next);
      setUptime(formatUptime(next.metrics.uptimeMs));
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

  return (
    <Column fillWidth gap="32" key={tick}>
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
          {HEADLINE[overall]}
        </Text>
        <Text variant="body-default-m" onBackground="neutral-weak" align="center">
          Last updated: {relativeTime(snapshot.checkedAt)}
        </Text>
      </Flex>

      <Grid columns={3} m={{ columns: 3 }} s={{ columns: 1 }} gap="16" fillWidth>
        <MetricCard
          icon="target"
          label="Shard ping"
          value={snapshot.metrics.ping === null ? "—" : `${snapshot.metrics.ping} ms`}
          description="Average WebSocket latency to the Discord gateway"
        />
        <MetricCard
          icon="play"
          label="Bot uptime"
          value={uptime}
          description="Time since the bot process last restarted"
        />
        <MetricCard
          icon="boxes"
          label="Shards"
          value={`${snapshot.metrics.shards.ready}/${snapshot.metrics.shards.total || 1}`}
          description="Discord gateway processes reporting in"
        />
      </Grid>

      <Column fillWidth gap="12">
        <Text variant="heading-strong-m">Services</Text>
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
                  <Text variant="body-default-m">{service.label}</Text>
                  {service.note && (
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {service.note}
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
                    {STATUS_LABEL[service.status]}
                  </Text>
                </Row>
              </Row>
            </React.Fragment>
          ))}
        </Flex>
      </Column>
    </Column>
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
}: {
  icon: string;
  label: string;
  value: string;
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
        <Text variant="label-default-s" onBackground="neutral-weak">
          {label.toUpperCase()}
        </Text>
      </Row>
      <Text variant="display-strong-xs">{value}</Text>
      <Text variant="body-default-xs" onBackground="neutral-weak">
        {description}
      </Text>
    </Flex>
  );
}

/** Mirror of `formatUptime` on the server, used after a client refresh. */
function formatUptime(uptimeMs: number | null): string {
  if (!uptimeMs || uptimeMs < 0) return "—";

  const minutes = Math.floor(uptimeMs / 60_000) % 60;
  const hours = Math.floor(uptimeMs / 3_600_000) % 24;
  const days = Math.floor(uptimeMs / 86_400_000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
