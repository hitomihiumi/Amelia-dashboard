import React from "react";
import { notFound } from "next/navigation";
import { Column, Flex, Line, Row, Text } from "@once-ui-system/core";
import { Header } from "@/components/main/Header";
import { Footer } from "@/components/main/Footer";
import { getSiteAdmin } from "@/lib/admin/access";
import { AdminNav } from "@/components/admin/AdminNav";
import { getT } from "@/i18n/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The panel is invisible to everyone else — a 404, not a 403.
  const admin = await getSiteAdmin();
  if (!admin) notFound();

  const t = await getT();

  return (
    <Column fill>
      <Header />
      <Flex fillWidth horizontal="center" paddingY="32" paddingX="16">
        <Column maxWidth="l" fillWidth gap="24">
          <Column gap="4">
            <Text variant="display-strong-xs">{t("admin.layout.title")}</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("admin.layout.signedInAs", { name: admin.name })}
            </Text>
          </Column>

          <AdminNav />
          <Line />

          <Row fillWidth>{children}</Row>
        </Column>
      </Flex>
      <Footer />
    </Column>
  );
}
