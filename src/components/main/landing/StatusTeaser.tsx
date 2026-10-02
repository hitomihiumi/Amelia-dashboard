import React from "react";
import Link from "next/link";
import { Icon, Row, Text } from "@once-ui-system/core";
import type { ServiceStatus } from "@/lib/status/status";
import { getT } from "@/i18n/server";

const COLOR: Record<ServiceStatus, string> = {
  operational: "var(--success-solid-strong)",
  degraded: "var(--warning-solid-strong)",
  down: "var(--danger-solid-strong)",
  maintenance: "var(--info-solid-strong)",
};

export async function StatusTeaser({ status }: { status: ServiceStatus }) {
  const t = await getT();

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
          <Text variant="body-default-m">{t(`site.status.headline.${status}`)}</Text>
        </Row>
        <Row gap="4" vertical="center">
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("site.landing.statusTeaser.statusPage")}
          </Text>
          <Icon name="chevronRight" size="xs" onBackground="neutral-weak" />
        </Row>
      </Row>
    </Link>
  );
}
