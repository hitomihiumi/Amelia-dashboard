"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Column, Heading, Text } from "@once-ui-system/core";
import { useT } from "@/i18n/client";
import { isSafeAfterLoginPath } from "@/lib/discord/popup-signin";

function LoginContent() {
  const t = useT();
  const params = useSearchParams();
  const error = params.get("error");
  const callbackUrl = params.get("callbackUrl");
  const next = isSafeAfterLoginPath(callbackUrl) ? callbackUrl : "/dashboard";

  return (
    <Column fill center gap="16" paddingX="s">
      <Heading variant="heading-strong-l">
        {error ? t("common.auth.failedTitle") : t("common.nav.login")}
      </Heading>
      {error && (
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("common.auth.failedText")} ({error})
        </Text>
      )}
      <Button onClick={() => signIn("discord", { callbackUrl: next })}>
        {error ? t("common.auth.retry") : t("common.nav.login")}
      </Button>
    </Column>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
