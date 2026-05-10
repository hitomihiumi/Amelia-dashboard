import {Background, Banner, Column, Icon} from "@once-ui-system/core";
import { Header } from "@/components/main/Header";
import { Footer } from "@/components/main/Footer";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Column fill>
      <Background
        fill
        position={"absolute"}
        mask={{
          radius: 100,
          x: 100,
          y: 100,
        }}
        dots={{
          display: true,
          opacity: 100,
          size: "8",
          color: "brand-background-strong",
        }}
      />
      <Background
        fill
        position={"absolute"}
        mask={{
          radius: 100,
          x: 0,
          y: 100,
        }}
        dots={{
          display: true,
          opacity: 100,
          size: "8",
          color: "brand-background-strong",
        }}
      />
        <Banner solid="warning-medium" onSolid="warning-strong">
            <Icon name="warning" size="s" />
            Amelia is currently in early development. Expect bugs and breaking changes.
        </Banner>
      <Header />
      <Column fill>
          {children}
      </Column>
      <Footer />
    </Column>
  );
}
