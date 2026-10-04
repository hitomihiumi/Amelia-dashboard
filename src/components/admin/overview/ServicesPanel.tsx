import React from "react";
import { Column, Row, Text } from "@once-ui-system/core";
import type { StatusSnapshot } from "@/lib/status/status";
import { STATUS_TONE } from "@/lib/admin/defaults";
import { getFormatters, getT } from "@/i18n/server";
import { PlainItem, PlainList } from "@/components/admin/PlainList";
import { Panel, StatusDot, StatusPill } from "./primitives";

/** Every service with its state, note and the time of the last check. */
export async function ServicesPanel({ snapshot }: { snapshot: StatusSnapshot }) {
  const t = await getT();
  const { relative } = await getFormatters();
  const { shards } = snapshot.metrics;

  return (
    <Panel
      icon="radialGauge"
      title={t("admin.overview.services.title")}
      description={t("admin.overview.services.description")}
      aside={
        <Text variant="label-default-s" onBackground="neutral-weak" align="right">
          {t("admin.overview.services.checked", { time: relative(snapshot.checkedAt) })}
        </Text>
      }
    >
      <PlainList gap="4">
        {snapshot.services.map((service) => {
          const tone = STATUS_TONE[service.status];
          // The shard counter comes from the metrics so it can be translated.
          const note =
            service.note ??
            (service.key === "shards"
              ? shards.total === 0
                ? t("admin.overview.services.shardsNone")
                : t("admin.overview.services.shardsReady", {
                    ready: shards.ready,
                    total: shards.total,
                  })
              : null);

          return (
            <PlainItem
              key={service.key}
              vertical="center"
              gap="12"
              paddingX="12"
              paddingY="8"
              radius="m"
              background="neutral-alpha-weak"
              minHeight={2.75}
            >
              <StatusDot tone={tone} />
              <Column flex={1} gap="2">
                <Text variant="body-strong-s">{t(`admin.components.${service.key}`)}</Text>
                {note && (
                  <Text variant="body-default-xs" onBackground="neutral-weak" truncate>
                    {note}
                  </Text>
                )}
              </Column>
              <Row>
                <StatusPill tone={tone}>{t(`admin.serviceStatus.${service.status}`)}</StatusPill>
              </Row>
            </PlainItem>
          );
        })}
      </PlainList>
    </Panel>
  );
}
