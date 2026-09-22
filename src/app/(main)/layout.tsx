import { Background, Banner, Column, Icon } from "@once-ui-system/core";
import { Header } from "@/components/main/Header";
import { Footer } from "@/components/main/Footer";
import { getGlobalConfig } from "@/lib/admin/config";

const BANNER_SOLID: Record<string, { solid: string; onSolid: string }> = {
  info: { solid: "info-medium", onSolid: "info-strong" },
  warning: { solid: "warning-medium", onSolid: "warning-strong" },
  danger: { solid: "danger-medium", onSolid: "danger-strong" },
  success: { solid: "success-medium", onSolid: "success-strong" },
};

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The banner is editable in the admin panel instead of being hardcoded here.
  const config = await getGlobalConfig();
  const banner = BANNER_SOLID[config.bannerVariant] ?? BANNER_SOLID.warning;
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
      {config.bannerEnabled && config.bannerText && (
        <Banner solid={banner.solid as never} onSolid={banner.onSolid as never}>
          <Icon name={config.bannerVariant === "success" ? "check" : "warning"} size="s" />
          {config.bannerText}
        </Banner>
      )}
      <Header />
      <Column fill>{children}</Column>
      <Footer />
    </Column>
  );
}
