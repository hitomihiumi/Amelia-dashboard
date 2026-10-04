import React from "react";
import { Card, Column, Icon, Text } from "@once-ui-system/core";
import type { IconName } from "@/resources/icons";
import { getT } from "@/i18n/server";
import { PlainItem, PlainList } from "@/components/admin/PlainList";
import { IconTile, Panel } from "./primitives";
import styles from "./Overview.module.scss";

export async function QuickActions() {
  const t = await getT();

  const actions: {
    href: string;
    icon: IconName;
    tone?: "warning";
    title: string;
    hint: string;
  }[] = [
    {
      href: "/admin/news/new",
      icon: "plus",
      title: t("admin.overview.actions.newPost"),
      hint: t("admin.overview.actions.newPostHint"),
    },
    {
      href: "/admin/incidents/new",
      icon: "warning",
      tone: "warning",
      title: t("admin.overview.actions.reportIncident"),
      hint: t("admin.overview.actions.reportIncidentHint"),
    },
    {
      href: "/admin/config",
      icon: "settings",
      title: t("admin.overview.actions.siteSettings"),
      hint: t("admin.overview.actions.siteSettingsHint"),
    },
  ];

  return (
    <Panel icon="bolt" title={t("admin.overview.actions.title")}>
      <PlainList gap="8">
        {actions.map((action) => (
          <PlainItem key={action.href}>
            <Card
              href={action.href}
              fillWidth
              vertical="center"
              gap="12"
              padding="12"
              radius="l"
              background="neutral-alpha-weak"
              border="neutral-alpha-medium"
              className={styles.action}
            >
              <IconTile name={action.icon} tone={action.tone} />
              <Column flex={1} gap="2">
                <Text variant="body-strong-s">{action.title}</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  {action.hint}
                </Text>
              </Column>
              <Icon name="chevronRight" size="xs" className={styles.chevron} />
            </Card>
          </PlainItem>
        ))}
      </PlainList>
    </Panel>
  );
}
