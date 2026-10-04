import React, { type ReactNode } from "react";
import { Card, Column, Flex, Icon, Line, Row, StatusIndicator, Tag, Text } from "@once-ui-system/core";
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

export const TONE_COLOR = {
  success: "green",
  warning: "orange",
  danger: "red",
  info: "blue",
  neutral: "gray",
} as const;

export function StatusDot({ tone }: { tone: Tone }) {
  return <StatusIndicator aria-hidden ariaLabel="" size="m" color={TONE_COLOR[tone]} />;
}

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <Tag scheme={tone} size="m" radius="full">
      <Text variant="label-strong-s">{children}</Text>
    </Tag>
  );
}

/** A clickable row inside a panel: incident, draft, post. */
export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Card
      href={href}
      fillWidth
      radius="m"
      background="transparent"
      border="transparent"
      paddingX="12"
      paddingY="8"
      gap="12"
      vertical="center"
      minHeight={2.75}
      className={styles.row}
    >
      {children}
    </Card>
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
        <Column flex={1} gap="2" style={{ minWidth: "11rem" }}>
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
