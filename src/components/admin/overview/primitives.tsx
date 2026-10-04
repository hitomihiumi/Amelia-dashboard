import React, { type ReactNode } from "react";
import { Column, Flex, Icon, Line, Row, Text } from "@once-ui-system/core";
import type { IconName } from "@/resources/icons";
import type { Tone } from "@/lib/admin/defaults";
import { AdminCard } from "@/components/admin/AdminPage";
import styles from "./Overview.module.scss";

/** Brand-tinted square that holds an icon, same recipe as the sidebar header. */
export function IconTile({
  name,
  size = 36,
  tone,
}: {
  name: IconName;
  size?: number;
  tone?: Exclude<Tone, "neutral">;
}) {
  const scheme = tone ?? "brand";

  return (
    <Flex
      center
      radius="m"
      background={`${scheme}-alpha-weak`}
      border={`${scheme}-alpha-medium`}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <Icon name={name} size="s" onBackground={`${scheme}-strong`} />
    </Flex>
  );
}

export function StatusDot({ tone }: { tone: Tone }) {
  return <span aria-hidden className={styles.dot} data-tone={tone} />;
}

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={styles.pill} data-tone={tone}>
      {children}
    </span>
  );
}

/** Titled card used for every block of the overview. */
export function Panel({
  icon,
  title,
  description,
  aside,
  children,
}: {
  icon: IconName;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AdminCard padding="20">
      <Row fillWidth gap="12" vertical="center" wrap>
        <IconTile name={icon} />
        <Column className={styles.grow} gap="2" style={{ minWidth: "11rem" }}>
          <Text variant="body-strong-l" as="h2">
            {title}
          </Text>
          {description && (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {description}
            </Text>
          )}
        </Column>
        {aside}
      </Row>
      <Line />
      {children}
    </AdminCard>
  );
}
