"use client";

import { Button, Column, Text } from "@once-ui-system/core";
import { signIn } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";

/** Sign in gate for the public submission pages. */
export function SignInPrompt({ description }: { description: string }) {
  const t = useT();
  const pathname = usePathname();

  return (
    <Column
      fillWidth
      gap="16"
      padding="24"
      radius="l"
      border="neutral-medium"
      background="surface"
      horizontal="center"
    >
      <Text variant="body-default-m" onBackground="neutral-medium" align="center">
        {description}
      </Text>
      <Button prefixIcon="discord" onClick={() => signIn("discord", { callbackUrl: pathname })}>
        {t("site.submit.signIn.button")}
      </Button>
    </Column>
  );
}
