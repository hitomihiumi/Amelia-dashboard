"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, Column, Flex, Icon, NavIcon, Row, Text } from "@once-ui-system/core";
import classNames from "classnames";
import { getGuildAccessForDashboard } from "@/lib/discord/guilds-api";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import type { IconName } from "@/resources/icons";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import styles from "./SettingsBar.module.scss";

interface SettingsBarProps {
  access: Awaited<ReturnType<typeof getGuildAccessForDashboard>>;
  guildId: string;
}

interface NavEntry {
  /** Path below /dashboard/{guildId}; empty for the overview. */
  path: string;
  icon: IconName;
  label: MessageKey;
  /**
   * Highlight only on this exact path. Everything else also stays highlighted on its
   * sub-pages, e.g. a scenario being edited keeps "Scenarios" active.
   */
  exact?: boolean;
}

interface NavGroup {
  label: MessageKey;
  items: NavEntry[];
}

const NAV: NavGroup[] = [
  {
    label: "settings.nav.manage",
    items: [
      { path: "", icon: "navGeneral", label: "settings.nav.general", exact: true },
      { path: "/commands", icon: "navCommands", label: "settings.nav.commands" },
    ],
  },
  {
    label: "settings.nav.moderation",
    items: [
      {
        path: "/moderation",
        icon: "navModeration",
        label: "settings.nav.moderationSettings",
        exact: true,
      },
      { path: "/moderation/forms", icon: "navForms", label: "settings.nav.moderationForms" },
      { path: "/moderation/queue", icon: "navQueue", label: "settings.nav.moderationQueue" },
      { path: "/moderation/cases", icon: "navCases", label: "settings.nav.moderationCases" },
      { path: "/moderation/audit", icon: "navAudit", label: "settings.nav.moderationAudit" },
    ],
  },
  {
    label: "settings.nav.engagement",
    items: [
      { path: "/economy", icon: "navEconomy", label: "settings.nav.economy" },
      { path: "/shop", icon: "navShop", label: "settings.nav.shop" },
      { path: "/levels", icon: "navLevels", label: "settings.nav.leveling" },
    ],
  },
  {
    label: "settings.nav.utils",
    items: [{ path: "/private", icon: "navPrivate", label: "settings.nav.privateRooms" }],
  },
  {
    label: "settings.nav.interactions",
    items: [
      { path: "/components", icon: "navComponents", label: "settings.nav.components" },
      { path: "/scenarios", icon: "navScenarios", label: "settings.nav.scenarios" },
    ],
  },
];

export const SettingsBar = ({ access, guildId }: SettingsBarProps) => {
  const t = useT();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const base = `/dashboard/${guildId}`;

  const isActive = (entry: NavEntry) => {
    const href = base + entry.path;
    return entry.exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
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
          <Text
            variant="heading-strong-s"
            style={{
              marginLeft: "12px",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {access.guildName}
          </Text>
          <LanguageSwitcher />
        </Flex>
      </Flex>

      <Flex
        hide
        m={{ hide: false }}
        className={classNames(styles.overlay, isOpen && styles.open)}
        onClick={() => setIsOpen(false)}
      />

      <Flex className={classNames(styles.sidebarWrapper, isOpen && styles.open)}>
        <Flex
          direction="column"
          radius={"l"}
          border={"neutral-medium"}
          background="surface"
          className={styles.sidebarContent}
          as={"aside"}
        >
          <Row gap={"12"} vertical={"center"} className={styles.guild}>
            <Avatar src={access.guildIconUrl || undefined} size={"l"} border={false} />
            <Column style={{ minWidth: 0 }} gap="2">
              <Text variant="heading-strong-s" className={styles.truncate}>
                {access.guildName}
              </Text>
              <Text variant="body-default-xs" onBackground="neutral-weak" className={styles.truncate}>
                {guildId}
              </Text>
            </Column>
          </Row>

          <nav className={styles.nav} aria-label={access.guildName ?? undefined}>
            {NAV.map((group) => (
              <div className={styles.group} key={group.label}>
                <p className={classNames(styles.groupLabel, "font-label", "font-strong")}>
                  {t(group.label)}
                </p>
                <ul className={styles.list}>
                  {group.items.map((entry) => {
                    const active = isActive(entry);

                    return (
                      <li key={entry.path}>
                        <Link
                          href={base + entry.path}
                          aria-current={active ? "page" : undefined}
                          className={classNames(
                            styles.item,
                            active && styles.active,
                            "font-body",
                            "font-default",
                          )}
                        >
                          <Icon name={entry.icon} size="s" className={styles.itemIcon} />
                          <span className={styles.itemLabel}>{t(entry.label)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className={styles.footer}>
            <Link href="/dashboard" className={classNames(styles.back, "font-body", "font-default")}>
              <Icon name="navBack" size="s" />
              <span className={styles.itemLabel}>{t("settings.nav.backToList")}</span>
            </Link>
            <LanguageSwitcher />
          </div>
        </Flex>
      </Flex>
    </>
  );
};
