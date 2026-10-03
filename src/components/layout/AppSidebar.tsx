"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flex, Icon, NavIcon, Row, Text } from "@once-ui-system/core";
import classNames from "classnames";
import type { IconName } from "@/resources/icons";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import styles from "./AppSidebar.module.scss";

export interface SidebarItem {
  href: string;
  icon: IconName;
  label: string;
  /**
   * Highlight only on this exact path. Everything else also stays highlighted on its
   * sub-pages, e.g. a scenario being edited keeps "Scenarios" active.
   */
  exact?: boolean;
  /** Small counter on the right, e.g. the number of open incidents. */
  badge?: number | string | null;
}

export interface SidebarGroup {
  id: string;
  label: string;
  items: SidebarItem[];
}

interface AppSidebarProps {
  /** The card at the top: server name, signed in user, ... */
  header: ReactNode;
  /** Title shown in the top bar that opens the drawer on small screens. */
  mobileTitle: string;
  navLabel: string;
  groups: SidebarGroup[];
  footerLink: { href: string; label: string; icon: IconName };
}

/**
 * Sticky, full height navigation card used by the server dashboard and the admin panel.
 * Only the list scrolls, so the footer is never pushed off screen; on small screens it
 * turns into an off-canvas drawer.
 */
export function AppSidebar({ header, mobileTitle, navLabel, groups, footerLink }: AppSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (item: SidebarItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
            {mobileTitle}
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
            {header}
          </Row>

          <nav className={styles.nav} aria-label={navLabel}>
            {groups.map((group) => (
              <div className={styles.group} key={group.id}>
                <p className={classNames(styles.groupLabel, "font-label", "font-strong")}>
                  {group.label}
                </p>
                <ul className={styles.list}>
                  {group.items.map((item) => {
                    const active = isActive(item);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={classNames(
                            styles.item,
                            active && styles.active,
                            "font-body",
                            "font-default",
                          )}
                        >
                          <Icon name={item.icon} size="s" className={styles.itemIcon} />
                          <span className={styles.itemLabel}>{item.label}</span>
                          {item.badge !== null && item.badge !== undefined && item.badge !== 0 && (
                            <span className={styles.badge}>{item.badge}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className={styles.footer}>
            <Link
              href={footerLink.href}
              className={classNames(styles.back, "font-body", "font-default")}
            >
              <Icon name={footerLink.icon} size="s" />
              <span className={styles.itemLabel}>{footerLink.label}</span>
            </Link>
            <LanguageSwitcher />
          </div>
        </Flex>
      </Flex>
    </>
  );
}
