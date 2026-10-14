import { Background, Column } from "@once-ui-system/core";
import { Header } from "@/components/main/Header";
import { Footer } from "@/components/main/Footer";
import { PRIVATE_METADATA } from "@/lib/seo/metadata";
import type { Metadata } from "next";

// Only meant for signed in people: kept out of search results.
export const metadata: Metadata = { ...PRIVATE_METADATA, title: "Dashboard – Amelia" };

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Column fill>
      {children}
      <Footer />
    </Column>
  );
}
