"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Avatar,
  Button,
  Column,
  Flex,
  Line,
  Row,
  Text,
  ToggleButton,
  NavIcon,
} from "@once-ui-system/core";
import { getGuildAccessForDashboard } from "@/lib/discord/guilds-api";
import styles from "./SettingsBar.module.scss";

interface SettingsBarProps {
  access: Awaited<ReturnType<typeof getGuildAccessForDashboard>>;
  guildId: string;
}

export const SettingsBar = ({ access, guildId }: SettingsBarProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <Flex hide m={{ hide: false }} fillWidth paddingY={"m"} paddingX={"l"}>
        <Flex
          fillWidth
          padding={"s"}
          vertical={"center"}
          gap={"12"}
          background={"surface"}
          border={"neutral-medium"}
          radius={"xl"}
        >
          <NavIcon onClick={() => setIsOpen(true)} />
          <Text variant="heading-strong-s" style={{ marginLeft: "12px" }}>
            {access.guildName}
          </Text>
        </Flex>
      </Flex>

      <Flex
        hide
        m={{ hide: false }}
        className={`${styles.overlay} ${isOpen ? styles.open : ""}`}
        onClick={() => setIsOpen(false)}
      />

      <Flex className={`${styles.sidebarWrapper} ${isOpen ? styles.open : ""}`}>
        <Flex
          direction="column"
          margin={"16"}
          gap="8"
          radius={"l"}
          border={"neutral-medium"}
          background="surface"
          className={styles.sidebarContent}
          style={{
            maxWidth: "20rem",
            width: "100%",
            maxHeight: "97vh",
          }}
          as={"aside"}
        >
          <Row gap={"12"} vertical={"center"} paddingX={"16"} paddingTop={"16"} paddingBottom={"4"}>
            <Avatar src={access.guildIconUrl || undefined} size={"l"} border={false} />
            <Column vertical={"between"} style={{ minWidth: 0 }}>
              <Text
                variant="heading-strong-s"
                style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {access.guildName}
              </Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {guildId}
              </Text>
            </Column>
          </Row>

          <Line />

          <Column gap={"32"} paddingX={"20"} fill as={"nav"} overflowY="auto">
            <Column gap={"8"}>
              <Text onBackground={"neutral-medium"} variant={"body-strong-m"}>
                Manage
              </Text>
              <ToggleButton
                size={"l"}
                prefixIcon={"boxes"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId)}
                href={"/dashboard/" + guildId}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  General settings
                </Text>
              </ToggleButton>
              <ToggleButton
                size={"l"}
                prefixIcon={"command"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/commands")}
                href={"/dashboard/" + guildId + "/commands"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  Commands
                </Text>
              </ToggleButton>
            </Column>

            <Column gap={"8"}>
              <Text onBackground={"neutral-medium"} variant={"body-strong-m"}>
                Engagement
              </Text>
              <ToggleButton
                size={"l"}
                prefixIcon={"money"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/economy")}
                href={"/dashboard/" + guildId + "/economy"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  Economy
                </Text>
              </ToggleButton>
              <ToggleButton
                size={"l"}
                prefixIcon={"cart"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/shop")}
                href={"/dashboard/" + guildId + "/shop"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  Shop
                </Text>
              </ToggleButton>
            </Column>

            <Column gap={"8"}>
              <Text onBackground={"neutral-medium"} variant={"body-strong-m"}>
                Utils
              </Text>
              <ToggleButton
                size={"l"}
                prefixIcon={"microphone"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/private")}
                href={"/dashboard/" + guildId + "/private"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  Private Rooms
                </Text>
              </ToggleButton>
            </Column>
          </Column>

          <Line />

          <Row
            gap={"12"}
            center
            paddingX={"16"}
            paddingTop={"4"}
            paddingBottom={"16"}
            style={{ flexShrink: 0 }}
          >
            <Button prefixIcon={"back"} fillWidth href={"/dashboard"}>
              Back to list
            </Button>
          </Row>
        </Flex>
      </Flex>
    </>
  );
};
