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
}

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  children,
  num,
  icon,
  switcher,
}) => {
  return (
    <RevealFx delay={0.3 * num} translateY={-0.5}>
      <Flex
        direction="column"
        fillWidth
        gap="16"
        padding="24"
        radius="l"
        border="neutral-medium"
        background="surface"
      >
        <Flex gap="16">
          {icon && <DashIcon name={icon} />}
          <Row horizontal="between" vertical="center" fillWidth>
            <Column gap="8">
              <Text variant="body-strong-l">{title}</Text>
              {description && (
                <Text variant="body-default-s" onBackground="neutral-medium">
                  {description}
                </Text>
              )}
            </Column>
            {switcher && <Flex>{switcher}</Flex>}
          </Row>
        </Flex>
        <Line />
        {children}
      </Flex>
    </RevealFx>
  );
};
