"use client";

import { Column, Flex, Line, RevealFx, Row, Text } from "@once-ui-system/core";
import React from "react";
import { DashIcon } from "@/components/dashboard/DashIcon";
import { IconName } from "@/resources/icons";

export interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  num: number;
  icon?: IconName;
  switcher?: React.ReactNode;
  /** Take the whole row inside a `SectionGrid`. */
  span?: "full";
}

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  children,
  num,
  icon,
  switcher,
  span,
}) => {
  return (
    <RevealFx
      delay={Math.min(300 * num, 900)}
      translateY={-0.5}
      fillWidth
      className={span === "full" ? "section-full" : undefined}
      style={{ minWidth: 0 }}
    >
      <Flex
        direction="column"
        fillWidth
        gap="16"
        padding="24"
        radius="l"
        border="neutral-medium"
        background="surface"
      >
        <Flex gap="16" style={{ minWidth: 0 }}>
          {icon && <DashIcon name={icon} />}
          {/* Wraps: a long description next to the switch drops the switch below instead of squeezing the text. */}
          <Row horizontal="between" vertical="center" fillWidth wrap gap="12" style={{ minWidth: 0 }}>
            <Column gap="8" style={{ flex: "1 1 220px", minWidth: 0 }}>
              <Text variant="body-strong-l">{title}</Text>
              {description && (
                <Text variant="body-default-s" onBackground="neutral-medium">
                  {description}
                </Text>
              )}
            </Column>
            {switcher && <Flex style={{ flexShrink: 0 }}>{switcher}</Flex>}
          </Row>
        </Flex>
        <Line />
        {children}
      </Flex>
    </RevealFx>
  );
};
