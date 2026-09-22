"use client";

import { Row, ToggleButton } from "@once-ui-system/core";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview", icon: "boxes" },
  { href: "/admin/news", label: "News", icon: "text" },
  { href: "/admin/incidents", label: "Incidents", icon: "warning" },
  { href: "/admin/config", label: "Global config", icon: "gear" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <Row gap="8" wrap>
      {LINKS.map((link) => (
        <ToggleButton
          key={link.href}
          href={link.href}
          prefixIcon={link.icon}
          selected={pathname === link.href}
        >
          {link.label}
        </ToggleButton>
      ))}
    </Row>
  );
}
