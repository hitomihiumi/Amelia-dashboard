"use client";

import React, { forwardRef, ReactNode } from "react";

import { Flex, Text, Row, Icon } from "@once-ui-system/core";
import {
  isAnnouncementChannel,
  isCategoryChannel,
  isStageChannel,
  isVoiceLikeChannel,
  type ChannelPickOption,
} from "@/lib/discord/channel-type";
import { useSelectDisplay } from "@/components/user/selectDisplay";
import type { IconName } from "@/resources/icons";

interface ChannelPillProps extends React.ComponentProps<typeof Flex> {
  channel: ChannelPickOption;
  size?: "s" | "m" | "l";
  children?: ReactNode;
}

/** The icon Discord itself uses for each kind of channel. */
function channelIcon(type: number): IconName {
  if (isCategoryChannel(type)) return "folder";
  if (isStageChannel(type)) return "stage";
  if (isVoiceLikeChannel(type)) return "speaker";
  if (isAnnouncementChannel(type)) return "megaphone";
  return "hash";
}

const ChannelPill = forwardRef<HTMLDivElement, ChannelPillProps>(
  ({ channel, size = "m", className, children, ...rest }, ref) => {
    // Inside a select the row or chip is the badge; a second one would be noise.
    const plain = useSelectDisplay() === "plain";

    const paddingX = plain ? "0" : size === "s" ? "8" : size === "m" ? "8" : "12";
    const paddingY = plain ? "0" : size === "s" ? "1" : size === "m" ? "2" : "4";

    return (
      <Row
        fitWidth
        paddingX={paddingX}
        paddingY={paddingY}
        vertical="center"
        radius="s"
        gap="8"
        ref={ref}
        background={plain ? undefined : "neutral-alpha-medium"}
        style={{ minWidth: 0, maxWidth: "100%", userSelect: "none", border: "none" }}
        {...rest}
      >
        <Icon size="xs" name={channelIcon(channel.type)} onBackground="neutral-weak" />
        <Text
          variant="label-default-s"
          onBackground="neutral-strong"
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {channel.name || children}
        </Text>
      </Row>
    );
  },
);

ChannelPill.displayName = "ChannelPill";

export { ChannelPill };
export type { ChannelPillProps };
