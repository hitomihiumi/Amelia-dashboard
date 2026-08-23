"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Flex, Grid, Icon, Text } from "@once-ui-system/core";
import type { StatusSnapshot } from "@/lib/status/status";

export interface LandingStat {
  icon: string;
  value: string;
  label: string;
}

function format(value: number): string {
  return value.toLocaleString("en-US");
}

/** Cards mirroring the live snapshot; uptime stays "24/7" while the bot is up. */
function toStats(snapshot: StatusSnapshot): LandingStat[] {
  return [
    { icon: "boxes", value: format(snapshot.metrics.guilds), label: "servers" },
    { icon: "user", value: format(snapshot.metrics.members), label: "members" },
    { icon: "command", value: format(snapshot.metrics.commands), label: "commands" },
    {
      icon: "target",
      value: snapshot.overall === "operational" ? "24/7" : snapshot.overall,
      label: "bot status",
    },
  ];
}

export function LandingStats({ initialSnapshot }: { initialSnapshot: StatusSnapshot }) {
  const [stats, setStats] = useState(() => toStats(initialSnapshot));

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) return;

      setStats(toStats((await res.json()) as StatusSnapshot));
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
            {stat.label}
          </Text>
        </Flex>
      ))}
    </Grid>
  );
}
