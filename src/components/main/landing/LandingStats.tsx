"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Flex, Grid, Icon, Text } from "@once-ui-system/core";
import type { StatusSnapshot } from "@/lib/status/status";
import type { IconName } from "@/resources/icons";
import { useFormat, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

export interface LandingStat {
  icon: IconName;
  value: string;
  label: MessageKey;
}

export function LandingStats({ initialSnapshot }: { initialSnapshot: StatusSnapshot }) {
  const t = useT();
  const format = useFormat();
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  /** Cards mirroring the live snapshot; uptime stays "24/7" while the bot is up. */
  const stats: LandingStat[] = [
    {
      icon: "boxes",
      value: format.number(snapshot.metrics.guilds),
      label: "site.landing.stats.servers",
    },
    {
      icon: "user",
      value: format.number(snapshot.metrics.members),
      label: "site.landing.stats.members",
    },
    {
      icon: "command",
      value: format.number(snapshot.metrics.commands),
      label: "site.landing.stats.commands",
    },
    {
      icon: "target",
      value:
        snapshot.overall === "operational"
          ? t("site.landing.stats.alwaysOn")
          : t(`site.status.state.${snapshot.overall}`),
      label: "site.landing.stats.botStatus",
    },
  ];

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) return;

      setSnapshot((await res.json()) as StatusSnapshot);
    } catch {
      // The numbers stay as rendered on the server.
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <Grid columns={4} m={{ columns: 2 }} s={{ columns: 2 }} gap="16" fillWidth>
      {stats.map((stat) => (
        <Flex
          key={stat.label}
          direction="column"
          fillWidth
          center
          gap="8"
          padding="24"
          radius="l"
          border="neutral-medium"
          background="surface"
        >
          <Icon name={stat.icon} size="m" onBackground="brand-medium" />
          <Text variant="display-strong-xs">{stat.value}</Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t(stat.label)}
          </Text>
        </Flex>
      ))}
    </Grid>
  );
}
