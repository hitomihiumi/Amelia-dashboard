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
import { useT } from "@/i18n/client";
import styles from "./SettingsBar.module.scss";

interface SettingsBarProps {
  access: Awaited<ReturnType<typeof getGuildAccessForDashboard>>;
  guildId: string;
}

export const SettingsBar = ({ access, guildId }: SettingsBarProps) => {
  const t = useT();
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
                {t("settings.nav.manage")}
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
                  {t("settings.nav.general")}
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
                  {t("settings.nav.commands")}
                </Text>
              </ToggleButton>
            </Column>

            <Column gap={"8"}>
              <Text onBackground={"neutral-medium"} variant={"body-strong-m"}>
                {t("settings.nav.moderation")}
              </Text>
              <ToggleButton
                size={"l"}
                prefixIcon={"security"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/moderation")}
                href={"/dashboard/" + guildId + "/moderation"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  {t("settings.nav.moderationSettings")}
                </Text>
              </ToggleButton>
              <ToggleButton
                size={"l"}
                prefixIcon={"clipboard"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/moderation/forms")}
                href={"/dashboard/" + guildId + "/moderation/forms"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  {t("settings.nav.moderationForms")}
                </Text>
              </ToggleButton>
              <ToggleButton
                size={"l"}
                prefixIcon={"mail"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/moderation/queue")}
                href={"/dashboard/" + guildId + "/moderation/queue"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  {t("settings.nav.moderationQueue")}
                </Text>
              </ToggleButton>
              <ToggleButton
                size={"l"}
                prefixIcon={"list"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/moderation/cases")}
                href={"/dashboard/" + guildId + "/moderation/cases"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  {t("settings.nav.moderationCases")}
                </Text>
              </ToggleButton>
              <ToggleButton
                size={"l"}
                prefixIcon={"documentattach"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/moderation/audit")}
                href={"/dashboard/" + guildId + "/moderation/audit"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  {t("settings.nav.moderationAudit")}
                </Text>
              </ToggleButton>
            </Column>

            <Column gap={"8"}>
              <Text onBackground={"neutral-medium"} variant={"body-strong-m"}>
                {t("settings.nav.engagement")}
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
                  {t("settings.nav.economy")}
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
                  {t("settings.nav.shop")}
                </Text>
              </ToggleButton>
              <ToggleButton
                size={"l"}
                prefixIcon={"ribbon"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/levels")}
                href={"/dashboard/" + guildId + "/levels"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  {t("settings.nav.leveling")}
                </Text>
              </ToggleButton>
            </Column>

            <Column gap={"8"}>
              <Text onBackground={"neutral-medium"} variant={"body-strong-m"}>
                {t("settings.nav.utils")}
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
                  {t("settings.nav.privateRooms")}
                </Text>
              </ToggleButton>
            </Column>

            <Column gap={"8"}>
              <Text onBackground={"neutral-medium"} variant={"body-strong-m"}>
                {t("settings.nav.interactions")}
              </Text>
              <ToggleButton
                size={"l"}
                prefixIcon={"target"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/components")}
                href={"/dashboard/" + guildId + "/components"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  {t("settings.nav.components")}
                </Text>
              </ToggleButton>
              <ToggleButton
                size={"l"}
                prefixIcon={"gitnet"}
                horizontal="start"
                fillWidth
                selected={pathname.endsWith("/dashboard/" + guildId + "/scenarios")}
                href={"/dashboard/" + guildId + "/scenarios"}
              >
                <Text onBackground={"neutral-medium"} variant={"body-default-m"}>
                  {t("settings.nav.scenarios")}
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
              {t("settings.nav.backToList")}
            </Button>
          </Row>
        </Flex>
      </Flex>
    </>
  );
};
