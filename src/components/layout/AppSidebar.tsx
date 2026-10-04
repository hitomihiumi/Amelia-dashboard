"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Column,
  Flex,
  Icon,
  NavIcon,
  Row,
  SmartLink,
  Text,
} from "@once-ui-system/core";
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
export function AppSidebar({
  header,
  mobileTitle,
  navLabel,
  groups,
  footerLink,
}: AppSidebarProps) {
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
      <Row
        className={styles.mobileBar}
        fillWidth
        paddingX="16"
        paddingTop="16"
        paddingBottom="8"
      >
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
            truncate
            style={{ marginLeft: "12px", flex: 1, minWidth: 0 }}
          >
            {mobileTitle}
          </Text>
          <LanguageSwitcher />
        </Flex>
      </Row>

      <Flex
        className={classNames(styles.overlay, isOpen && styles.open)}
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        zIndex={7}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <Flex
        className={classNames(styles.sidebarWrapper, isOpen && styles.open)}
        position="sticky"
        top="0"
        padding="16"
        zIndex={8}
      >
        <Flex
          direction="column"
          radius={"l"}
          border={"neutral-medium"}
          background="surface"
          className={styles.sidebarContent}
          as={"aside"}
          fillHeight
          minHeight={0}
          overflow="hidden"
        >
          <Row
            gap={"12"}
            vertical={"center"}
            paddingX="16"
            paddingTop="16"
            paddingBottom="12"
            borderBottom="neutral-alpha-weak"
            style={{ flexShrink: 0 }}
          >
            {header}
          </Row>

          <Column
            as="nav"
            flex="1"
            minHeight={0}
            overflowY="auto"
            paddingX="12"
            paddingTop="12"
            paddingBottom="16"
            gap="20"
            className={styles.nav}
            aria-label={navLabel}
          >
            {groups.map((group) => (
              <Column gap="4" key={group.id}>
                <Text
                  as="p"
                  family="label"
                  weight="strong"
                  onBackground="neutral-weak"
                  paddingX="12"
                  className={styles.groupLabel}
                >
                  {group.label}
                </Text>
                <Column as="ul" gap="2" margin="0" padding="0">
                  {group.items.map((item) => {
                    const active = isActive(item);

                    return (
                      <Flex as="li" key={item.href} fillWidth>
                        <SmartLink
                          unstyled
                          fillWidth
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={classNames(
                            styles.item,
                            active && styles.active,
                          )}
                        >
                          <Icon
                            name={item.icon}
                            size="s"
                            className={styles.itemIcon}
                          />
                          <Text
                            truncate
                            variant={
                              active ? "body-strong-s" : "body-default-s"
                            }
                          >
                            {item.label}
                          </Text>
                          {item.badge !== null &&
                            item.badge !== undefined &&
                            item.badge !== 0 && (
                              <Row
                                horizontal="center"
                                radius="full"
                                paddingX={0.375}
                                minWidth={1.25}
                                height={1.25}
                                background={
                                  active ? undefined : "neutral-alpha-medium"
                                }
                                solid={active ? "brand-strong" : undefined}
                                className={styles.badge}
                              >
                                <Text
                                  variant="label-strong-xs"
                                  onBackground={
                                    active ? undefined : "neutral-strong"
                                  }
                                  onSolid={active ? "brand-strong" : undefined}
                                >
                                  {item.badge}
                                </Text>
                              </Row>
                            )}
                        </SmartLink>
                      </Flex>
                    );
                  })}
                </Column>
              </Column>
            ))}
          </Column>

          <Row
            vertical="center"
            gap="8"
            padding="12"
            borderTop="neutral-alpha-weak"
            m={{ direction: "column", horizontal: "stretch" }}
            style={{ flexShrink: 0 }}
          >
            <SmartLink
              unstyled
              fillWidth
              href={footerLink.href}
              className={styles.back}
            >
              <Icon name={footerLink.icon} size="s" />
              <Text truncate variant="body-default-s">
                {footerLink.label}
              </Text>
            </SmartLink>
            <LanguageSwitcher />
          </Row>
        </Flex>
      </Flex>
    </>
  );
}
