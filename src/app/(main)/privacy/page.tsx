'use client';

import { Flex, Text, Column, Line, List, ListItem } from "@once-ui-system/core";
import {formatDate} from "@/app/utils/formatDate";

export default function PrivacyPolicyPage() {
    return (
        <Flex fill center paddingX="l">
            <Column maxWidth="m" gap="24" fillWidth>
                <Column gap="8">
                    <Text variant="heading-strong-xl">Privacy Policy</Text>
                    <Text variant="body-default-m" onBackground="neutral-weak">
                        Last updated: {formatDate('2026-05-09')}
                    </Text>
                </Column>

                <Line />

                <Column gap="16">
                    <Text variant="heading-strong-m">1. Information We Collect</Text>
                    <Text variant="body-default-m" onBackground="neutral-medium">
                        When you use Amelia (the "Bot") or our Dashboard, we may collect the following data:
                    </Text>
                    <List as={'ul'} textVariant="body-default-m" gap="4">
                        <ListItem><strong>Discord User Data:</strong> Your User ID, username, global name, and avatar URL.</ListItem>
                        <ListItem><strong>Guild (Server) Data:</strong> Guild IDs, names, roles, and channel structures necessary for configuration.</ListItem>
                        <ListItem><strong>Activity Data:</strong> Economy balances, experience points, level progressions, and bot usage statistics.</ListItem>
                        <ListItem><strong>Content Data:</strong> Message content is only processed temporarily for moderation, or leveling features and is not permanently stored unless specifically required by a feature (e.g., ticket logs or moderation histories).</ListItem>
                    </List>
                </Column>

                <Column gap="16">
                    <Text variant="heading-strong-m">2. How We Use Your Data</Text>
                    <Text variant="body-default-m" onBackground="neutral-medium">
                        The collected data is used exclusively to:
                    </Text>
                    <List as={'ul'} textVariant="body-default-m" gap="4">
                        <ListItem>Provide, operate, and maintain the Bot's features (e.g., economy, leveling, moderation).</ListItem>
                        <ListItem>Improve user experience and personalize interactions within the Bot.</ListItem>
                        <ListItem>Authenticate users on our web Dashboard.</ListItem>
                        <ListItem>Personalize user experience (e.g., custom profiles and rank cards).</ListItem>
                    </List>
                </Column>

                <Column gap="16">
                    <Text variant="heading-strong-m">3. Data Sharing and Third Parties</Text>
                    <Text variant="body-default-m" onBackground="neutral-medium">
                        We <strong>do not</strong> sell, rent, or share your personal data with third parties for marketing purposes. Data may be shared with secure third-party service providers (such as databases) solely for the purpose of operating the Bot's core functions.
                    </Text>
                </Column>

                <Column gap="16">
                    <Text variant="heading-strong-m">4. Data Retention and Deletion</Text>
                    <Text variant="body-default-m" onBackground="neutral-medium">
                        We retain your data for as long as the Bot is present in your Discord server or as long as your account is active. If the Bot is removed from a server, related configuration data may be deleted. You have the right to request the complete deletion of your personal data by contacting the developer team.
                    </Text>
                </Column>

                <Column gap="16">
                    <Text variant="heading-strong-m">5. Contact Us</Text>
                    <Text variant="body-default-m" onBackground="neutral-medium">
                        If you have any questions or concerns about this Privacy Policy, please contact us via our Support Discord Server or reach out to the developer directly.
                    </Text>
                </Column>
            </Column>
        </Flex>
    );
}