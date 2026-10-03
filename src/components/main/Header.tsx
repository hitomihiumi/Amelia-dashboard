"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button, Column, Icon, Line, Option, Text } from "@once-ui-system/core";
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
  const rootRef = useRef<HTMLElement>(null);

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
    <header ref={rootRef} className={styles.header}>
      <div className={classNames(styles.bar, scrolled && styles.scrolled)}>
        <Link href="/" className={styles.brand} aria-label="Amelia">
          <span className={styles.logo}>
            <AvatarWFrame size="l" src="/images/avatar.jpg" radius="full" />
          </span>
          <Text variant="heading-strong-l" className={styles.brandName}>
            Amelia
          </Text>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.match}
              href={item.href}
              aria-current={isActive(item.match) ? "page" : undefined}
              className={classNames(styles.link, isActive(item.match) && styles.active)}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <div className={styles.desktopOnly}>
            <LanguageSwitcher />
          </div>

          {authenticated ? (
            <>
              <div className={styles.desktopOnly}>
                <Button href="/dashboard" variant="secondary" size="m" prefixIcon="navGeneral">
                  {t("common.nav.dashboard")}
                </Button>
              </div>
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
            <div className={styles.desktopOnly}>
              <Button prefixIcon={"discord"} onClick={handleLogin}>
                {t("common.nav.login")}
              </Button>
            </div>
          )}

          <button
            type="button"
            className={classNames(styles.burger, menuOpen && styles.burgerOpen)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={t("common.nav.menu")}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className={styles.panel}>
          <nav className={styles.panelNav} aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.match}
                href={item.href}
                aria-current={isActive(item.match) ? "page" : undefined}
                className={classNames(styles.panelLink, isActive(item.match) && styles.active)}
              >
                {t(item.label)}
              </Link>
            ))}
          </nav>

          <div className={styles.panelActions}>
            {authenticated ? (
              <Button href="/dashboard" variant="secondary" fillWidth prefixIcon="navGeneral">
                {t("common.nav.dashboard")}
              </Button>
            ) : (
              <Button prefixIcon={"discord"} onClick={handleLogin} fillWidth>
                {t("common.nav.login")}
              </Button>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
