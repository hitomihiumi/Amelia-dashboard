"use client";

import {
  Button,
  Column,
  Flex,
  Line,
  Row,
  Tag,
  Text,
  Animation,
  Skeleton,
} from "@once-ui-system/core";
import { AvatarWFrame } from "@/components/user/AvatarWFrame";

import styles from "./GuildCard.module.scss";

interface GuildCardProps {
  name: string;
  id: string;
  hasBot: boolean;
  icon: string | null;
  inviteURL: string | null;
}

export const GuildCard: React.FC<GuildCardProps> = ({ name, id, icon, hasBot, inviteURL }) => {
  return (
    <Flex
      padding={"24"}
      background={"surface"}
      radius={"l"}
      direction={"column"}
      gap={"16"}
      fillWidth
      style={{
        maxWidth: "30rem",
      }}
      border={"neutral-strong"}
      className={styles.card}
    >
      <Row gap={"12"}>
        <AvatarWFrame src={icon || undefined} size={"xl"} radius={"full"} />
        <Column vertical={"between"}>
          <Text variant={"heading-strong-xs"}>{name}</Text>
          <Tag size={"s"} scheme={hasBot ? "brand" : "neutral"}>
            {hasBot ? "Bot on the Guild" : "Bot not Invited"}
          </Tag>
        </Column>
      </Row>
      <Line />
      {hasBot ? (
        <Button fillWidth prefixIcon={"gear"} href={`/dashboard/${id}`}>
          Manage
        </Button>
      ) : (
        <Button
          fillWidth
          prefixIcon={"plus"}
          variant={"secondary"}
          target={"_blank"}
          href={inviteURL || ""}
        >
          Invite Amelia
        </Button>
      )}
    </Flex>
  );
};

export const SkeletonGuildCard = ({}) => {
  return (
    <Flex
      padding={"24"}
      background={"surface"}
      radius={"l"}
      direction={"column"}
      gap={"16"}
      fillWidth
      style={{
        maxWidth: "30rem",
      }}
      border={"neutral-strong"}
    >
      <Row gap={"12"}>
        <Skeleton
          shape="circle"
          size="l"
          style={{
            minWidth: "var(--static-space-56)",
            minHeight: "var(--static-space-56)",
            maxWidth: "var(--static-space-56)",
            maxHeight: "var(--static-space-56)",
          }}
        />
        <Column vertical={"between"} fillWidth>
          <Skeleton shape="line" size="s" width="50%" />
          <Skeleton shape="line" size="s" width="25%" delay={100} />
        </Column>
      </Row>
      <Line />
      <Skeleton shape="line" size="l" fillWidth delay={200} />
    </Flex>
  );
};
