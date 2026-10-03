"use client";

import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  Avatar,
  Button,
  Column,
  Flex,
  Row,
  Text,
  Icon,
  Option,
  Line,
  SmartLink,
} from "@once-ui-system/core";
import { UserMenu } from "../user/UserMenu";
import { openDiscordOAuthPopup } from "@/lib/discord/popup-signin";

import styles from "./Header.module.scss";
import { AvatarWFrame } from "@/components/user/AvatarWFrame";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useT } from "@/i18n/client";

export function Header() {
  const pathname = usePathname();
  const t = useT();
  const { data: session, status } = useSession();

  const handleLogin = () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    if (isMobile) {
      signIn("discord", { callbackUrl: "/dashboard" });
    } else {
      openDiscordOAuthPopup({ next: "/dashboard" });
    }
  };

  return (
    <Flex
      fitHeight
      position={"sticky"}
      as={"header"}
      zIndex={9}
      fillWidth
      paddingY={"20"}
      vertical={"center"}
      top={0}
      background={"overlay"}
      horizontal={"between"}
      className={styles.header}
    >
      <Row vertical={"center"} horizontal={"center"} gap={"16"} fillHeight>
        <Row padding={"2"} radius={"full"} border={"brand-medium"} borderWidth="2">
          <AvatarWFrame size={"l"} src={"/images/avatar.jpg"} radius={"full"} />
        </Row>
        <Text variant={"heading-strong-xl"}>
          <SmartLink href={"/"}>Amelia</SmartLink>
        </Text>
        <Line vert={true} />
        <Row marginBottom={"2"} gap={"16"}>
          <Text variant={"label-default-l"}>
            <SmartLink href={"/docs/get-started"}>{t("common.nav.docs")}</SmartLink>
          </Text>
          <Text variant={"label-default-l"}>
            <SmartLink href={"/news"}>{t("common.nav.news")}</SmartLink>
          </Text>
          <Text variant={"label-default-l"}>
            <SmartLink href={"/status"}>{t("common.nav.status")}</SmartLink>
          </Text>
        </Row>
      </Row>
      <Row gap="8" vertical="center">
        <LanguageSwitcher />
        {status === "authenticated" ? (
          <UserMenu
            name={session.user?.name || t("common.nav.user")}
            placement="bottom"
            avatarProps={{
              src: session.user?.image + "?size=128" || undefined,
              frame: session.user?.avatarDecoration + "?size=64" || undefined,
              radius: "full",
              size: "l",
            }}
            dropdown={
              <Column gap="4" padding="4" minWidth={10}>
                <Column horizontal={"center"}>
                  <Text variant="body-default-s">{session.user?.name}</Text>
                  <Text onBackground="neutral-weak" variant="body-default-xs">
                    Discord
                  </Text>
                </Column>
                <Line />
                <Option
                  fillWidth
                  prefix={<Icon size="xs" onBackground="neutral-weak" name="gear" />}
                  href={"/dashboard"}
                  label={t("common.nav.dashboard")}
                  value={"dashboard"}
                />
                {session.user?.isAdmin && (
                  <Option
                    fillWidth
                    prefix={<Icon size="xs" onBackground="neutral-weak" name="navAdminPanel" />}
                    href={"/admin"}
                    label={t("common.nav.admin")}
                    value={"admin"}
                  />
                )}
                <Option
                  fillWidth
                  prefix={<Icon size="xs" onBackground="neutral-weak" name="logout" />}
                  onClick={() => signOut({ callbackUrl: "/" })}
                  label={t("common.nav.logout")}
                  value={"logout"}
                />
              </Column>
            }
          />
        ) : (
          <Button prefixIcon={"discord"} onClick={handleLogin}>
            {t("common.nav.login")}
          </Button>
        )}
      </Row>
    </Flex>
  );
}
