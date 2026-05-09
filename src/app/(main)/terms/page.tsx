'use client';

import {Flex, Text, Column, Line, List, ListItem} from "@once-ui-system/core";
import {formatDate} from "@/app/utils/formatDate";

export default function TermsOfServicePage() {
    return (
        <Flex fill center paddingX="l">
            <Column maxWidth="m" gap="24" fillWidth>
                <Column gap="8">
                    <Text variant="heading-strong-xl">Terms of Service</Text>
                    <Text variant="body-default-m" onBackground="neutral-weak">
                        Last updated: {formatDate('2026-05-09')}
                    </Text>
                </Column>

                <Line />

                <Column gap="16">
                    <Text variant="heading-strong-m">1. Acceptance of Terms</Text>
                    <Text variant="body-default-m" onBackground="neutral-medium">
                        By inviting Amelia (the "Bot") to your Discord server or logging into our Dashboard, you agree to comply with and be bound by these Terms of Service. If you do not agree with these terms, you must remove the Bot from your server and cease using the Dashboard.
                    </Text>
                </Column>

                <Column gap="16">
                    <Text variant="heading-strong-m">2. Description of Service</Text>
                    <Text variant="body-default-m" onBackground="neutral-medium">
                        Amelia is a multi-purpose Discord bot providing moderation, economy, leveling, and utility tools. The service is provided "as is" and we reserve the right to modify, suspend, or discontinue any part of the service at any time without notice.
                    </Text>
                </Column>

                <Column gap="16">
                    <Text variant="heading-strong-m">3. User Conduct and Restrictions</Text>
                    <Text variant="body-default-m" onBackground="neutral-medium">
                        When using the Bot or Dashboard, you agree <strong>not</strong> to:
                    </Text>
                    <List as={'ul'} textVariant="body-default-m" gap="4">
                        <ListItem>Use the service to violate Discord's Terms of Service or Community Guidelines.</ListItem>
                        <ListItem>Attempt to exploit, bypass, or abuse any of the Bot's systems (e.g., economy exploits, API rate limit abuse).</ListItem>
                        <ListItem>Use the Bot to generate or distribute malicious, illegal, or highly offensive content.</ListItem>
                    </List>
                </Column>

                <Column gap="16">
                    <Text variant="heading-strong-m">4. Termination of Access</Text>
                    <Text variant="body-default-m" onBackground="neutral-medium">
                        We reserve the right to permanently blacklist users or entire servers from using the Bot and Dashboard at our sole discretion, without prior notice, if we determine that these Terms have been violated.
                    </Text>
                </Column>

                <Column gap="16">
                    <Text variant="heading-strong-m">5. Limitation of Liability</Text>
                    <Text variant="body-default-m" onBackground="neutral-medium">
                        Under no circumstances shall the developers of Amelia be held liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the Bot. We are not responsible for any actions taken by server administrators using our moderation tools.
                    </Text>
                </Column>
            </Column>
        </Flex>
    );
}