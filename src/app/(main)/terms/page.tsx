import { Flex, Text, Column, Line, List, ListItem, RevealFx } from "@once-ui-system/core";
import { getFormatters, getT } from "@/i18n/server";

export default async function TermsOfServicePage() {
  const t = await getT();
  const format = await getFormatters();

  return (
    <Flex fill center paddingX="l" paddingBottom="l">
      <Column maxWidth="m" gap="24" fillWidth>
        <RevealFx translateY={-0.5}>
          <Column gap="8">
            <Text variant="heading-strong-xl">{t("common.nav.terms")}</Text>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {t("site.legal.lastUpdated", {
                date: format.date("2026-05-09", { dateStyle: "long", timeZone: "UTC" }),
              })}
            </Text>
          </Column>
        </RevealFx>

        <RevealFx delay={100} translateY={-0.5}>
          <Line />
        </RevealFx>

        <RevealFx delay={400} translateY={-0.5}>
          <Column gap="16">
            <Text variant="heading-strong-m">{t("site.legal.terms.s1.title")}</Text>
            <Text variant="body-default-m" onBackground="neutral-medium">
              {t("site.legal.terms.s1.text")}
            </Text>
          </Column>
        </RevealFx>

        <RevealFx delay={700} translateY={-0.5}>
          <Column gap="16">
            <Text variant="heading-strong-m">{t("site.legal.terms.s2.title")}</Text>
            <Text variant="body-default-m" onBackground="neutral-medium">
              {t("site.legal.terms.s2.text")}
            </Text>
          </Column>
        </RevealFx>

        <RevealFx delay={1000} translateY={-0.5}>
          <Column gap="16">
            <Text variant="heading-strong-m">{t("site.legal.terms.s3.title")}</Text>
            <Text variant="body-default-m" onBackground="neutral-medium">
              {t("site.legal.terms.s3.introBefore")}{" "}
              <strong>{t("site.legal.terms.s3.introEmphasis")}</strong>{" "}
              {t("site.legal.terms.s3.introAfter")}
            </Text>
            <List as={"ul"} textVariant="body-default-m" gap="4">
              <ListItem>{t("site.legal.terms.s3.items.i1")}</ListItem>
              <ListItem>{t("site.legal.terms.s3.items.i2")}</ListItem>
              <ListItem>{t("site.legal.terms.s3.items.i3")}</ListItem>
            </List>
          </Column>
        </RevealFx>

        <RevealFx delay={1300} translateY={-0.5}>
          <Column gap="16">
            <Text variant="heading-strong-m">{t("site.legal.terms.s4.title")}</Text>
            <Text variant="body-default-m" onBackground="neutral-medium">
              {t("site.legal.terms.s4.text")}
            </Text>
          </Column>
        </RevealFx>

        <RevealFx delay={1600} translateY={-0.5}>
          <Column gap="16">
            <Text variant="heading-strong-m">{t("site.legal.terms.s5.title")}</Text>
            <Text variant="body-default-m" onBackground="neutral-medium">
              {t("site.legal.terms.s5.text")}
            </Text>
          </Column>
        </RevealFx>
      </Column>
    </Flex>
  );
}
