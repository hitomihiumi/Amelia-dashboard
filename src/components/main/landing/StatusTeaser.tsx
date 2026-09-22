import React from "react";
import Link from "next/link";
import { Icon, Row, Text } from "@once-ui-system/core";
import type { ServiceStatus } from "@/lib/status/status";

const HEADLINE: Record<ServiceStatus, string> = {
  operational: "All systems operational",
  degraded: "Some systems are degraded",
  down: "Major outage",
  maintenance: "Scheduled maintenance",
};

const COLOR: Record<ServiceStatus, string> = {
  operational: "var(--success-solid-strong)",
  degraded: "var(--warning-solid-strong)",
  down: "var(--danger-solid-strong)",
  maintenance: "var(--info-solid-strong)",
};

export function StatusTeaser({ status }: { status: ServiceStatus }) {
  return (
    <Link href="/status" style={{ textDecoration: "none" }}>
      <Row
        fillWidth
        horizontal="between"
        vertical="center"
        gap="12"
        padding="16"
        radius="l"
        border="neutral-medium"
        background="surface"
      >
        <Row gap="8" vertical="center">
          <span
            aria-hidden
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: COLOR[status],
            }}
          />
          <Text variant="body-default-m">{HEADLINE[status]}</Text>
        </Row>
        <Row gap="4" vertical="center">
          <Text variant="body-default-s" onBackground="neutral-weak">
            Status page
          </Text>
          <Icon name="chevronRight" size="xs" onBackground="neutral-weak" />
        </Row>
      </Row>
    </Link>
  );
}
