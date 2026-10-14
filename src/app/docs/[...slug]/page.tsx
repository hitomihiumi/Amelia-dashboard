import { notFound } from "next/navigation";
import { getPages, getAdjacentPages } from "@/app/utils/utils";
import { formatDate } from "@/app/utils/formatDate";
import { getLocale, getT } from "@/i18n/server";
import {
  Column,
  Heading,
  Icon,
  Row,
  Media,
  Text,
  Card,
  HeadingNav,
  Schema,
  Button,
} from "@once-ui-system/core";
import { baseURL, layout, schema } from "@/resources";
import { CustomMDX } from "@/components/docs/mdx";
import { Metadata } from "next";
import { MIN_INDEXABLE_DOC_LENGTH, ogCardUrl, pageMetadata } from "@/lib/seo/metadata";
import React from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const routeParams = await params;
  const slugPath = routeParams.slug ? routeParams.slug.join("/") : "";

  const locale = await getLocale();
  const docs = getPages(undefined, locale);
  const doc = docs.find((doc) => doc.slug === slugPath);

  if (!doc) return {};

  return pageMetadata({
    title: doc.metadata.title,
    description: doc.metadata.summary || schema.description,
    path: `/docs/${doc.slug}`,
    type: "article",
    publishedTime: doc.metadata.updatedAt || undefined,
    image: doc.metadata.image,
    // Placeholder pages stay reachable but are kept out of search results.
    noindex: doc.content.trim().length < MIN_INDEXABLE_DOC_LENGTH,
  });
}

export default async function Docs({ params }: { params: Promise<{ slug: string[] }> }) {
  const routeParams = await params;
  const slugPath = routeParams.slug.join("/");

  const locale = await getLocale();
  const t = await getT();

  const doc = getPages(undefined, locale).find((doc) => doc.slug === slugPath);

  if (!doc) {
    notFound();
  }

  const { prevPage, nextPage } = getAdjacentPages(slugPath, "section", locale);

  // Determine section title - use "Docs" for top-level elements
  const sectionTitle =
    routeParams.slug.length === 1 && !routeParams.slug[0].includes("/")
      ? t("common.nav.docs")
      : routeParams.slug[0]
          ?.split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

  return (
    <>
      <Row fillWidth horizontal="center">
        <Column as="main" maxWidth={layout.content.width} gap="l" paddingBottom="xl">
          <Schema
            as="techArticle"
            title={doc.metadata.title + " – " + schema.name}
            description={doc.metadata.summary || ""}
            baseURL={baseURL}
            path={`/docs/${doc.slug}`}
            datePublished={doc.metadata.updatedAt}
            dateModified={doc.metadata.updatedAt}
            image={doc.metadata.image || ogCardUrl(doc.metadata.title, doc.metadata.summary)}
            author={{
              name: schema.name,
            }}
          />
          <Column fillWidth gap="8" vertical="center" paddingTop="40">
            <Text variant="label-default-l" onBackground="neutral-medium">
              {sectionTitle}
            </Text>
            <Heading variant="display-strong-s">{doc.metadata.title}</Heading>
            {doc.metadata.updatedAt && (
              <Text variant="body-default-s" onBackground="neutral-weak">
                {t("docs.page.lastUpdate", {
                  date: formatDate(doc.metadata.updatedAt, false, locale),
                })}
              </Text>
            )}
            {doc.metadata.github && (
              <Button
                className="mt-20"
                href={
                  "https://github.com/once-ui-system/core/blob/main/packages/core/src/" +
                  doc.metadata.github
                }
                size="s"
                variant="secondary"
                prefixIcon="github"
                weight="default"
                data-border="rounded"
              >
                {t("docs.page.viewOnGithub")}
              </Button>
            )}
          </Column>
          {doc.metadata.image && (
            <Media
              border="neutral-alpha-medium"
              enlarge
              src={doc.metadata.image}
              alt={t("docs.page.thumbnailAlt", { title: doc.metadata.title })}
              aspectRatio="16 / 9"
              radius="m"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          )}
          <Column as="article" fillWidth>
            <CustomMDX source={doc.content} />
          </Column>

          <Row gap="16" fillWidth horizontal="between" s={{ direction: "column" }}>
            {prevPage ? (
              <Row fillWidth>
                <Row maxWidth={20}>
                  <Card
                    fillWidth
                    border="neutral-alpha-medium"
                    vertical="center"
                    gap="4"
                    href={`/docs/${prevPage.slug}`}
                    radius="l"
                    paddingX="16"
                  >
                    <Icon name="chevronLeft" size="s" onBackground="neutral-weak" />
                    <Column gap="4" vertical="center" paddingX="16" paddingY="12">
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        {prevPage.slug.includes("/")
                          ? `${prevPage.slug
                              .split("/")[0]
                              .split("-")
                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(" ")}`
                          : t("docs.page.label")}
                      </Text>
                      <Text onBackground="neutral-strong" variant="heading-strong-m" wrap="balance">
                        {prevPage.metadata.title}
                      </Text>
                    </Column>
                  </Card>
                </Row>
              </Row>
            ) : (
              <Row />
            )}
            {nextPage ? (
              <Row fillWidth horizontal="end">
                <Row maxWidth={20}>
                  <Card
                    fillWidth
                    border="neutral-alpha-medium"
                    horizontal="end"
                    vertical="center"
                    gap="4"
                    href={`/docs/${nextPage.slug}`}
                    radius="l"
                    paddingX="16"
                  >
                    <Column horizontal="end" gap="4" vertical="center" paddingX="16" paddingY="12">
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        {nextPage.slug.includes("/")
                          ? `${nextPage.slug
                              .split("/")[0]
                              .split("-")
                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(" ")}`
                          : t("docs.page.label")}
                      </Text>
                      <Text onBackground="neutral-strong" variant="heading-strong-m" wrap="balance">
                        {nextPage.metadata.title}
                      </Text>
                    </Column>
                    <Icon name="chevronRight" size="s" onBackground="neutral-weak" />
                  </Card>
                </Row>
              </Row>
            ) : (
              <Row />
            )}
          </Row>
        </Column>
      </Row>
      <Column
        gap="16"
        maxWidth={layout.sideNav.width}
        s={{ hide: true }}
        fillHeight
        paddingLeft="24"
        borderLeft="neutral-alpha-medium"
      >
        <HeadingNav position="sticky" top="80" fitHeight />
      </Column>
    </>
  );
}
