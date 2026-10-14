import "@/app/global.css";
import "@once-ui-system/core/css/styles.css";
import "@once-ui-system/core/css/tokens.css";
import "@/resources/custom.css";

import classNames from "classnames";

import { fonts, fontStacks, style, dataStyle } from "@/resources/once-ui.config";
import { Column, Flex, ThemeInit } from "@once-ui-system/core";
import { Providers } from "@/components/Providers";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { baseURL, meta, schema } from "@/resources";
import { Metadata } from "next";
import { ogCardUrl } from "@/lib/seo/metadata";

import { cookies } from "next/headers";
import { CONSENT_COOKIE, parseConsent } from "@/lib/consent";
import { CookieConsentProvider } from "@/components/consent/CookieConsent";
import { ConsentAnalytics } from "@/components/consent/ConsentAnalytics";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { LOCALE_META } from "@/i18n/config";
import { getLocale, loadMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const image = ogCardUrl(meta.home.title.split(" – ")[0], meta.home.description);

  return {
    metadataBase: new URL(baseURL),
    title: meta.home.title,
    description: meta.home.description,
    keywords: meta.home.keywords,
    applicationName: schema.name,
    authors: [schema.author],
    creator: schema.author.name,
    category: "technology",
    openGraph: {
      type: "website",
      siteName: schema.name,
      locale: schema.locale.replace("-", "_"),
      title: meta.home.title,
      description: meta.home.description,
      url: baseURL,
      images: [{ url: image, alt: meta.home.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.home.title,
      description: meta.home.description,
      images: [image],
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
    // Ownership proof for Google Search Console / Yandex Webmaster; both are optional.
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      yandex: process.env.YANDEX_VERIFICATION || undefined,
      other: process.env.BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
        : undefined,
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
  const consent = parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);

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
        <CookieConsentProvider initial={consent}>
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
            <ConsentAnalytics />
            <CookieBanner />
          </Column>
        </CookieConsentProvider>
      </Providers>
    </Flex>
  );
}
