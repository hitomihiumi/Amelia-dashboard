import { Sidebar } from "@/components/docs";

import { Column, Flex, Row } from "@once-ui-system/core";
import { Header } from "@/components/docs/Header";
import { Footer } from "@/components/main/Footer";
import { layout } from "@/resources";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Column fill>
      <Header />
      <Flex fillWidth horizontal="center" flex={1}>
        <Flex horizontal="center" maxWidth={layout.body.width} minHeight="0">
          <Row fillWidth gap="24">
            <Sidebar
              style={{ minHeight: "100vh" }}
              m={{ hide: true }}
              borderRight="neutral-alpha-medium"
            />
            <Row fillWidth horizontal="center" padding={"l"}>
              {children}
            </Row>
          </Row>
        </Flex>
      </Flex>
      <Footer />
    </Column>
  );
}
