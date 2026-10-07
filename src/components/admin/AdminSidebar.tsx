"use client";

import { Column, Flex, Icon, Text } from "@once-ui-system/core";
import { useT } from "@/i18n/client";
import { AppSidebar, type SidebarGroup } from "@/components/layout/AppSidebar";
import styles from "@/components/layout/AppSidebar.module.scss";

interface AdminSidebarProps {
  adminName: string;
  /** Live counters shown next to the entries that need attention. */
  counts: { drafts: number; openIncidents: number };
}

export function AdminSidebar({ adminName, counts }: AdminSidebarProps) {
  const t = useT();

  const groups: SidebarGroup[] = [
    {
      id: "overview",
      label: t("admin.nav.overview"),
      items: [{ href: "/admin", icon: "navOverview", label: t("admin.nav.overview"), exact: true }],
    },
    {
      id: "content",
      label: t("admin.nav.content"),
      items: [
        { href: "/admin/news", icon: "navNews", label: t("admin.nav.news"), badge: counts.drafts },
        {
          href: "/admin/incidents",
          icon: "navIncidents",
          label: t("admin.nav.incidents"),
          badge: counts.openIncidents,
        },
      ],
    },
    {
      id: "site",
      label: t("admin.nav.site"),
      items: [
        { href: "/admin/config", icon: "navSiteSettings", label: t("admin.nav.siteSettings") },
        { href: "/admin/ai", icon: "navAi", label: t("admin.nav.ai") },
        { href: "/admin/logs", icon: "navLogs", label: t("admin.nav.logs") },
      ],
    },
  ];

  return (
    <AppSidebar
      mobileTitle={t("admin.nav.panelTitle")}
      navLabel={t("admin.nav.panelTitle")}
      groups={groups}
      footerLink={{ href: "/", icon: "navHome", label: t("admin.nav.backToSite") }}
      header={
        <>
          <Flex
            center
            radius="m"
            background="brand-alpha-weak"
            border="brand-alpha-medium"
            style={{ width: 44, height: 44, flexShrink: 0 }}
          >
            <Icon name="navAdminPanel" size="m" onBackground="brand-strong" />
          </Flex>
          <Column style={{ minWidth: 0 }} gap="2">
            <Text variant="heading-strong-s" className={styles.truncate}>
              {t("admin.nav.panelTitle")}
            </Text>
            <Text variant="body-default-xs" onBackground="neutral-weak" className={styles.truncate}>
              {adminName}
            </Text>
          </Column>
        </>
      }
    />
  );
}
