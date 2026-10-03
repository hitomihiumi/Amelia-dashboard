"use client";

import { Avatar, Column, Text } from "@once-ui-system/core";
import { getGuildAccessForDashboard } from "@/lib/discord/guilds-api";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import type { IconName } from "@/resources/icons";
import { AppSidebar, type SidebarGroup } from "@/components/layout/AppSidebar";
import styles from "@/components/layout/AppSidebar.module.scss";

interface SettingsBarProps {
  access: Awaited<ReturnType<typeof getGuildAccessForDashboard>>;
  guildId: string;
}

interface NavEntry {
  /** Path below /dashboard/{guildId}; empty for the overview. */
  path: string;
  icon: IconName;
  label: MessageKey;
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
  const base = `/dashboard/${guildId}`;

  const groups: SidebarGroup[] = NAV.map((group) => ({
    id: group.label,
    label: t(group.label),
    items: group.items.map((entry) => ({
      href: base + entry.path,
      icon: entry.icon,
      label: t(entry.label),
      exact: entry.exact,
    })),
  }));

  return (
    <AppSidebar
      mobileTitle={access.guildName ?? guildId}
      navLabel={access.guildName ?? guildId}
      groups={groups}
      footerLink={{ href: "/dashboard", icon: "navBack", label: t("settings.nav.backToList") }}
      header={
        <>
          <Avatar src={access.guildIconUrl || undefined} size={"l"} border={false} />
          <Column style={{ minWidth: 0 }} gap="2">
            <Text variant="heading-strong-s" className={styles.truncate}>
              {access.guildName}
            </Text>
            <Text variant="body-default-xs" onBackground="neutral-weak" className={styles.truncate}>
              {guildId}
            </Text>
          </Column>
        </>
      }
    />
  );
};
