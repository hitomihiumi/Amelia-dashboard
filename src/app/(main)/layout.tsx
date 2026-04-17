import { Background, Column } from "@once-ui-system/core";
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
      <Header />
      {children}
      <Footer />
    </Column>
  );
}
