"use client";

import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Avatar, Button, Column, Flex, Row, Text, Icon, Option, Line } from "@once-ui-system/core";
import { UserMenu } from "../user/UserMenu";
import { openDiscordOAuthPopup } from "@/lib/discord/popup-signin";

import styles from "./Header.module.scss";
import { AvatarWFrame } from "@/components/user/AvatarWFrame";

export function Header() {
  const pathname = usePathname();
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
      <Row vertical={"center"} horizontal={"center"} gap={"16"}>
        <Row padding={"2"} radius={"full"} border={"brand-medium"} borderWidth="2">
          <AvatarWFrame size={"xl"} src={"/images/avatar.jpg"} radius={"full"} />
        </Row>
        <Text variant={"heading-strong-xl"}>Amelia</Text>
      </Row>
      <Row></Row>
      <Row>
        {status === "authenticated" ? (
          <UserMenu
            name={session.user?.name || "User"}
            placement="bottom"
            avatarProps={{
              src: session.user?.image + "?size=64" || undefined,
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
                  hasPrefix={<Icon size="xs" onBackground="neutral-weak" name="gear" />}
                  href={"/dashboard"}
                  label="Dashboard"
                  value={"dashboard"}
                />
                <Option
                  fillWidth
                  hasPrefix={<Icon size="xs" onBackground="neutral-weak" name="logout" />}
                  onClick={() => signOut({ callbackUrl: "/" })}
                  label="Log out"
                  value={"logout"}
                />
              </Column>
            }
          />
        ) : (
          <Button prefixIcon={"discord"} onClick={handleLogin}>
            Login
          </Button>
        )}
      </Row>
    </Flex>
  );
}
