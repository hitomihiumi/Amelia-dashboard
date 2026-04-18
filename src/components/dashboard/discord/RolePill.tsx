"use client";

import React, { forwardRef, ReactNode } from "react";

import { Flex, Text, Row } from "@once-ui-system/core";
import { discordRolePillStyle } from "@/lib/discord/role-style";

interface RolePillProps extends React.ComponentProps<typeof Flex> {
  roleColor: number;
  size?: "s" | "m" | "l";
  label?: string;
  children?: ReactNode;
}

const RolePill = forwardRef<HTMLDivElement, RolePillProps>(
  ({ roleColor, size = "m", label = "", className, children, ...rest }, ref) => {
    const paddingX = size === "s" ? "8" : size === "m" ? "8" : "12";
    const paddingY = size === "s" ? "1" : size === "m" ? "2" : "4";

    const { color, backgroundColor } = discordRolePillStyle(roleColor);

    return (
      <Row
        fitWidth
        paddingX={paddingX}
        paddingY={paddingY}
        vertical="center"
        radius="s"
        gap="4"
        ref={ref}
        style={{
          whiteSpace: "nowrap",
          userSelect: "none",
          border: "none",
          backgroundColor,
        }}
        {...rest}
      >
        <Row style={{ userSelect: "none" }} vertical="center">
          <Text variant="label-default-s" style={{ color }}>
            {label || children}
          </Text>
        </Row>
      </Row>
    );
  },
);

RolePill.displayName = "RolePill";

export { RolePill };
export type { RolePillProps };
