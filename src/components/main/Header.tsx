"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button, Column, Flex, Icon, Line, Option, Row, SmartLink, Text } from "@once-ui-system/core";
import classNames from "classnames";
import { UserMenu } from "../user/UserMenu";
import { openDiscordOAuthPopup } from "@/lib/discord/popup-signin";
import { AvatarWFrame } from "@/components/user/AvatarWFrame";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import styles from "./Header.module.scss";

const NAV: { href: string; match: string; label: MessageKey }[] = [
  { href: "/docs/get-started", match: "/docs", label: "common.nav.docs" },
  { href: "/news", match: "/news", label: "common.nav.news" },
  { href: "/status", match: "/status", label: "common.nav.status" },
];

export function Header() {
  const pathname = usePathname();
  const t = useT();
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated";

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // The bar gains a border and shadow once the page moves under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Navigating, pressing Escape or clicking outside closes the phone menu.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenuOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  const handleLogin = () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    if (isMobile) {
      signIn("discord", { callbackUrl: "/dashboard" });
    } else {
      openDiscordOAuthPopup({ next: "/dashboard" });
    }
  };

  const isActive = (match: string) => pathname === match || pathname.startsWith(`${match}/`);

  return (
    <Column
      as="header"
      ref={rootRef}
      position="sticky"
      top="0"
      zIndex={9}
      fillWidth
      horizontal="center"
      paddingTop="12"
      paddingX="16"
      pointerEvents="none" // only the bar itself catches clicks
      s={{ paddingTop: "8", paddingX: "8" }}
    >
      <Row
        fillWidth
        maxWidth={72}
        vertical="center"
        horizontal="between"
        gap="24"
        paddingY="8"
        paddingLeft="16"
        paddingRight="12"
        radius="xl"
        border={scrolled ? "neutral-alpha-medium" : "neutral-alpha-weak"}
        pointerEvents="auto"
        s={{ gap: "12", paddingLeft: "12", paddingRight: "8" }}
        className={classNames(styles.bar, scrolled && styles.scrolled)}
      >
        <SmartLink unstyled href="/" aria-label="Amelia" className={styles.brand}>
          <Row padding="2" border="brand-alpha-medium" borderWidth={2} radius="full" className={styles.logo}>
            <AvatarWFrame size="l" src="/images/avatar.jpg" radius="full" />
          </Row>
          <Text variant="heading-strong-l" className={styles.brandName}>
            Amelia
          </Text>
        </SmartLink>

        <Row as="nav" aria-label="Primary" flex="1" vertical="center" gap="4" s={{ hide: true }}>
          {NAV.map((item) => (
            <SmartLink
              unstyled
              key={item.match}
              href={item.href}
              aria-current={isActive(item.match) ? "page" : undefined}
              className={classNames(styles.link, isActive(item.match) && styles.active)}
            >
              {t(item.label)}
            </SmartLink>
          ))}
        </Row>

        <Row vertical="center" gap="8">
          <Row s={{ hide: true }}>
            <LanguageSwitcher />
          </Row>

          {authenticated ? (
            <>
              <Row s={{ hide: true }}>
                <Button href="/dashboard" variant="secondary" size="m" prefixIcon="navGeneral">
                  {t("common.nav.dashboard")}
                </Button>
              </Row>
              <UserMenu
                name={session.user?.name || t("common.nav.user")}
                placement="bottom-end"
                avatarProps={{
                  // A missing avatar or decoration is null; "null?size=128" would not be a URL.
                  src: session.user?.image ? `${session.user.image}?size=128` : undefined,
                  frame: session.user?.avatarDecoration
                    ? `${session.user.avatarDecoration}?size=64`
                    : undefined,
                  radius: "full",
                  size: "l",
                }}
                dropdown={
                  <Column gap="4" padding="4" minWidth={12}>
                    <Column horizontal={"center"} paddingY="8">
                      <Text variant="body-strong-s">{session.user?.name}</Text>
                      <Text onBackground="neutral-weak" variant="body-default-xs">
                        Discord
                      </Text>
                    </Column>
                    <Line />
                    <Option
                      fillWidth
                      prefix={<Icon size="xs" onBackground="neutral-weak" name="navGeneral" />}
                      href={"/dashboard"}
                      label={t("common.nav.dashboard")}
                      value={"dashboard"}
                    />
                    <Option
                      fillWidth
                      prefix={<Icon size="xs" onBackground="neutral-weak" name="user" />}
                      href={"/profile"}
                      label={t("common.nav.profile")}
                      value={"profile"}
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
                      danger
                      prefix={<Icon size="xs" onBackground="neutral-weak" name="logout" />}
                      onClick={() => signOut({ callbackUrl: "/" })}
                      label={t("common.nav.logout")}
                      value={"logout"}
                    />
                  </Column>
                }
              />
            </>
          ) : (
            <Row s={{ hide: true }}>
              <Button prefixIcon={"discord"} onClick={handleLogin}>
                {t("common.nav.login")}
              </Button>
            </Row>
          )}

          <Column
            as="button"
            {...{ type: "button" }}
            hide
            s={{ hide: false }}
            vertical="center"
            gap={0.3125}
            width={2.5}
            height={2.5}
            paddingX={0.625}
            radius="m"
            cursor="interactive"
            className={classNames(styles.burger, menuOpen && styles.burgerOpen)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={t("common.nav.menu")}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Flex as="span" className={styles.burgerBar} />
            <Flex as="span" className={styles.burgerBar} />
            <Flex as="span" className={styles.burgerBar} />
          </Column>
        </Row>
      </Row>

      {menuOpen && (
        <Column
          id="mobile-menu"
          fillWidth
          maxWidth={72}
          marginTop="8"
          padding="12"
          gap="12"
          radius="xl"
          border="neutral-alpha-medium"
          pointerEvents="auto"
          hide
          s={{ hide: false }}
          className={styles.panel}
        >
          <Column as="nav" aria-label="Primary" gap="2">
            {NAV.map((item) => (
              <SmartLink
                unstyled
                key={item.match}
                href={item.href}
                aria-current={isActive(item.match) ? "page" : undefined}
                className={classNames(styles.panelLink, isActive(item.match) && styles.active)}
              >
                {t(item.label)}
              </SmartLink>
            ))}
          </Column>

          <Column gap="8" paddingTop="12" borderTop="neutral-alpha-weak">
            {authenticated ? (
              <>
                <Button href="/dashboard" variant="secondary" fillWidth prefixIcon="navGeneral">
                  {t("common.nav.dashboard")}
                </Button>
                <Button href="/profile" variant="secondary" fillWidth prefixIcon="user">
                  {t("common.nav.profile")}
                </Button>
              </>
            ) : (
              <Button prefixIcon={"discord"} onClick={handleLogin} fillWidth>
                {t("common.nav.login")}
              </Button>
            )}
            <LanguageSwitcher />
          </Column>
        </Column>
      )}
    </Column>
  );
}
