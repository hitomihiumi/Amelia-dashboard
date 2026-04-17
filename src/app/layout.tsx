import "@once-ui-system/core/css/styles.css";
import "@once-ui-system/core/css/tokens.css";
import "@/resources/custom.css";

import classNames from "classnames";

import { fonts, style, dataStyle } from "@/resources/once-ui.config";
import { Column, Flex, ThemeInit } from "@once-ui-system/core";
import { Providers } from "@/components/Providers";

import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Amelia",
    template: "%s · Amelia",
  },
  description: "Multipurpose bot for your guild",
  metadataBase: new URL("https://amelia.hitomihiumi.xyz"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "Amelia",
    title: "Amelia",
    description: "Multipurpose bot for your guild",
    images: [
      {
        url: "/images/og/home.png",
        width: 1200,
        height: 630,
        alt: "Amelia — Discord bot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amelia",
    description: "Multipurpose bot for your guild",
    images: ["/images/og/home.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <Flex
      suppressHydrationWarning
      as="html"
      lang="en"
      fillWidth
      className={classNames(
        fonts.heading.variable,
        fonts.body.variable,
        fonts.label.variable,
        fonts.code.variable,
      )}
    >
      <head>
        <ThemeInit
          config={{
            theme: style.theme,
            brand: style.brand,
            accent: style.accent,
            neutral: style.neutral,
            solid: style.solid,
            "solid-style": style.solidStyle,
            border: style.border,
            surface: style.surface,
            transition: style.transition,
            scaling: style.scaling,
            "viz-style": dataStyle.variant,
          }}
        />
      </head>
      <Providers session={session}>
        <Column
          as="body"
          background="page"
          fillWidth
          margin="0"
          padding="0"
          style={{ minHeight: "100vh" }}
        >
          {children}
        </Column>
      </Providers>
    </Flex>
  );
}
