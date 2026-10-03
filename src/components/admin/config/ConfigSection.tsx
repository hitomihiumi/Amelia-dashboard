"use client";

import React, { type ReactNode, useEffect, useState } from "react";
import { Column, Line, Row, Text } from "@once-ui-system/core";
import type { IconName } from "@/resources/icons";
import { useT } from "@/i18n/client";
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
    <section id={id} aria-labelledby={`${id}-title`} className={styles.section}>
      <AdminCard padding="20">
        <Row fillWidth gap="12" vertical="center" wrap>
          <IconTile name={icon} />
          <Column className={styles.grow} gap="2" style={{ minWidth: "11rem" }}>
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
    </section>
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
    <nav className={styles.index} aria-label={t("admin.config.index")}>
      <h2 className={styles.indexLabel}>{t("admin.config.index")}</h2>
      <ul className={styles.indexList}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className={styles.indexItem}
              aria-current={active === entry.id}
              onClick={() => jump(entry.id)}
            >
              <IndexIcon name={entry.icon} />
              <span className={styles.indexText}>{entry.label}</span>
              {dirty.has(entry.id) && (
                <span
                  className={styles.unsavedDot}
                  role="img"
                  aria-label={t("admin.config.unsavedSection")}
                  title={t("admin.config.unsavedSection")}
                />
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function IndexIcon({ name }: { name: IconName }) {
  return <IconTile name={name} size={24} />;
}
