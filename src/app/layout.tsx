import "@once-ui-system/core/css/styles.css";
import "@once-ui-system/core/css/tokens.css";
import "@/resources/custom.css";

import classNames from "classnames";

import { fonts, style, dataStyle } from "@/resources/once-ui.config";
import { Column, Flex, Meta, ThemeInit } from "@once-ui-system/core";
import { Providers } from "@/components/Providers";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { baseURL, meta, schema } from "@/resources";
import { Metadata } from "next";

import { Analytics } from "@vercel/analytics/next"

export async function generateMetadata(): Promise<Metadata> {
  const baseMetadata = Meta.generate({
    title: meta.home.title,
    description: meta.home.description,
    baseURL: baseURL,
    path: meta.home.path,
    image: meta.home.image,
  });

  return {
    ...baseMetadata,
    metadataBase: new URL(`${baseURL}`),
    openGraph: {
      ...baseMetadata.openGraph,
      siteName: meta.home.title,
      locale: schema.locale,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

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
        <Analytics/>
      </Providers>
    </Flex>
  );
}
