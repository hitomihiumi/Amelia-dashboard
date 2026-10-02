import "@/app/global.css";
import "@once-ui-system/core/css/styles.css";
import "@once-ui-system/core/css/tokens.css";
import "@/resources/custom.css";

import classNames from "classnames";

import { fonts, fontStacks, style, dataStyle } from "@/resources/once-ui.config";
import { Column, Flex, Meta, ThemeInit } from "@once-ui-system/core";
import { Providers } from "@/components/Providers";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { baseURL, meta, schema } from "@/resources";
import { Metadata } from "next";

import { Analytics } from "@vercel/analytics/next";
import { LOCALE_META } from "@/i18n/config";
import { getLocale, loadMessages } from "@/i18n/server";

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
  const locale = await getLocale();

  return (
    <Flex
      suppressHydrationWarning
      as="html"
      lang={LOCALE_META[locale].tag}
      fillWidth
      className={classNames(
        fonts.heading.variable,
        fonts.body.variable,
        fonts.label.variable,
        fonts.code.variable,
        fonts.headingCyrillic.variable,
        fonts.bodyCyrillic.variable,
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
      <Providers session={session} locale={locale} messages={loadMessages(locale)}>
        <Column
          as="body"
          background="page"
          fillWidth
          margin="0"
          padding="0"
          style={
            {
              minHeight: "100vh",
              // Cyrillic companions for the heading and body faces, see once-ui.config.js.
              "--font-heading": fontStacks.heading,
              "--font-body": fontStacks.body,
            } as React.CSSProperties
          }
        >
          {children}
        </Column>
        <Analytics />
      </Providers>
    </Flex>
  );
}
