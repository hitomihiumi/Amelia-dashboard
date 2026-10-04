"use client";

import React, { forwardRef, ReactNode } from "react";

import { Flex, Text, Row } from "@once-ui-system/core";
import { discordRolePillStyle } from "@/lib/discord/role-style";
import { useSelectDisplay } from "@/components/user/selectDisplay";

interface RolePillProps extends React.ComponentProps<typeof Flex> {
  roleColor: number;
  size?: "s" | "m" | "l";
  label?: string;
  children?: ReactNode;
}

const RolePill = forwardRef<HTMLDivElement, RolePillProps>(
  ({ roleColor, size = "m", label = "", className, children, ...rest }, ref) => {
    // Inside a select the row or chip is the badge; a second one would be noise.
    const plain = useSelectDisplay() === "plain";

    const paddingX = plain ? "0" : size === "s" ? "8" : size === "m" ? "8" : "12";
    const paddingY = plain ? "0" : size === "s" ? "1" : size === "m" ? "2" : "4";

    const { color, backgroundColor, dotColor, dotOutline } = discordRolePillStyle(roleColor);

    return (
      <Row
        fitWidth
        paddingX={paddingX}
        paddingY={paddingY}
        vertical="center"
        radius="s"
        gap="8"
        ref={ref}
        style={{
          minWidth: 0,
          maxWidth: "100%",
          userSelect: "none",
          border: "none",
          backgroundColor: plain ? undefined : backgroundColor,
        }}
        {...rest}
      >
        {/* The real role colour. Dark colours get an outline so they stay visible. */}
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            width: "0.625rem",
            height: "0.625rem",
            borderRadius: "50%",
            backgroundColor: dotColor ?? "transparent",
            boxShadow: dotOutline ? "inset 0 0 0 1.5px rgba(244, 244, 245, 0.45)" : undefined,
          }}
        />
        <Text
          variant="label-default-s"
          style={{ color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {label || children}
        </Text>
      </Row>
    );
  },
);

RolePill.displayName = "RolePill";

export { RolePill };
export type { RolePillProps };
