"use client";

import { Row, ToggleButton } from "@once-ui-system/core";
import { usePathname } from "next/navigation";
import type { IconName } from "@/resources/icons";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

const LINKS: { href: string; label: MessageKey; icon: IconName }[] = [
  { href: "/admin", label: "admin.nav.overview", icon: "boxes" },
  { href: "/admin/news", label: "admin.nav.news", icon: "text" },
  { href: "/admin/incidents", label: "admin.nav.incidents", icon: "warning" },
  { href: "/admin/config", label: "admin.nav.config", icon: "gear" },
];

export function AdminNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <Row gap="8" wrap>
      {LINKS.map((link) => (
        <ToggleButton
          key={link.href}
          href={link.href}
          prefixIcon={link.icon}
          selected={pathname === link.href}
        >
          {t(link.label)}
        </ToggleButton>
      ))}
    </Row>
  );
}
