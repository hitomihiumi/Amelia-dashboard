import React from "react";
import { Column, Flex, Grid, Icon, Text } from "@once-ui-system/core";

const FEATURES = [
  {
    icon: "security",
    title: "Moderation",
    text: "Numbered cases, warn escalation, temporary bans and auto moderation for invites and links.",
  },
  {
    icon: "clipboard",
    title: "Reports & appeals",
    text: "Members file reports and appeal punishments through forms you build yourself.",
  },
  {
    icon: "documentattach",
    title: "Audit log",
    text: "Joins, bans, edited messages and voice activity, delivered to a channel through a webhook.",
  },
  {
    icon: "money",
    title: "Economy",
    text: "Currency, shop roles, daily rewards and a balance card members can customize.",
  },
  {
    icon: "ribbon",
    title: "Leveling",
    text: "Experience from chat and voice, role rewards and level-up cards.",
  },
  {
    icon: "gitnet",
    title: "Scenarios",
    text: "Buttons, menus and modals wired together in a visual editor — no code required.",
  },
];

export function Features() {
  return (
    <Column fillWidth gap="16">
      <Column gap="8">
        <Text variant="heading-strong-l">Everything a community needs</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          One bot instead of five, configured from the dashboard.
        </Text>
      </Column>

      <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="16" fillWidth>
        {FEATURES.map((feature) => (
          <Flex
            key={feature.title}
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
            <Text variant="heading-strong-s">{feature.title}</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {feature.text}
            </Text>
          </Flex>
        ))}
      </Grid>
    </Column>
  );
}
