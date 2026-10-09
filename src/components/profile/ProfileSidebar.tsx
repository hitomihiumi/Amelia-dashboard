"use client";

import { Column, Text } from "@once-ui-system/core";
import { AppSidebar, type SidebarGroup } from "@/components/layout/AppSidebar";
import styles from "@/components/layout/AppSidebar.module.scss";
import { AvatarWFrame } from "@/components/user/AvatarWFrame";
import { useT } from "@/i18n/client";

interface ProfileSidebarProps {
  name: string;
  username?: string;
  avatar?: string;
  frame?: string | null;
}

export function ProfileSidebar({ name, username, avatar, frame }: ProfileSidebarProps) {
  const t = useT();

  const groups: SidebarGroup[] = [
    {
      id: "profile",
      label: t("profile.nav.section"),
      items: [
        { href: "/profile", icon: "user", label: t("profile.nav.overview"), exact: true },
        { href: "/profile/appearance", icon: "palette", label: t("profile.nav.appearance") },
      ],
    },
  ];

  return (
    <AppSidebar
      mobileTitle={t("profile.nav.title")}
      navLabel={t("profile.nav.title")}
      groups={groups}
      footerLink={{ href: "/", icon: "navHome", label: t("profile.nav.backToSite") }}
      header={
        <>
          <AvatarWFrame size="l" src={avatar} frame={frame} empty={!avatar} />
          <Column style={{ minWidth: 0 }} gap="2">
            <Text variant="heading-strong-s" className={styles.truncate}>
              {name}
            </Text>
            {username && (
              <Text
                variant="body-default-xs"
                onBackground="neutral-weak"
                className={styles.truncate}
              >
                @{username}
              </Text>
            )}
          </Column>
        </>
      }
    />
  );
}
