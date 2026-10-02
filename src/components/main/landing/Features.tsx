import React from "react";
import { Column, Flex, Grid, Icon, Text } from "@once-ui-system/core";
import type { IconName } from "@/resources/icons";
import type { MessageKey } from "@/i18n/messages";
import { getT } from "@/i18n/server";

const FEATURES: { id: string; icon: IconName; title: MessageKey; text: MessageKey }[] = [
  {
    id: "moderation",
    icon: "security",
    title: "site.landing.features.items.moderation.title",
    text: "site.landing.features.items.moderation.text",
  },
  {
    id: "reports",
    icon: "clipboard",
    title: "site.landing.features.items.reports.title",
    text: "site.landing.features.items.reports.text",
  },
  {
    id: "audit",
    icon: "documentattach",
    title: "site.landing.features.items.audit.title",
    text: "site.landing.features.items.audit.text",
  },
  {
    id: "economy",
    icon: "money",
    title: "site.landing.features.items.economy.title",
    text: "site.landing.features.items.economy.text",
  },
  {
    id: "leveling",
    icon: "ribbon",
    title: "site.landing.features.items.leveling.title",
    text: "site.landing.features.items.leveling.text",
  },
  {
    id: "scenarios",
    icon: "gitnet",
    title: "site.landing.features.items.scenarios.title",
    text: "site.landing.features.items.scenarios.text",
  },
];

export async function Features() {
  const t = await getT();

  return (
    <Column fillWidth gap="16">
      <Column gap="8">
        <Text variant="heading-strong-l">{t("site.landing.features.title")}</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          {t("site.landing.features.subtitle")}
        </Text>
      </Column>

      <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="16" fillWidth>
        {FEATURES.map((feature) => (
          <Flex
            key={feature.id}
            direction="column"
            fillWidth
            fillHeight
            gap="12"
            padding="20"
            radius="l"
            border="neutral-medium"
            background="surface"
          >
            <Icon name={feature.icon} size="m" onBackground="brand-medium" />
            <Text variant="heading-strong-s">{t(feature.title)}</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t(feature.text)}
            </Text>
          </Flex>
        ))}
      </Grid>
    </Column>
  );
}
