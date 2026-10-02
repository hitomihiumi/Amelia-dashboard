import { Flex, Text, Column, Line, List, ListItem, RevealFx } from "@once-ui-system/core";
import { getFormatters, getT } from "@/i18n/server";

export default async function PrivacyPolicyPage() {
  const t = await getT();
  const format = await getFormatters();

  return (
    <Flex fill center paddingX="l" paddingBottom="l">
      <Column maxWidth="m" gap="24" fillWidth>
        <RevealFx translateY={-0.5}>
          <Column gap="8">
            <Text variant="heading-strong-xl">{t("common.nav.privacy")}</Text>
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
            <Text variant="heading-strong-m">{t("site.legal.privacy.s1.title")}</Text>
            <Text variant="body-default-m" onBackground="neutral-medium">
              {t("site.legal.privacy.s1.intro")}
            </Text>
            <List as={"ul"} textVariant="body-default-m" gap="4">
              <ListItem>
                <strong>{t("site.legal.privacy.s1.items.user.label")}</strong>{" "}
                {t("site.legal.privacy.s1.items.user.text")}
              </ListItem>
              <ListItem>
                <strong>{t("site.legal.privacy.s1.items.guild.label")}</strong>{" "}
                {t("site.legal.privacy.s1.items.guild.text")}
              </ListItem>
              <ListItem>
                <strong>{t("site.legal.privacy.s1.items.activity.label")}</strong>{" "}
                {t("site.legal.privacy.s1.items.activity.text")}
              </ListItem>
              <ListItem>
                <strong>{t("site.legal.privacy.s1.items.content.label")}</strong>{" "}
                {t("site.legal.privacy.s1.items.content.text")}
              </ListItem>
            </List>
          </Column>
        </RevealFx>

        <RevealFx delay={700} translateY={-0.5}>
          <Column gap="16">
            <Text variant="heading-strong-m">{t("site.legal.privacy.s2.title")}</Text>
            <Text variant="body-default-m" onBackground="neutral-medium">
              {t("site.legal.privacy.s2.intro")}
            </Text>
            <List as={"ul"} textVariant="body-default-m" gap="4">
              <ListItem>{t("site.legal.privacy.s2.items.i1")}</ListItem>
              <ListItem>{t("site.legal.privacy.s2.items.i2")}</ListItem>
              <ListItem>{t("site.legal.privacy.s2.items.i3")}</ListItem>
              <ListItem>{t("site.legal.privacy.s2.items.i4")}</ListItem>
            </List>
          </Column>
        </RevealFx>

        <RevealFx delay={1000} translateY={-0.5}>
          <Column gap="16">
            <Text variant="heading-strong-m">{t("site.legal.privacy.s3.title")}</Text>
            <Text variant="body-default-m" onBackground="neutral-medium">
              {t("site.legal.privacy.s3.before")}{" "}
              <strong>{t("site.legal.privacy.s3.emphasis")}</strong>{" "}
              {t("site.legal.privacy.s3.after")}
            </Text>
          </Column>
        </RevealFx>

        <RevealFx delay={1300} translateY={-0.5}>
          <Column gap="16">
            <Text variant="heading-strong-m">{t("site.legal.privacy.s4.title")}</Text>
            <Text variant="body-default-m" onBackground="neutral-medium">
              {t("site.legal.privacy.s4.text")}
            </Text>
          </Column>
        </RevealFx>

        <RevealFx delay={1600} translateY={-0.5}>
          <Column gap="16">
            <Text variant="heading-strong-m">{t("site.legal.privacy.s5.title")}</Text>
            <Text variant="body-default-m" onBackground="neutral-medium">
              {t("site.legal.privacy.s5.text")}
            </Text>
          </Column>
        </RevealFx>
      </Column>
    </Flex>
  );
}
