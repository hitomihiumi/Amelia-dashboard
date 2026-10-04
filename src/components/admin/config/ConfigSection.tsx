"use client";

import React, { type ReactNode, useEffect, useState } from "react";
import { Column, Line, Row, Text, ToggleButton } from "@once-ui-system/core";
import type { IconName } from "@/resources/icons";
import { useT } from "@/i18n/client";
import { Eyebrow } from "@/components/admin/Eyebrow";
import { PlainItem, PlainList } from "@/components/admin/PlainList";
import { AdminCard } from "@/components/admin/AdminPage";
import { IconTile } from "@/components/admin/overview/primitives";
import type { SectionId } from "./form";
import styles from "./Config.module.scss";

export function ConfigSection({
  id,
  icon,
  title,
  description,
  aside,
  children,
}: {
  id: SectionId;
  icon: IconName;
  title: string;
  description: string;
  /** Control shown at the right of the header, e.g. the on/off switch. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Column as="section" id={id} aria-labelledby={`${id}-title`} fillWidth className={styles.section}>
      <AdminCard padding="20" fillHeight>
        <Row fillWidth gap="12" vertical="center" wrap>
          <IconTile name={icon} />
          <Column flex={1} gap="2" style={{ minWidth: "11rem" }}>
            <Text variant="body-strong-l" as="h2" id={`${id}-title`}>
              {title}
            </Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {description}
            </Text>
          </Column>
          {aside}
        </Row>
        <Line />
        {children}
      </AdminCard>
    </Column>
  );
}

export interface IndexEntry {
  id: SectionId;
  icon: IconName;
  label: string;
}

/** Sticky list of the sections: jumps to one, follows the scroll, flags unsaved sections. */
export function SectionIndex({ entries, dirty }: { entries: IndexEntry[]; dirty: Set<SectionId> }) {
  const t = useT();
  const [active, setActive] = useState<SectionId>(entries[0].id);

  useEffect(() => {
    const elements = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((element): element is HTMLElement => element !== null);

    // The section crossing the upper third of the viewport is the current one.
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id as SectionId);
      },
      { rootMargin: "-10% 0px -60% 0px" },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [entries]);

  const jump = (id: SectionId) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Column
      as="nav"
      position="sticky"
      top="24"
      width={13.5}
      gap="8"
      aria-label={t("admin.config.index")}
      className={styles.index}
    >
      <Eyebrow as="h2" paddingX="12">
        {t("admin.config.index")}
      </Eyebrow>
      <PlainList gap="2">
        {entries.map((entry) => (
          <PlainItem key={entry.id}>
            <ToggleButton
              type="button"
              fillWidth
              horizontal="start"
              size="l"
              radius="m"
              selected={active === entry.id}
              weight={active === entry.id ? "strong" : "default"}
              aria-current={active === entry.id}
              className={styles.indexItem}
              onClick={() => jump(entry.id)}
            >
              <Row fillWidth vertical="center" gap="12">
                <IndexIcon name={entry.icon} />
                <Text variant="body-default-s" truncate style={{ flex: 1, textAlign: "left" }}>
                  {entry.label}
                </Text>
                {dirty.has(entry.id) && (
                  <Row
                    width={0.5}
                    height={0.5}
                    radius="full"
                    solid="warning-strong"
                    role="img"
                    aria-label={t("admin.config.unsavedSection")}
                    title={t("admin.config.unsavedSection")}
                  />
                )}
              </Row>
            </ToggleButton>
          </PlainItem>
        ))}
      </PlainList>
    </Column>
  );
}

function IndexIcon({ name }: { name: IconName }) {
  return <IconTile name={name} size={24} />;
}
