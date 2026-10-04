import React from "react";
import { Icon, Row, SmartLink, StatusIndicator, Text } from "@once-ui-system/core";
import type { ServiceStatus } from "@/lib/status/status";
import { getT } from "@/i18n/server";

const STATUS_COLOR: Record<ServiceStatus, "green" | "yellow" | "red" | "blue"> = {
  operational: "green",
  degraded: "yellow",
  down: "red",
  maintenance: "blue",
};

export async function StatusTeaser({ status }: { status: ServiceStatus }) {
  const t = await getT();

  return (
    <SmartLink href="/status" unstyled fillWidth>
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
          <StatusIndicator size="s" color={STATUS_COLOR[status]} aria-hidden />
          <Text variant="body-default-m">{t(`site.status.headline.${status}`)}</Text>
        </Row>
        <Row gap="4" vertical="center">
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("site.landing.statusTeaser.statusPage")}
          </Text>
          <Icon name="chevronRight" size="xs" onBackground="neutral-weak" />
        </Row>
      </Row>
    </SmartLink>
  );
}
