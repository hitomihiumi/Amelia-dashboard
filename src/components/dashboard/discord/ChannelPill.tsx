"use client";

import React, { forwardRef, ReactNode } from "react";

import { Flex, Text, Row, Icon } from "@once-ui-system/core";
import {
  isCategoryChannel,
  isVoiceLikeChannel,
  type ChannelPickOption,
} from "@/lib/discord/channel-type";

interface ChannelPillProps extends React.ComponentProps<typeof Flex> {
  channel: ChannelPickOption;
  size?: "s" | "m" | "l";
  children?: ReactNode;
}

const ChannelPill = forwardRef<HTMLDivElement, ChannelPillProps>(
  ({ channel, size = "m", className, children, ...rest }, ref) => {
    const paddingX = size === "s" ? "8" : size === "m" ? "8" : "12";
    const paddingY = size === "s" ? "1" : size === "m" ? "2" : "4";

    const isCategory = isCategoryChannel(channel.type);
    const isVoice = isVoiceLikeChannel(channel.type);

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
          whiteSpace: "nowrap",
          userSelect: "none",
          border: "none",
          backgroundColor: "rgba(63, 63, 70, 0.35)",
        }}
        {...rest}
      >
        <Icon
            size={'xs'}
          name={isCategory ? "folder" : isVoice ? "microphone" : "mail"}
          style={{ color: "rgb(244 244 245)" }}
        />
        <Row style={{ userSelect: "none" }} vertical="center">
          <Text variant="label-default-s" style={{ color: "rgb(244 244 245)" }}>
            {channel.name || children}
          </Text>
        </Row>
      </Row>
    );
  },
);

ChannelPill.displayName = "ChannelPill";

export { ChannelPill };
export type { ChannelPillProps };
